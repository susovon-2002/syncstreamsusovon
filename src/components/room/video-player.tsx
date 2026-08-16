'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AddMediaTabs } from './add-media-tabs';
import { Card } from '../ui/card';
import { ScreenReactions } from './screen-reactions';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PenTool, StopCircle, Film, AlertTriangle, Monitor, UploadCloud } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { useFirebase } from '@/firebase';
import { doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  roomId: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const GLOBAL_PLACEHOLDER = PlaceHolderImages.find((img) => img.id === 'video-placeholder') || PlaceHolderImages[0];

// Helper function to extract YouTube Video ID from any YouTube URL format
function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  return null;
}

export function VideoPlayer({ roomId }: VideoPlayerProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [hasMounted, setHasMounted] = useState(false);
  const [localMedia, setLocalMedia] = useState<string | MediaStream | null>(null);
  const [sideShareStream, setSideShareStream] = useState<MediaStream | null>(null);
  const [sideShareSize, setSideShareSize] = useState(34);
  const [focusedScreen, setFocusedScreen] = useState<'main' | 'side'>('main');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#E53935');

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const sideShareVideoRef = useRef<HTMLVideoElement>(null);
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const sidePeerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  // Stable ref so signaling useEffect doesn't re-run when localMedia changes
  const localMediaRef = useRef<string | MediaStream | null>(null);
  const sideShareStreamRef = useRef<MediaStream | null>(null);

  const roomRef = useMemoFirebase(
    () => (firestore && roomId ? doc(firestore, 'rooms', roomId) : null),
    [firestore, roomId]
  );
  const [roomState] = useDocumentData(roomRef);

  const isHost = user && roomState ? roomState.hostId === user.uid : false;

  // Who is currently sharing (any user can share)
  const sharingUid = roomState?.media?.sharingUid as string | undefined;
  const isSharingUser = !!user && !!sharingUid && user.uid === sharingUid;
  const sideSharingUid = roomState?.sideShare?.sharingUid as string | undefined;
  const isSideSharingUser = !!user && !!sideSharingUid && user.uid === sideSharingUid;

  // Admin-controlled permissions
  const allowParticipantScreenShare = roomState?.allowParticipantScreenShare !== false;
  const allowParticipantUpload = roomState?.allowParticipantUpload !== false;
  const canShareScreen = isHost || allowParticipantScreenShare;
  const canUpload = isHost || allowParticipantUpload;

  const isScreenShare = roomState?.media?.source === 'screen' && !!sharingUid;
  const rawUrl = roomState?.media?.url;
  const mediaUrl = rawUrl;

  const youtubeId = extractYouTubeId(typeof mediaUrl === 'string' ? mediaUrl : null);
  const placeholderImage = GLOBAL_PLACEHOLDER.imageUrl;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const startScreenShareFromRoomTool = () => {
      handleStartScreenShare();
    };

    window.addEventListener('syncstream:start-screen-share', startScreenShareFromRoomTool);
    return () => window.removeEventListener('syncstream:start-screen-share', startScreenShareFromRoomTool);
  });

  // Keep ref in sync with state (no extra re-renders)
  useEffect(() => {
    localMediaRef.current = localMedia;
  }, [localMedia]);

  useEffect(() => {
    sideShareStreamRef.current = sideShareStream;
  }, [sideShareStream]);

  // Bind screen share MediaStream to native video element
  useEffect(() => {
    const videoEl = screenVideoRef.current;
    if (isScreenShare && videoEl && localMedia instanceof MediaStream) {
      videoEl.srcObject = localMedia;
      videoEl.play().catch((err) => console.warn('Screen share video play error:', err));
    }
  }, [isScreenShare, localMedia]);

  useEffect(() => {
    const videoEl = sideShareVideoRef.current;
    if (videoEl && sideShareStream) {
      videoEl.srcObject = sideShareStream;
      videoEl.play().catch((err) => console.warn('Side screen share play error:', err));
    }
  }, [sideShareStream]);

  useEffect(() => {
    if (!sideShareStream) {
      setFocusedScreen('main');
    }
  }, [sideShareStream]);

  // WebRTC Screen Share Signaling
  useEffect(() => {
    if (!firestore || !user || !isScreenShare || !roomId) return;

    let activePC: RTCPeerConnection | null = null;
    let unsubSignalDoc: (() => void) | null = null;
    let unsubSignalsColl: (() => void) | null = null;

    const currentMedia = localMediaRef.current;

    if (isSharingUser && currentMedia instanceof MediaStream) {
      // Sharer side: Broadcast screen stream to all viewers
      const signalsRef = collection(firestore, 'rooms', roomId, 'screenSignals');
      
      unsubSignalsColl = onSnapshot(signalsRef, (snapshot) => {
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

                (currentMedia as MediaStream).getTracks().forEach((track) => pc.addTrack(track, currentMedia as MediaStream));

                pc.onicecandidate = (e) => {
                  if (e.candidate) {
                    updateDoc(change.doc.ref, {
                      answerCandidates: arrayUnion(e.candidate.toJSON()),
                    }).catch(() => {
                      setDoc(change.doc.ref, { answerCandidates: [e.candidate!.toJSON()] }, { merge: true });
                    });
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await updateDoc(change.doc.ref, { answer: { type: answer.type, sdp: answer.sdp } });

                // Process any queued candidates now that remote description is set
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
                console.warn('Error setting up host screen share peer connection:', err);
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
                  // Queue candidates if remote desc not set yet
                  if (Array.isArray(data.offerCandidates)) {
                    (pc as any).candidateQueue = [...((pc as any).candidateQueue || []), ...data.offerCandidates];
                  }
                }
              }
            }
          }
        });
      });
    } else if (!isSharingUser) {
      // Viewer side: Connect to whoever is currently sharing
      const pc = new RTCPeerConnection(ICE_SERVERS);
      activePC = pc;
      const remoteStream = new MediaStream();
      let isRemoteDescSet = false;
      const pendingCandidates: any[] = [];

      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (err) {
        console.warn('Failed to add transceivers:', err);
      }

      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        } else if (e.track) {
          remoteStream.addTrack(e.track);
        }
        // Directly assign to video element — do NOT call setLocalMedia here
        // because that would change state → trigger useEffect re-run → destroy connection!
        const videoEl = screenVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = remoteStream;
          videoEl.play().catch(() => {});
        }
      };

      const signalDoc = doc(firestore, 'rooms', roomId, 'screenSignals', user.uid);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          updateDoc(signalDoc, {
            offerCandidates: arrayUnion(e.candidate.toJSON()),
          }).catch(() => {
            setDoc(signalDoc, { offerCandidates: [e.candidate!.toJSON()] }, { merge: true });
          });
        }
      };

      const setupScreenShareReceiver = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp } });

          unsubSignalDoc = onSnapshot(signalDoc, async (d) => {
            const data = d.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                isRemoteDescSet = true;
                // Drain any queued candidates
                for (const c of pendingCandidates) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingCandidates.length = 0;
              } catch (e) {
                console.warn('Failed remote description answer:', e);
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
          console.warn('Error setting up participant screen share:', err);
        }
      };

      setupScreenShareReceiver();
    }

    return () => {
      if (unsubSignalsColl) unsubSignalsColl();
      if (unsubSignalDoc) unsubSignalDoc();
      if (activePC) {
        activePC.close();
        const signalDoc = doc(firestore, 'rooms', roomId, 'screenSignals', user.uid);
        deleteDoc(signalDoc).catch(() => {});
      }
      // Cleanup all sharer connection references
      if (isSharingUser) {
        Object.keys(peerConnections.current).forEach((k) => {
          peerConnections.current[k].close();
        });
        peerConnections.current = {};
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, user, isScreenShare, isSharingUser, roomId]);
  // NOTE: localMedia intentionally excluded — reading via localMediaRef.current to prevent
  // the effect re-running and destroying the peer connection when remote stream arrives.

  useEffect(() => {
    if (!firestore || !user || !roomId || !sideSharingUid) return;

    let activePC: RTCPeerConnection | null = null;
    let unsubSignalDoc: (() => void) | null = null;
    let unsubSignalsColl: (() => void) | null = null;
    const signalDoc = doc(firestore, 'rooms', roomId, 'sideScreenSignals', user.uid);

    if (isSideSharingUser && sideShareStreamRef.current instanceof MediaStream) {
      const signalsRef = collection(firestore, 'rooms', roomId, 'sideScreenSignals');

      unsubSignalsColl = onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          const fromUid = change.doc.id;
          if (fromUid === user.uid || !data?.offer || data.answer) return;

          try {
            if (sidePeerConnections.current[fromUid]) {
              sidePeerConnections.current[fromUid].close();
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            sidePeerConnections.current[fromUid] = pc;
            sideShareStreamRef.current?.getTracks().forEach((track) => {
              pc.addTrack(track, sideShareStreamRef.current as MediaStream);
            });

            pc.onicecandidate = (e) => {
              const candidate = e.candidate;
              if (!candidate) return;
              updateDoc(change.doc.ref, {
                answerCandidates: arrayUnion(candidate.toJSON()),
              }).catch(() => {
                setDoc(change.doc.ref, { answerCandidates: [candidate.toJSON()] }, { merge: true });
              });
            };

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            if (Array.isArray(data.offerCandidates)) {
              data.offerCandidates.forEach((c: any) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(change.doc.ref, { answer: { type: answer.type, sdp: answer.sdp } });
          } catch (err) {
            console.warn('Error setting up side screen share broadcaster:', err);
          }
        });
      });
    } else {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      activePC = pc;
      const remoteStream = new MediaStream();
      let isRemoteDescSet = false;
      const pendingCandidates: any[] = [];

      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (err) {
        console.warn('Failed to add side-share transceivers:', err);
      }

      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          e.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        } else if (e.track) {
          remoteStream.addTrack(e.track);
        }
        setSideShareStream(remoteStream);
      };

      pc.onicecandidate = (e) => {
        const candidate = e.candidate;
        if (!candidate) return;
        updateDoc(signalDoc, {
          offerCandidates: arrayUnion(candidate.toJSON()),
        }).catch(() => {
          setDoc(signalDoc, { offerCandidates: [candidate.toJSON()] }, { merge: true });
        });
      };

      const setupSideShareReceiver = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, {
            offer: { type: offer.type, sdp: offer.sdp },
            sideSharingUid,
          });

          unsubSignalDoc = onSnapshot(signalDoc, async (d) => {
            const data = d.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                isRemoteDescSet = true;
                for (const c of pendingCandidates) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingCandidates.length = 0;
              } catch (err) {
                console.warn('Failed side-share remote description:', err);
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
          console.warn('Error setting up side screen share receiver:', err);
        }
      };

      setupSideShareReceiver();
    }

    return () => {
      if (unsubSignalsColl) unsubSignalsColl();
      if (unsubSignalDoc) unsubSignalDoc();
      if (activePC) {
        activePC.close();
        deleteDoc(signalDoc).catch(() => {});
      }
      if (isSideSharingUser) {
        Object.keys(sidePeerConnections.current).forEach((key) => sidePeerConnections.current[key].close());
        sidePeerConnections.current = {};
      } else {
        setSideShareStream(null);
      }
    };
  }, [firestore, user, roomId, sideSharingUid, isSideSharingUser]);

  const handleSelectMedia = (urlOrStream: string | MediaStream, title: string, source: 'youtube' | 'file' | 'screen') => {
    if (!user || !firestore || !roomRef) return;

    let cleanUrl: string | null = null;
    if (typeof urlOrStream === 'string') {
      cleanUrl = urlOrStream.trim();
      setLocalMedia(null);
    } else if (source === 'screen' && urlOrStream instanceof MediaStream) {
      setLocalMedia(urlOrStream);
      urlOrStream.getVideoTracks()[0].onended = () => {
        handleStopScreenShare();
      };
    }

    setDocumentNonBlocking(
      roomRef,
      {
        media: {
          url: cleanUrl,
          title,
          source,
          sharingUid: source === 'screen' ? user.uid : null,
        },
        playback: {
          isPlaying: true,
          currentTime: 0,
          timestamp: Date.now(),
        },
      },
      { merge: true }
    );

    toast({
      title: 'Media Stream Started 🎬',
      description: `Now playing ${title}`,
    });
  };

  const handleStartScreenShare = async () => {
    if (!user || !firestore || !roomRef) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

      if (isScreenShare && !isSharingUser) {
        setSideShareStream(stream);
        stream.getVideoTracks()[0].onended = () => {
          handleStopSideShare();
        };
        setDocumentNonBlocking(
          roomRef,
          {
            sideShare: {
              sharingUid: user.uid,
              title: `${user.displayName || 'User'}'s Screen`,
              startedAt: Date.now(),
            },
          },
          { merge: true }
        );
        toast({
          title: 'Side-by-Side Screen Share',
          description: 'Your screen is visible beside the current shared screen.',
        });
        return;
      }

      handleSelectMedia(stream, `${user.displayName || 'User'}\'s Screen`, 'screen');
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  const handleStopSideShare = () => {
    sideShareStream?.getTracks().forEach((track) => track.stop());
    setSideShareStream(null);
    if (roomRef && (isSideSharingUser || isHost)) {
      setDocumentNonBlocking(roomRef, { sideShare: null }, { merge: true });
    }
  };

  const handleToggleParticipantScreenShare = () => {
    if (!isHost || !roomRef) return;
    setDocumentNonBlocking(roomRef, { allowParticipantScreenShare: !allowParticipantScreenShare }, { merge: true });
  };

  const handleToggleParticipantUpload = () => {
    if (!isHost || !roomRef) return;
    setDocumentNonBlocking(roomRef, { allowParticipantUpload: !allowParticipantUpload }, { merge: true });
  };

  const handleStopScreenShare = () => {
    if (localMedia instanceof MediaStream) {
      localMedia.getTracks().forEach((t) => t.stop());
    }
    handleStopSideShare();
    setLocalMedia(null);

    if (roomRef) {
      setDocumentNonBlocking(
        roomRef,
        {
          media: { url: null, title: null, source: null, sharingUid: null },
          playback: { isPlaying: false, currentTime: 0, timestamp: Date.now() },
        },
        { merge: true }
      );
    }

    toast({
      title: 'Screen Sharing Stopped',
      description: 'You are no longer sharing your screen.',
    });
  };

  const handleFullscreenToggle = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!hasMounted) {
    return (
      <Card className="h-full w-full min-h-[420px] bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-xl border border-white/15">
        <div className="text-center text-slate-400 animate-pulse font-medium text-sm">
          Initializing SyncStream Player...
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={playerContainerRef}
      className="h-full w-full min-h-[440px] bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl rounded-xl border border-white/15"
    >
      {/* ── Admin Permission Controls: always visible to host as a floating bottom bar ── */}
      {isHost && (
        <div className="absolute left-3 top-3 z-40 flex max-w-[calc(100%-1.5rem)] gap-2 rounded-full border border-white/10 bg-slate-950/75 p-1.5 shadow-xl backdrop-blur-md pointer-events-auto">
          <button
            onClick={handleToggleParticipantScreenShare}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-all ${
              allowParticipantScreenShare
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-red-500/20 border-red-400/40 text-red-300'
            }`}
          >
            <Monitor className="h-3 w-3" />
            {allowParticipantScreenShare ? 'Share: All' : 'Share: Blocked'}
          </button>
          <button
            onClick={handleToggleParticipantUpload}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-all ${
              allowParticipantUpload
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-red-500/20 border-red-400/40 text-red-300'
            }`}
          >
            <UploadCloud className="h-3 w-3" />
            {allowParticipantUpload ? 'Upload: All' : 'Upload: Blocked'}
          </button>
        </div>
      )}

      {/* ── Main content: hide AddMediaTabs immediately when sharing starts locally ── */}
      {!mediaUrl && !isScreenShare && !(localMedia instanceof MediaStream) ? (
        <div className="w-full max-w-lg p-4 z-10">
          {isHost ? (
            <AddMediaTabs onUrlSelect={handleSelectMedia} canUpload={canUpload} />
          ) : canShareScreen ? (
            <div className="text-center p-8 bg-slate-900/60 rounded-2xl border border-white/10 backdrop-blur-xl space-y-4">
              <Film className="h-10 w-10 text-[#FF9933] mx-auto mb-2 animate-bounce" />
              <p className="text-base font-bold text-white">No stream active</p>
              <p className="text-xs text-slate-400 mb-3">Start sharing your screen with everyone in the room</p>
              <button
                onClick={handleStartScreenShare}
                className="flex items-center gap-2 mx-auto bg-gradient-to-r from-[#ff9933] to-[#138808] text-slate-950 font-extrabold px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all text-sm"
              >
                <Monitor className="h-4 w-4" /> Share My Screen
              </button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground animate-pulse p-8 bg-slate-900/60 rounded-2xl border border-white/10 backdrop-blur-xl">
              <Film className="h-10 w-10 text-[#FF9933] mx-auto mb-2 animate-bounce" />
              <p className="text-base font-bold text-white mb-1">Waiting for Host Stream 🎬</p>
              <p className="text-xs text-slate-400">The room host hasn't started a stream yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full min-h-[420px] bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* ── 1. Native HTML5 Video for WebRTC Screen Sharing ── */}
          {isScreenShare ? (
            <div className="relative w-full h-full min-h-[420px] bg-slate-950 flex items-center justify-center">
              <div className="flex h-full min-h-[420px] w-full gap-2 p-2">
                <div
                  className="relative min-w-0 cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-black transition-all hover:border-[#ff9933]/50"
                  style={{ flexBasis: sideShareStream ? (focusedScreen === 'main' ? `${100 - sideShareSize}%` : `${sideShareSize}%`) : '100%' }}
                  onClick={() => setFocusedScreen('main')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setFocusedScreen('main');
                  }}
                  aria-label="Show main screen larger"
                >
                  <video
                    ref={screenVideoRef}
                    className="h-full min-h-[404px] w-full object-contain bg-slate-950"
                    autoPlay
                    playsInline
                    muted={isSharingUser}
                    onLoadedMetadata={() => {
                      screenVideoRef.current?.play().catch(console.warn);
                    }}
                  />
                  <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5">
                    <Monitor className="h-3 w-3 text-[#ff9933]" />
                    {isSharingUser ? 'You are sharing' : `${roomState?.media?.title || 'Admin screen'}`}
                  </div>
                  {sideShareStream && focusedScreen !== 'main' && (
                    <div className="absolute bottom-3 right-3 rounded-full bg-[#ff9933]/90 px-2.5 py-1 text-[11px] font-extrabold text-slate-950">
                      Click to enlarge
                    </div>
                  )}
                </div>

                {sideShareStream && (
                  <div
                    className="relative min-w-[220px] cursor-pointer overflow-hidden rounded-lg border-2 border-[#ff9933]/50 bg-black shadow-2xl transition-all hover:border-[#ffcc80]"
                    style={{ flexBasis: focusedScreen === 'side' ? `${100 - sideShareSize}%` : `${sideShareSize}%` }}
                    onClick={() => setFocusedScreen('side')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setFocusedScreen('side');
                    }}
                    aria-label="Show side screen larger"
                  >
                    <video
                      ref={sideShareVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full min-h-[404px] w-full object-contain bg-black"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {isSideSharingUser ? 'Your screen' : `${roomState?.sideShare?.title || 'User screen'}`}
                    </div>
                    {focusedScreen !== 'side' && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-[#ff9933]/90 px-2.5 py-1 text-[11px] font-extrabold text-slate-950">
                        Click to enlarge
                      </div>
                    )}
                    <div className="absolute right-3 top-3 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 bg-black/70 text-white hover:bg-black"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSideShareSize((value) => Math.max(25, value - 5));
                        }}
                        aria-label="Decrease side screen size"
                      >
                        -
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 bg-black/70 text-white hover:bg-black"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSideShareSize((value) => Math.min(55, value + 5));
                        }}
                        aria-label="Increase side screen size"
                      >
                        +
                      </Button>
                      {(isSideSharingUser || isHost) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStopSideShare();
                          }}
                          className="h-7 px-2 text-xs font-bold"
                        >
                          {isSideSharingUser ? 'Stop' : 'Force Stop'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sharer controls (any user who is sharing) */}
              {isSharingUser && (
                <div className="absolute top-4 right-4 z-30">
                  <Button size="sm" variant="destructive" onClick={handleStopScreenShare} className="font-bold gap-1.5 shadow-lg">
                    <StopCircle className="h-4 w-4" /> Stop Sharing
                  </Button>
                </div>
              )}

              {/* Admin force-stop button when someone else is sharing */}
              {isHost && !isSharingUser && (
                <div className="absolute top-4 right-4 z-30">
                  <Button size="sm" variant="destructive" onClick={handleStopScreenShare} className="font-bold gap-1.5 shadow-lg opacity-80">
                    <StopCircle className="h-4 w-4" /> Force Stop
                  </Button>
                </div>
              )}

              {/* Viewer screen-share option while another user is sharing */}
              {!isSharingUser && canShareScreen && !sideShareStream && (
                <div className="absolute top-4 left-4 z-30">
                  <Button
                    size="sm"
                    onClick={handleStartScreenShare}
                    className="gap-1.5 bg-gradient-to-r from-[#ff9933] to-[#138808] font-bold text-slate-950 shadow-lg hover:scale-105"
                  >
                    <Monitor className="h-4 w-4" /> Share My Screen
                  </Button>
                </div>
              )}

            </div>
          ) : youtubeId ? (
            /* ── 2. Official YouTube Embed Engine (Guaranteed 100% Playback for any YouTube Link) ── */
            <div className="relative w-full h-full min-h-[420px] bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
                title={roomState?.media?.title || 'YouTube Stream'}
                className="w-full h-full min-h-[420px] absolute inset-0 border-0 shadow-2xl rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : typeof mediaUrl === 'string' && mediaUrl.length > 0 ? (
            /* ── 3. Direct HTML5 Video Player Engine (For MP4, WebM, Local File Blobs) ── */
            <div className="relative w-full h-full min-h-[420px] flex items-center justify-center bg-black">
              <video
                ref={html5VideoRef}
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full min-h-[420px] object-contain bg-black"
              />
            </div>
          ) : (
            <div className="text-center p-6 text-slate-400">
              <AlertTriangle className="h-8 w-8 text-[#FF9933] mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Invalid Media URL</p>
              <p className="text-xs text-slate-400 mt-1">Please enter a valid YouTube or direct video link.</p>
            </div>
          )}

          {/* ── 4. Drawing Canvas Overlay ── */}
          {isDrawingMode && (
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20 pointer-events-auto"
              onMouseDown={(e) => {
                const context = canvasRef.current?.getContext('2d');
                if (!context) return;
                context.strokeStyle = drawingColor;
                context.lineWidth = 5;
                context.lineCap = 'round';
                context.beginPath();
                context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
              }}
              onMouseUp={() => {
                setIsDrawing(false);
                canvasRef.current?.getContext('2d')?.closePath();
              }}
              onMouseMove={(e) => {
                if (!isDrawing) return;
                const context = canvasRef.current?.getContext('2d');
                if (!context) return;
                context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                context.stroke();
              }}
            />
          )}
        </div>
      )}

      {/* ── 5. Floating Screen Reactions & Reaction Bar ── */}
      <ScreenReactions roomId={roomId} />
    </Card>
  );
}
