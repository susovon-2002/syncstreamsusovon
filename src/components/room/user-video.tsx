'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Camera, Mic, MicOff, Video, VideoOff, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useFirebase } from '@/firebase';
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
        track.enabled = true;
      });

      setStream(mediaStream);
      setHasCameraPermission(true);
      const hasVideo = mediaStream.getVideoTracks().length > 0;
      setIsCameraOn(hasVideo);
      setIsMicOn(mediaStream.getAudioTracks().length > 0);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.warn);
      }

      if (firestore && currentUser && effectiveRoomId) {
        const userRef = doc(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid);
        setDocumentNonBlocking(userRef, { isCameraOn: true }, { merge: true });
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

  // 2. WebRTC Signaling Logic (Safeguarded against invalid SDP / ICE candidates)
  useEffect(() => {
    if (!firestore || !currentUser || !effectiveRoomId || !targetUid) return;

    if (isLocalUser) {
      // Broadcaster: Listen for incoming connection offers from remote peers
      const signalsRef = collection(firestore, 'rooms', effectiveRoomId, 'roomUsers', currentUser.uid, 'signals');
      const unsubscribe = onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const fromUid = change.doc.id;

            if (data?.offer && data.offer.sdp && typeof data.offer.sdp === 'string' && !data.answer) {
              try {
                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnections.current[fromUid] = pc;

                if (stream) {
                  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                }

                pc.onicecandidate = (event) => {
                  if (event.candidate && event.candidate.candidate) {
                    updateDoc(change.doc.ref, {
                      answerCandidates: arrayUnion(event.candidate.toJSON()),
                    }).catch(console.warn);
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                updateDoc(change.doc.ref, { answer: { type: answer.type, sdp: answer.sdp } }).catch(console.warn);
              } catch (err) {
                console.warn('Error establishing remote peer answer:', err);
              }
            }
          }
        });
      });
      return () => unsubscribe();
    } else {
      // Receiver: Initiate WebRTC connection to remote participant
      if (!roomUser?.isCameraOn) return;

      const initPC = async () => {
        try {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          peerConnections.current[targetUid] = pc;

          const remoteStream = new MediaStream();
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
            const candidate = event.candidate;
            if (candidate && candidate.candidate) {
              updateDoc(signalDoc, {
                offerCandidates: arrayUnion(candidate.toJSON()),
              }).catch(() => {
                setDoc(signalDoc, { offerCandidates: [candidate.toJSON()] }, { merge: true });
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp }, joinedAt: serverTimestamp() });

          const unsubscribe = onSnapshot(signalDoc, (docSnap) => {
            const data = docSnap.data();
            if (data?.answer && data.answer.sdp && typeof data.answer.sdp === 'string' && !pc.currentRemoteDescription) {
              try {
                pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.warn);
              } catch (e) {
                console.warn('Failed to set remote description answer:', e);
              }
            }
            if (Array.isArray(data?.answerCandidates)) {
              data.answerCandidates.forEach((c: any) => {
                if (c && (c.candidate || c.sdpMid !== undefined)) {
                  try {
                    pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
                  } catch (e) {
                    console.warn('Failed adding ICE candidate:', e);
                  }
                }
              });
            }
          });

          return () => {
            unsubscribe();
            deleteDoc(signalDoc).catch(console.warn);
          };
        } catch (err) {
          console.warn('Error in WebRTC receiver initPC:', err);
        }
      };

      const cleanup = initPC();
      return () => {
        cleanup.then((c) => c && c());
        if (peerConnections.current[targetUid]) {
          peerConnections.current[targetUid].close();
          delete peerConnections.current[targetUid];
        }
      };
    }
  }, [firestore, currentUser, roomUser?.isCameraOn, stream, effectiveRoomId, targetUid, isLocalUser]);

  const toggleMic = () => {
    if (stream) {
      const newState = !isMicOn;
      stream.getAudioTracks().forEach((t) => (t.enabled = newState));
      setIsMicOn(newState);
    }
  };

  const toggleCamera = () => {
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

  return (
    <Card className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-2xl backdrop-blur-xl">
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
          <Avatar className="h-20 w-20 border-2 border-[#FF9933]/50 shadow-lg mb-3">
            <AvatarImage src={roomUser?.photoURL || ''} />
            <AvatarFallback className="bg-[#FF9933]/20 text-[#FF9933] font-bold text-2xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-bold text-white mb-1">{displayName} {isLocalUser ? '(You)' : ''}</p>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            <VideoOff className="h-3.5 w-3.5 text-slate-400" /> Camera Off
          </span>
        </div>
      )}

      {/* Permission Request Dialog */}
      {hasCameraPermission === false && isLocalUser && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 text-center z-20 backdrop-blur-md">
          <Alert className="max-w-[85%] border-[#FF9933]/40 bg-[#061126]/95 text-white">
            <Camera className="h-5 w-5 text-[#FF9933]" />
            <AlertTitle className="text-white font-bold text-base">Enable Camera Permission</AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <span className="block text-slate-300 text-xs">
                Your browser requires camera permission to start video. Please click "Allow" near your browser URL bar.
              </span>
              <Button
                type="button"
                size="sm"
                onClick={requestMedia}
                disabled={isRequesting}
                className="bg-gradient-to-r from-[#FF9933] via-white to-[#138808] text-slate-950 font-extrabold hover:scale-105 transition-transform"
              >
                {isRequesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Turn On Camera
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-3 right-3 flex gap-2 z-30">
        {isLocalUser && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className={`h-9 w-9 rounded-full border border-white/20 transition-all ${
                isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              onClick={toggleMic}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`h-9 w-9 rounded-full border border-white/20 transition-all ${
                isCameraOn ? 'bg-[#138808] text-white hover:bg-[#0f6e06]' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              onClick={toggleCamera}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>

      {/* Name & Hand Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-30">
        <div className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/15 flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${isCameraOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {displayName} {isLocalUser ? '(You)' : ''}
        </div>
        {roomUser?.isHandRaised && (
          <div className="bg-[#FF9933] text-slate-950 font-bold text-xs px-2.5 py-1 rounded-full border border-[#FF9933] shadow-[0_0_12px_rgba(255,153,51,0.6)] animate-bounce flex items-center gap-1">
            ✋ Hand Raised
          </div>
        )}
      </div>
    </Card>
  );
}
