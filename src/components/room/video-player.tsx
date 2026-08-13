'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AddMediaTabs } from './add-media-tabs';
import { Card } from '../ui/card';
import { ScreenReactions } from './screen-reactions';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PenTool, StopCircle, Film, AlertTriangle } from 'lucide-react';
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
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});

  const roomRef = useMemoFirebase(
    () => (firestore && roomId ? doc(firestore, 'rooms', roomId) : null),
    [firestore, roomId]
  );
  const [roomState] = useDocumentData(roomRef);

  const isHost = user && roomState ? roomState.hostId === user.uid : false;
  const isScreenShare = roomState?.media?.source === 'screen';
  const rawUrl = roomState?.media?.url;
  const mediaUrl = isScreenShare ? localMedia : rawUrl;

  const youtubeId = extractYouTubeId(typeof mediaUrl === 'string' ? mediaUrl : null);
  const placeholderImage = GLOBAL_PLACEHOLDER.imageUrl;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Bind screen share MediaStream to native video element
  useEffect(() => {
    const videoEl = screenVideoRef.current;
    if (isScreenShare && videoEl && localMedia instanceof MediaStream) {
      videoEl.srcObject = localMedia;
      videoEl.play().catch((err) => console.warn('Screen share video play error:', err));
    }
  }, [isScreenShare, localMedia]);

  // WebRTC Screen Share Signaling
  useEffect(() => {
    if (!firestore || !user || !isScreenShare) return;

    if (isHost && localMedia instanceof MediaStream) {
      // Host: Broadcast screen stream to participants
      const signalsRef = collection(firestore, 'rooms', roomId, 'screenSignals');
      const unsubscribe = onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const fromUid = change.doc.id;
            if (data?.offer && data.offer.sdp && typeof data.offer.sdp === 'string' && !data.answer) {
              try {
                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnections.current[fromUid] = pc;

                localMedia.getTracks().forEach((track) => pc.addTrack(track, localMedia));

                pc.onicecandidate = (e) => {
                  if (e.candidate && e.candidate.candidate) {
                    updateDoc(change.doc.ref, {
                      answerCandidates: arrayUnion(e.candidate.toJSON()),
                    }).catch(console.warn);
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                updateDoc(change.doc.ref, { answer: { type: answer.type, sdp: answer.sdp } }).catch(console.warn);
              } catch (err) {
                console.warn('Error setting up host screen share peer connection:', err);
              }
            }
          }
        });
      });
      return () => unsubscribe();
    } else if (!isHost) {
      // Participant: Receive screen stream from host
      const initPC = async () => {
        try {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          const remoteStream = new MediaStream();

          pc.ontrack = (e) => {
            if (e.streams && e.streams[0]) {
              e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
            } else if (e.track) {
              remoteStream.addTrack(e.track);
            }
            setLocalMedia(remoteStream);
          };

          const signalDoc = doc(firestore, 'rooms', roomId, 'screenSignals', user.uid);

          pc.onicecandidate = (e) => {
            const candidate = e.candidate;
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
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp } });

          const unsubscribe = onSnapshot(signalDoc, (d) => {
            const data = d.data();
            if (data?.answer && data.answer.sdp && typeof data.answer.sdp === 'string' && !pc.currentRemoteDescription) {
              try {
                pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.warn);
              } catch (e) {
                console.warn('Failed setting remote description answer:', e);
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
            pc.close();
          };
        } catch (err) {
          console.warn('Error in participant screen share initPC:', err);
        }
      };

      const cleanup = initPC();
      return () => {
        cleanup.then((c) => c && c());
      };
    }
  }, [firestore, user, isScreenShare, isHost, localMedia, roomId]);

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

  const handleStopScreenShare = () => {
    if (localMedia instanceof MediaStream) {
      localMedia.getTracks().forEach((t) => t.stop());
    }
    setLocalMedia(null);

    if (roomRef) {
      setDocumentNonBlocking(
        roomRef,
        {
          media: null,
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
      {!mediaUrl && !isScreenShare ? (
        <div className="w-full max-w-lg p-4 z-10">
          {isHost ? (
            <AddMediaTabs onUrlSelect={handleSelectMedia} />
          ) : (
            <div className="text-center text-muted-foreground animate-pulse p-8 bg-slate-900/60 rounded-2xl border border-white/10 backdrop-blur-xl">
              <Film className="h-10 w-10 text-[#FF9933] mx-auto mb-2 animate-bounce" />
              <p className="text-base font-bold text-white mb-1">Waiting for Host Stream 🎬</p>
              <p className="text-xs text-slate-400">The room host hasn't selected a video or screen share yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full min-h-[420px] bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* ── 1. Native HTML5 Video for WebRTC Screen Sharing ── */}
          {isScreenShare ? (
            <div className="relative w-full h-full min-h-[420px] bg-slate-950 flex items-center justify-center">
              <video
                ref={screenVideoRef}
                className="w-full h-full min-h-[420px] object-contain bg-slate-950"
                autoPlay
                playsInline
                muted={isHost}
                onLoadedMetadata={() => {
                  screenVideoRef.current?.play().catch(console.warn);
                }}
              />
              {isHost && (
                <div className="absolute top-4 right-4 z-30">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleStopScreenShare}
                    className="font-bold gap-1.5 shadow-lg"
                  >
                    <StopCircle className="h-4 w-4" /> Stop Sharing
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
