'use client';

import { useEffect, use, useState } from 'react';
import { doc, collection, updateDoc, onSnapshot } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase';

import { Header } from '@/components/header';
import { ChatPanel } from '@/components/room/chat-panel';
import { VideoPlayer } from '@/components/room/video-player';
import { Users, AlertCircle, Clock, XCircle, Home } from 'lucide-react';
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

// ── Room Page ───────────────────────────────────────────────────────────────
export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { firestore, user, isUserLoading } = useFirebase();
  const isAuthenticated = !!user && !user.isAnonymous;

  const roomRef = useMemoFirebase(
    () => (firestore && id) ? doc(firestore, 'rooms', id) : null,
    [firestore, id]
  );
  const [room, loadingRoom, roomError] = useDocumentData(roomRef);

  // Track join-request status for non-members
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'denied' | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const isHost = !!(user && room && room.hostId === user.uid);
  const isMember = !!(user && room && room.members && user.uid in room.members);

  // Listen to this user's join request status
  useEffect(() => {
    if (!firestore || !user || !id || isHost || isMember) return;

    const reqRef = doc(firestore, 'rooms', id, 'joinRequests', user.uid);
    const unsub = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRequestStatus(data.status as 'pending' | 'approved' | 'denied');

        // When approved, add user to room members
        if (data.status === 'approved' && roomRef) {
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
  }, [firestore, user, id, isHost, isMember, roomRef]);

  // Send join request if not a member and no request sent yet
  useEffect(() => {
    if (!firestore || !user || !id || !room || isHost || isMember || requestSent) return;

    const reqRef = doc(firestore, 'rooms', id, 'joinRequests', user.uid);
    setDocumentNonBlocking(reqRef, {
      uid: user.uid,
      displayName: user.displayName || 'Guest',
      photoURL: user.photoURL || null,
      requestedAt: new Date(),
      status: 'pending',
    }, { merge: false });
    setRequestSent(true);
  }, [firestore, user, id, room, isHost, isMember, requestSent]);

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
        </div>
      </Header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-3 p-3 overflow-hidden">
        <div className="lg:col-span-1 h-full min-h-0 flex flex-col gap-3">
          <VideoPlayer roomId={id} />
        </div>
        <div className="lg:col-span-1 h-full min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Active User Webcams Strip */}
          {videoParticipants && videoParticipants.length > 0 && (
            <div className="flex-shrink-0 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
              <div className={`grid gap-2 ${videoParticipants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {videoParticipants.map(p => (
                  <div key={p.id || p.uid} className="h-36">
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
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel roomId={id} />
          </div>
        </div>
      </main>

      {/* Host-only join request approval panel */}
      {isHost && <JoinRequestPanel roomId={id} />}

      {/* 3D Spatial Reaction Aura & Floating Bursts */}
      <ReactionAura roomId={id} />
    </div>
  );
}
