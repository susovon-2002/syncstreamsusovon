'use client';

import { useEffect, use, useState } from 'react';
import { doc, collection, updateDoc, onSnapshot } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase';

import { Header } from '@/components/header';
import { ChatPanel } from '@/components/room/chat-panel';
import { VideoPlayer } from '@/components/room/video-player';
import { Users, AlertCircle, Clock, XCircle, Home, LogOut } from 'lucide-react';
import { RoomIdDisplay } from '@/components/room/room-id-display';
import { useCollection } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useMemoFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserVideo } from '@/components/room/user-video';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { JoinRequestPanel } from '@/components/room/join-request-panel';
import { ReactionAura } from '@/components/room/reaction-aura';
import { LeaveMeetingModal } from '@/components/room/leave-meeting-modal';


// ── Waiting Room Screen ─────────────────────────────────────────────────────
function WaitingRoom({
  roomId,
  user,
  roomName,
  requestStatus,
}: {
  roomId: string;
  user: any;
  roomName?: string;
  requestStatus: 'pending' | 'denied' | null;
}) {
  if (requestStatus === 'denied') {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="relative max-w-md w-full rounded-2xl border border-red-500/30 bg-[#061126]/80 p-8 text-center shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-t-2xl" />
            <XCircle className="mx-auto h-14 w-14 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Entry Denied</h2>
            <p className="text-slate-400 text-sm mb-6">
              The host has declined your request to join <span className="text-white font-semibold">{roomName || 'this room'}</span>.
            </p>
            <Button asChild className="bg-gradient-to-r from-[#FF9933] to-[#138808] font-bold text-white gap-2">
              <Link href="/"><Home className="h-4 w-4" /> Go to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="relative max-w-md w-full rounded-2xl border border-[#FF9933]/30 bg-[#061126]/80 p-8 text-center shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Tricolor top bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-t-2xl" />

          {/* Pulsing avatar */}
          <div className="relative mx-auto w-20 h-20 mb-5">
            <div className="absolute inset-0 rounded-full bg-[#FF9933]/20 animate-ping" />
            <Avatar className="h-20 w-20 border-2 border-[#FF9933]/60 relative">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="text-2xl font-bold bg-[#FF9933]/20 text-[#FF9933]">
                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            Hi, {user.displayName?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p className="text-slate-400 text-sm mb-1">
            You are waiting to join
          </p>
          <p className="text-[#FF9933] font-bold text-base mb-6">
            {roomName || 'this room'}
          </p>

          {/* Animated waiting dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock className="h-4 w-4 text-[#FF9933] animate-pulse" />
            <span className="text-slate-300 text-sm">Waiting for host to admit you</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF9933]"
                  style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
                />
              ))}
            </span>
          </div>

          {/* Tricolor progress bar */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #FF9933 0%, #ffffff 50%, #138808 100%)',
                animation: 'shimmer 2s linear infinite',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          <p className="text-slate-500 text-xs mt-4">
            Do not close this tab — you will be admitted automatically.
          </p>

          <Button asChild variant="ghost" className="mt-4 text-slate-400 hover:text-white gap-2 text-xs">
            <Link href="/"><Home className="h-3.5 w-3.5" /> Leave & go home</Link>
          </Button>
        </div>
      </main>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ── Kicked/Removed Room Screen ─────────────────────────────────────────────
function KickedRoom({ roomName }: { roomName?: string }) {
  return (
    <div className="flex flex-col h-dvh bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="relative max-w-md w-full rounded-2xl border border-red-500/50 bg-[#061126]/90 p-8 text-center shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#ef4444] rounded-t-2xl shadow-[0_0_12px_#ef4444]" />
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">You Have Been Removed From This Meeting</h2>
          <p className="text-slate-300 text-sm mb-6">
            The host has removed you from <span className="text-white font-semibold">{roomName || 'this room'}</span>. You are not permitted to rejoin this meeting session.
          </p>
          <Button asChild className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:opacity-90 font-extrabold text-white gap-2 h-11 rounded-xl shadow-lg">
            <Link href="/"><Home className="h-4 w-4" /> Go to Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

// ── Left Room Screen ───────────────────────────────────────────────────────
function LeftRoom({
  roomName,
  onRejoin,
}: {
  roomName?: string;
  onRejoin: () => void;
}) {
  return (
    <div className="flex flex-col h-dvh bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="relative max-w-md w-full rounded-2xl border border-[#FF9933]/30 bg-[#061126]/90 p-8 text-center shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-t-2xl" />
          <LogOut className="mx-auto h-14 w-14 text-[#FF9933] mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">You Left The Meeting</h2>
          <p className="text-slate-400 text-sm mb-6">
            You voluntarily left <span className="text-white font-semibold">{roomName || 'this room'}</span>.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={onRejoin}
              className="w-full bg-gradient-to-r from-[#FF9933] to-[#138808] font-extrabold text-[#07142c] h-11 rounded-xl shadow-lg hover:scale-[1.02] transition-all"
            >
              Re-join Meeting 🚪
            </Button>
            <Button asChild variant="ghost" className="text-slate-400 hover:text-white text-xs gap-2">
              <Link href="/"><Home className="h-3.5 w-3.5" /> Back to Home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Room Page ───────────────────────────────────────────────────────────────
export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { firestore, user, isUserLoading } = useFirebase();
  const isAuthenticated = !!user && !user.isAnonymous;
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isKickedByHost, setIsKickedByHost] = useState(false);
  const [hasVoluntarilyLeft, setHasVoluntarilyLeft] = useState(false);

  const roomRef = useMemoFirebase(
    () => (firestore && id) ? doc(firestore, 'rooms', id) : null,
    [firestore, id]
  );
  const [room, loadingRoom, roomError] = useDocumentData(roomRef);

  // Check if user previously left room voluntarily in this browser session
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const leftFlag = sessionStorage.getItem(`syncstream_left_room_${id}`);
      if (leftFlag === 'true') {
        setHasVoluntarilyLeft(true);
      }
    }
  }, [id]);

  // Server-side check: Listen to kickedUsers subcollection
  useEffect(() => {
    if (!firestore || !user || !id) return;
    const kickedRef = doc(firestore, 'rooms', id, 'kickedUsers', user.uid);
    const unsub = onSnapshot(kickedRef, (snap) => {
      if (snap.exists()) {
        setIsKickedByHost(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('syncstream:stop-local-media'));
        }
      }
    });
    return () => unsub();
  }, [firestore, user, id]);

  // Track join-request status for non-members
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'denied' | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const isHost = !!(user && room && room.hostId === user.uid);
  const isMember = !!(user && room && room.members && user.uid in room.members);

  // Listen to this user's join request status
  useEffect(() => {
    if (!firestore || !user || !id || isHost) return;

    const reqRef = doc(firestore, 'rooms', id, 'joinRequests', user.uid);
    const unsub = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.kicked === true || data.status === 'denied') {
          setIsKickedByHost(true);
          setRequestStatus('denied');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('syncstream:stop-local-media'));
          }
          return;
        }

        const currentStatus = data.status as 'pending' | 'approved' | 'denied' | 'left';
        setRequestStatus(currentStatus === 'left' ? 'denied' : (currentStatus as 'pending' | 'approved' | 'denied'));

        // Only add user to members if status is approved AND not kicked or left
        if (data.status === 'approved' && !data.kicked && roomRef) {
          setDocumentNonBlocking(roomRef, {
            members: { [user.uid]: 'participant' }
          }, { merge: true });
          const presenceRef = doc(firestore, 'rooms', id, 'roomUsers', user.uid);
          setDocumentNonBlocking(presenceRef, {
            uid: user.uid,
            displayName: user.displayName || 'Guest',
            photoURL: user.photoURL,
            joinedAt: new Date(),
            isCameraOn: false,
          }, { merge: true });
        }
      }
    });

    return () => unsub();
  }, [firestore, user, id, isHost, roomRef]);

  // Send join request if not a member and no request sent yet
  useEffect(() => {
    if (!firestore || !user || !id || !room || isHost || isMember || requestSent || requestStatus === 'denied' || isKickedByHost || hasVoluntarilyLeft) return;

    const reqRef = doc(firestore, 'rooms', id, 'joinRequests', user.uid);
    setDocumentNonBlocking(reqRef, {
      uid: user.uid,
      displayName: user.displayName || 'Guest',
      photoURL: user.photoURL || null,
      requestedAt: new Date(),
      status: 'pending',
    }, { merge: false });
    setRequestSent(true);
  }, [firestore, user, id, room, isHost, isMember, requestSent, requestStatus, isKickedByHost, hasVoluntarilyLeft]);

  const handleManualRejoin = () => {
    if (typeof window !== 'undefined' && id) {
      sessionStorage.removeItem(`syncstream_left_room_${id}`);
    }
    setHasVoluntarilyLeft(false);
    setRequestSent(false);
    setRequestStatus(null);
  };

  const roomUsersRef = useMemoFirebase(
    () => (firestore && user && isAuthenticated && !isUserLoading && roomRef && isMember)
      ? collection(roomRef, 'roomUsers')
      : null,
    [firestore, user, isAuthenticated, isUserLoading, roomRef, isMember]
  );
  const { data: roomUsers } = useCollection(roomUsersRef);

  // Handle user leaving room (cleanup)
  useEffect(() => {
    if (!user || !isAuthenticated || !firestore || !id) return;
    const handleBeforeUnload = () => {
      const userRef = doc(firestore, 'rooms', id, 'roomUsers', user.uid);
      setDocumentNonBlocking(userRef, { isCameraOn: false }, { merge: true });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isAuthenticated, firestore, id]);

  const videoParticipants = roomUsers?.filter(p => p.isCameraOn);

  // ── Error state ──
  if (roomError) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              We couldn't connect to this room. Please check the ID or your connection.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/">Back to Home</Link>
          </Button>
        </main>
      </div>
    );
  }

  // ── Kicked by Host screen (Enforced by server/database state) ──
  if (isKickedByHost) {
    return <KickedRoom roomName={room?.name} />;
  }

  // ── Voluntarily Left screen ──
  if (hasVoluntarilyLeft && !isHost) {
    return <LeftRoom roomName={room?.name} onRejoin={handleManualRejoin} />;
  }

  // ── Loading state ──
  if (!id || isUserLoading || loadingRoom || !user) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-muted-foreground">Joining room…</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <Alert className="glass-panel max-w-md border-white/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sign In Required</AlertTitle>
            <AlertDescription>
              Please sign in or create an account to access this room.
            </AlertDescription>
            <Button asChild className="mt-4 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] font-bold text-[#07142c]">
              <Link href="/login">Sign In To Continue</Link>
            </Button>
          </Alert>
        </main>
      </div>
    );
  }

  // ── Waiting room (non-member, non-host) ──
  if (!isMember && !isHost && requestStatus !== 'approved') {
    return (
      <WaitingRoom
        roomId={id}
        user={user}
        roomName={room?.name}
        requestStatus={requestStatus}
      />
    );
  }

  // ── Full room view ──
  return (
    <div className="flex flex-col h-dvh bg-background">
      <Header>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{roomUsers?.length || 1}</span>
            <div className="flex -space-x-2 ml-2">
              <TooltipProvider>
                {roomUsers?.map((u) => (
                  <Tooltip key={u.id}>
                    <TooltipTrigger>
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback className="text-[10px]">{u.displayName?.charAt(0) || 'G'}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent><p>{u.displayName}</p></TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
          <RoomIdDisplay roomId={id} roomName={room?.name} isHost={isHost} roomRef={roomRef} />
          
          {/* Leave Meeting Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLeaveModalOpen(true)}
            className="h-8 px-3 text-xs border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 font-extrabold gap-1.5 shadow"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Leave Room</span>
          </Button>
        </div>
      </Header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-2.5 sm:gap-3 p-2 sm:p-3 overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:col-span-1 min-h-[260px] sm:min-h-[380px] lg:h-full lg:min-h-0 flex flex-col gap-3">
          <VideoPlayer roomId={id} />
        </div>
        <div className="w-full lg:col-span-1 flex-1 lg:h-full lg:min-h-0 flex flex-col gap-2.5 sm:gap-3 overflow-visible lg:overflow-hidden">
          {/* Active User Webcams Strip */}
          {videoParticipants && videoParticipants.length > 0 && (
            <div className="flex-shrink-0 max-h-48 overflow-x-auto lg:overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex lg:grid gap-2 flex-nowrap lg:grid-cols-2">
                {videoParticipants.map(p => (
                  <div key={p.id || p.uid} className="h-32 sm:h-36 w-44 sm:w-48 lg:w-full flex-shrink-0 lg:flex-shrink">
                    <UserVideo
                      user={p}
                      roomId={id}
                      isLocalUser={user ? (p.uid === user.uid || p.id === user.uid) : false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Main Live Chat Panel - Fills remaining height */}
          <div className="flex-1 min-h-[480px] lg:min-h-0 flex flex-col">
            <ChatPanel roomId={id} />
          </div>
        </div>
      </main>

      {/* Host-only join request approval panel */}
      {isHost && <JoinRequestPanel roomId={id} />}

      {/* 3D Spatial Reaction Aura & Floating Bursts */}
      <ReactionAura roomId={id} />

      {/* Leave Meeting Modal */}
      <LeaveMeetingModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        roomId={id}
        roomName={room?.name}
        isMandatory={!!room?.requireLeaveReason}
      />
    </div>
  );
}
