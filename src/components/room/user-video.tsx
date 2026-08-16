'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Camera, Mic, MicOff, Video, VideoOff, RefreshCw, GripVertical, Maximize2, Minimize2, Move, MoveDiagonal } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useFirebase, useDoc } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface UserVideoProps {
  user: any; // roomUser object
  isLocalUser: boolean;
  roomId?: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function UserVideo({ user: roomUser, isLocalUser: propsIsLocalUser, roomId: propRoomId }: UserVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { firestore, user: currentUser } = useFirebase();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});

  const targetUid = roomUser?.uid || roomUser?.id;
  const isLocalUser = propsIsLocalUser || (currentUser ? targetUid === currentUser.uid : false);
  const effectiveRoomId = propRoomId || roomUser?.roomId;
  const displayName = roomUser?.displayName || 'User';

  const roomRef = useMemoFirebase(
    () => (firestore && effectiveRoomId ? doc(firestore, 'rooms', effectiveRoomId) : null),
    [firestore, effectiveRoomId]
  );
  const { data: roomState } = useDoc(roomRef);

  const isCameraBlocked = !!roomUser?.cameraBlocked || (!isLocalUser ? false : !!roomState?.allCamerasBlocked);
  const isMicBlocked = !!roomUser?.micBlocked || (!isLocalUser ? false : !!roomState?.allMicsBlocked);

  const requestMedia = async () => {
    setIsRequesting(true);
    try {
      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
      } catch (err1) {
        console.warn('Basic getUserMedia fallback:', err1);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err2) {
          console.warn('Audio-only getUserMedia fallback:', err2);
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraBlocked;
      });
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicBlocked;
      });

      setStream(mediaStream);
      setHasCameraPermission(true);
      const hasVideo = mediaStream.getVideoTracks().length > 0 && !isCameraBlocked;
      setIsCameraOn(hasVideo);
      setIsMicOn(mediaStream.getAudioTracks().length > 0 && !isMicBlocked);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.warn);
      }

      if (firestore && currentUser && effectiveRoomId) {
        const userRef = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid);
        setDocumentNonBlocking(userRef, { isCameraOn: hasVideo, isMicOn: !isMicBlocked }, { merge: true });
      }
    } catch (error: any) {
      console.error('Error accessing camera/microphone:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Needed',
        description: 'Please allow camera permissions in your browser URL address bar.',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  // 1. Handle Local Media Capture
  useEffect(() => {
    if (!isLocalUser) return;

    requestMedia();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [isLocalUser]);

  useEffect(() => {
    const handleStopAllMedia = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };
    window.addEventListener('syncstream:stop-local-media', handleStopAllMedia);
    return () => window.removeEventListener('syncstream:stop-local-media', handleStopAllMedia);
  }, []);

  // Stream binding to video element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => {
        console.warn('Auto-play handling on video element:', err);
      });
    }
  }, [stream, isCameraOn]);

  useEffect(() => {
    if (!isLocalUser || !stream || !firestore || !currentUser || !effectiveRoomId) return;

    const nextCameraOn = !isCameraBlocked && stream.getVideoTracks().length > 0;
    const nextMicOn = !isMicBlocked && stream.getAudioTracks().length > 0;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextCameraOn;
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextMicOn;
    });

    setIsCameraOn(nextCameraOn);
    setIsMicOn(nextMicOn);

    const userRef = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid);
    setDocumentNonBlocking(userRef, { isCameraOn: nextCameraOn, isMicOn: nextMicOn }, { merge: true });
  }, [isCameraBlocked, isMicBlocked, isLocalUser, stream, firestore, currentUser, effectiveRoomId]);

  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // 2. WebRTC Signaling Logic (Bulletproof 2-way webcam video stream negotiation)
  useEffect(() => {
    if (!firestore || !currentUser || !effectiveRoomId || !targetUid) return;

    if (isLocalUser) {
      // Broadcaster (Local User): Listen for incoming connection offers from remote peers
      const signalsRef = collection(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid, 'signals');
      const unsubscribe = onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          const fromUid = change.doc.id;

          if (change.type === 'added' || change.type === 'modified') {
            if (data?.offer && !data.answer) {
              try {
                if (peerConnections.current[fromUid]) {
                  peerConnections.current[fromUid].close();
                }

                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnections.current[fromUid] = pc;
                (pc as any).candidateQueue = [];

                // Attach local tracks if available
                const currentStream = streamRef.current;
                if (currentStream) {
                  currentStream.getTracks().forEach((track) => pc.addTrack(track, currentStream));
                }

                pc.onicecandidate = (event) => {
                  if (event.candidate) {
                    updateDoc(change.doc.ref, {
                      answerCandidates: arrayUnion(event.candidate.toJSON()),
                    }).catch(() => {
                      setDoc(change.doc.ref, { answerCandidates: [event.candidate!.toJSON()] }, { merge: true });
                    });
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await updateDoc(change.doc.ref, { answer: { type: answer.type, sdp: answer.sdp } });

                // Process queued offer candidates
                const q = (pc as any).candidateQueue || [];
                for (const c of q) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                (pc as any).candidateQueue = [];

                if (Array.isArray(data.offerCandidates)) {
                  data.offerCandidates.forEach((c: any) => {
                    pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                  });
                }
              } catch (err) {
                console.warn('Error establishing remote peer answer:', err);
              }
            } else if (data?.offer && data.answer) {
              const pc = peerConnections.current[fromUid];
              if (pc) {
                if (pc.remoteDescription) {
                  if (Array.isArray(data.offerCandidates)) {
                    data.offerCandidates.forEach((c: any) => {
                      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                    });
                  }
                } else {
                  if (Array.isArray(data.offerCandidates)) {
                    (pc as any).candidateQueue = [...((pc as any).candidateQueue || []), ...data.offerCandidates];
                  }
                }
              }
            }
          }
        });
      });
      return () => unsubscribe();
    } else {
      // Receiver (Remote User Card): Initiate WebRTC connection to remote participant
      if (!roomUser?.isCameraOn) return;

      let activePC: RTCPeerConnection | null = null;
      let unsubSignalDoc: (() => void) | null = null;
      let isRemoteDescSet = false;
      const pendingCandidates: any[] = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      activePC = pc;
      peerConnections.current[targetUid] = pc;
      const remoteStream = new MediaStream();

      // Declare transceivers & add local tracks if available for 2-way call
      try {
        const currentStream = streamRef.current;
        if (currentStream && currentStream.getTracks().length > 0) {
          currentStream.getTracks().forEach((t) => pc.addTrack(t, currentStream));
        } else {
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });
        }
      } catch (err) {
        console.warn('Failed to setup transceivers or tracks:', err);
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        } else if (event.track) {
          remoteStream.addTrack(event.track);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play().catch(console.warn);
        }
      };

      const signalDoc = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', targetUid, 'signals', currentUser.uid);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          updateDoc(signalDoc, {
            offerCandidates: arrayUnion(event.candidate.toJSON()),
          }).catch(() => {
            setDoc(signalDoc, { offerCandidates: [event.candidate!.toJSON()] }, { merge: true });
          });
        }
      };

      const setupWebRTCConnection = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp }, joinedAt: serverTimestamp() });

          unsubSignalDoc = onSnapshot(signalDoc, async (docSnap) => {
            const data = docSnap.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                isRemoteDescSet = true;
                for (const c of pendingCandidates) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingCandidates.length = 0;
              } catch (e) {
                console.warn('Failed to set remote description answer:', e);
              }
            }
            if (Array.isArray(data?.answerCandidates)) {
              data.answerCandidates.forEach((c: any) => {
                if (isRemoteDescSet) {
                  pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                } else {
                  pendingCandidates.push(c);
                }
              });
            }
          });
        } catch (err) {
          console.warn('Error in WebRTC receiver setup:', err);
        }
      };

      setupWebRTCConnection();

      return () => {
        if (unsubSignalDoc) unsubSignalDoc();
        if (activePC) {
          activePC.close();
        }
        deleteDoc(signalDoc).catch(() => {});
        if (peerConnections.current[targetUid]) {
          delete peerConnections.current[targetUid];
        }
      };
    }
  }, [firestore, currentUser, roomUser?.isCameraOn, effectiveRoomId, targetUid, isLocalUser]);

  const toggleMic = () => {
    if (isMicBlocked) {
      toast({
        variant: 'destructive',
        title: 'Microphone blocked',
        description: 'The host has disabled your microphone for this room.',
      });
      return;
    }
    if (stream) {
      const newState = !isMicOn;
      stream.getAudioTracks().forEach((t) => (t.enabled = newState));
      setIsMicOn(newState);
      if (firestore && currentUser && effectiveRoomId) {
        const userRef = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid);
        setDocumentNonBlocking(userRef, { isMicOn: newState }, { merge: true });
      }
    }
  };

  const toggleCamera = () => {
    if (isCameraBlocked) {
      toast({
        variant: 'destructive',
        title: 'Camera blocked',
        description: 'The host has disabled your camera for this room.',
      });
      return;
    }
    if (!stream) {
      requestMedia();
      return;
    }

    const newState = !isCameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = newState));
    setIsCameraOn(newState);
    if (firestore && currentUser && effectiveRoomId) {
      const userRef = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid);
      setDocumentNonBlocking(userRef, { isCameraOn: newState }, { merge: true });
    }
  };

  // ── Drag & Resize State ──────────────────────────────────────────────────
  const [isFloating, setIsFloating] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 20, y: 80 });
  const [cardScale, setCardScale] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [customSize, setCustomSize] = useState<{ w: number; h: number } | null>(null);

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ w: number; h: number; x: number; y: number }>({ w: 320, h: 180, x: 0, y: 0 });

  // Size preset lookup
  const SIZE_PRESETS = {
    sm: { w: 220, h: 130 },
    md: { w: 320, h: 185 },
    lg: { w: 460, h: 260 },
    xl: { w: 620, h: 350 },
  };

  const currentW = customSize?.w || SIZE_PRESETS[cardScale].w;
  const currentH = customSize?.h || SIZE_PRESETS[cardScale].h;

  const handleStartDrag = (clientX: number, clientY: number) => {
    if (!isFloating) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: clientX - pos.x,
      y: clientY - pos.y,
    };
  };

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isResizingRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    resizeStartRef.current = {
      w: currentW,
      h: currentH,
      x: clientX,
      y: clientY,
    };
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDraggingRef.current) {
        const newX = Math.max(10, Math.min(window.innerWidth - currentW - 10, clientX - dragStartRef.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - currentH - 10, clientY - dragStartRef.current.y));
        setPos({ x: newX, y: newY });
      } else if (isResizingRef.current) {
        const deltaX = clientX - resizeStartRef.current.x;
        const deltaY = clientY - resizeStartRef.current.y;
        const newW = Math.max(180, Math.min(800, resizeStartRef.current.w + deltaX));
        const newH = Math.max(110, Math.min(500, resizeStartRef.current.h + deltaY));
        setCustomSize({ w: newW, h: newH });
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [currentW, currentH]);

  const cycleScale = () => {
    setCustomSize(null);
    if (cardScale === 'sm') setCardScale('md');
    else if (cardScale === 'md') setCardScale('lg');
    else if (cardScale === 'lg') setCardScale('xl');
    else setCardScale('sm');
  };

  const mainCardStyle = isFloating
    ? {
        position: 'fixed' as const,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${currentW}px`,
        height: `${currentH}px`,
        zIndex: 90,
      }
    : {};

  return (
    <Card
      style={mainCardStyle}
      className={`relative overflow-hidden rounded-xl border border-white/20 bg-slate-950 shadow-2xl backdrop-blur-xl transition-shadow ${
        isFloating
          ? 'cursor-grab active:cursor-grabbing border-[#ff9933]/50 ring-2 ring-[#ff9933]/20 shadow-[0_15px_40px_rgba(0,0,0,0.9)]'
          : 'h-full w-full'
      }`}
    >
      {/* Top Header Controls (Drag Bar & Float Toggle) */}
      <div
        className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-slate-950/90 to-transparent z-30 flex items-center justify-between px-2.5 select-none"
        onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        {/* Name & Hand Badge */}
        <div className="flex items-center gap-1.5 truncate">
          {isFloating && <GripVertical className="h-3.5 w-3.5 text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0" />}
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isCameraOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-[11px] font-bold text-white truncate max-w-[110px]">{displayName} {isLocalUser ? '(You)' : ''}</span>
          {roomUser?.isHandRaised && (
            <span className="bg-[#FF9933] text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
              ✋
            </span>
          )}
        </div>

        {/* Float & Resize Controls */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Size Cycle Button */}
          {isFloating && (
            <button
              onClick={cycleScale}
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 uppercase tracking-wider"
              title="Change Box Size (Small/Medium/Large/XL)"
            >
              {cardScale}
            </button>
          )}

          {/* Toggle Float vs Docked mode */}
          <button
            onClick={() => setIsFloating((f) => !f)}
            className={`h-6 px-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
              isFloating
                ? 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/50'
                : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
            }`}
            title={isFloating ? 'Dock to Sidebar' : 'Float Anywhere'}
          >
            <Move className="h-3 w-3" />
            <span className="hidden sm:inline">{isFloating ? 'Floating' : 'Float'}</span>
          </button>
        </div>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        className={`h-full w-full object-cover bg-slate-950 ${isLocalUser ? '-scale-x-100' : ''} ${
          !isCameraOn ? 'hidden' : 'block'
        }`}
        autoPlay
        playsInline
        muted={isLocalUser}
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(console.warn);
        }}
      />

      {/* Camera Off Avatar View */}
      {(!isCameraOn || hasCameraPermission === false) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#061126] to-slate-950 p-4 text-center">
          <Avatar className="h-16 w-16 border-2 border-[#FF9933]/50 shadow-lg mb-2">
            <AvatarImage src={roomUser?.photoURL || ''} />
            <AvatarFallback className="bg-[#FF9933]/20 text-[#FF9933] font-bold text-xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs font-bold text-white mb-0.5">{displayName} {isLocalUser ? '(You)' : ''}</p>
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            <VideoOff className="h-3 w-3 text-slate-400" /> Camera Off
          </span>
        </div>
      )}

      {/* Permission Request Dialog */}
      {hasCameraPermission === false && isLocalUser && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-3 text-center z-20 backdrop-blur-md">
          <Alert className="max-w-[90%] border-[#FF9933]/40 bg-[#061126]/95 text-white p-3">
            <Camera className="h-4 w-4 text-[#FF9933]" />
            <AlertTitle className="text-white font-bold text-sm">Enable Camera</AlertTitle>
            <AlertDescription className="space-y-2 mt-1">
              <span className="block text-slate-300 text-[11px]">
                Please allow camera permissions in your browser URL bar.
              </span>
              <Button
                type="button"
                size="sm"
                onClick={requestMedia}
                disabled={isRequesting}
                className="h-7 text-xs bg-gradient-to-r from-[#FF9933] via-white to-[#138808] text-slate-950 font-extrabold"
              >
                {isRequesting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                Turn On
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Controls Overlay (Mic & Camera Toggle) */}
      <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 z-30">
        {isLocalUser && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className={`h-7 w-7 rounded-full border border-white/20 transition-all ${
                isMicOn ? 'bg-slate-800/90 text-white hover:bg-slate-700' : 'bg-red-600/90 text-white hover:bg-red-700'
              }`}
              onClick={toggleMic}
              disabled={isMicBlocked}
              title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`h-7 w-7 rounded-full border border-white/20 transition-all ${
                isCameraOn ? 'bg-[#138808]/90 text-white hover:bg-[#0f6e06]' : 'bg-red-600/90 text-white hover:bg-red-700'
              }`}
              onClick={toggleCamera}
              disabled={isCameraBlocked}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
      </div>

      {/* Interactive Corner Resize Handle (when floating) */}
      {isFloating && (
        <div
          onMouseDown={handleStartResize}
          onTouchStart={handleStartResize}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-center justify-center z-40 text-slate-400 hover:text-white group/resize"
          title="Drag corner to resize video box"
        >
          <MoveDiagonal className="h-3 w-3 text-slate-400 group-hover/resize:text-[#ff9933] transition-colors" />
        </div>
      )}
    </Card>
  );
}
