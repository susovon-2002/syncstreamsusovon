'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, PartyPopper, Tv } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';

export function Hero() {
  const [roomId, setRoomId] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const router = useRouter();
  const { user, firestore, isUserLoading } = useFirebase();
  const isAuthenticated = !!user && !user.isAnonymous;

  const handleCreateRoom = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!user || !firestore) return;
    const newRoomId = Math.random().toString(36).substring(2, 8);
    
    const finalRoomName = roomNameInput.trim() || `${user.displayName || 'Guest'}'s Room`;

    const roomRef = doc(firestore, 'rooms', newRoomId);
    setDocumentNonBlocking(roomRef, {
      id: newRoomId,
      name: finalRoomName,
      hostId: user.uid,
      createdAt: new Date(),
      members: {
        [user.uid]: 'host',
      }
    }, { merge: true });

    const hostPresenceRef = doc(firestore, 'rooms', newRoomId, 'roomUsers', user.uid);
    setDocumentNonBlocking(hostPresenceRef, {
      uid: user.uid,
      displayName: user.displayName || 'Guest',
      photoURL: user.photoURL || null,
      joinedAt: new Date(),
      isCameraOn: false,
    }, { merge: true });

    router.push(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-8 py-12 text-center md:py-24">
      <div className="float-soft h-24 w-24 overflow-hidden rounded-md shadow-[0_0_48px_rgb(255_153_51_/_0.35)] tricolor-ring md:h-28 md:w-28">
        <img src="/syncstream-logo.png" alt="" className="h-full w-full object-cover" />
      </div>
      <h1 className="tricolor-text text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl font-headline uppercase">
        SyncStream
      </h1>
      <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">
        Watch videos with friends in perfect sync. Create a private room, share a video link, and enjoy a shared viewing experience instantly.
      </p>
      
      <Card className="glass-panel tricolor-ring w-full max-w-md overflow-hidden rounded-xl border border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline tricolor-text">Get Started</CardTitle>
          <CardDescription className="text-slate-300 text-xs">
            Create your custom watch room or join an existing room with a Room ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Room Name Input & Create Button */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5 text-[#ff9933]" />
              <span>Room Name (Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. React Study Group, Movie Night"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="border-white/15 bg-slate-950/80 text-white placeholder:text-slate-400 focus-visible:ring-[#ff9933] text-sm h-10 rounded-lg"
              disabled={isUserLoading}
            />
          </div>

          <Button 
            size="lg" 
            className="w-full bg-gradient-to-r from-[#ff9933] via-white to-[#138808] text-base font-extrabold uppercase tracking-wider text-[#07142c] shadow-[0_12px_34px_rgb(255_153_51_/_0.22)] transition-transform hover:scale-[1.02] hover:shadow-[0_16px_44px_rgb(19_136_8_/_0.22)] rounded-lg h-12" 
            onClick={handleCreateRoom}
            disabled={isUserLoading}
          >
            {isUserLoading ? 'Preparing...' : isAuthenticated ? <><PartyPopper className="mr-2 h-5 w-5" /> Create Room</> : 'Sign In To Continue'}
          </Button>

          <div className="flex items-center gap-4 py-1">
            <Separator className="flex-1 bg-white/10" />
            <span className="text-xs font-bold text-slate-400">OR JOIN EXISTING</span>
            <Separator className="flex-1 bg-white/10" />
          </div>
          
          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <Input
              type="text"
              placeholder="ENTER ROOM ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="border-white/15 bg-slate-950/80 text-center font-code tracking-widest placeholder:text-slate-400 focus-visible:ring-[#ff9933] h-10 rounded-lg"
              aria-label="Room ID to join"
              disabled={isUserLoading}
            />
            <Button type="submit" size="icon" className="bg-[#138808] text-slate-950 hover:bg-[#138808]/90 font-bold h-10 w-10 rounded-lg flex-shrink-0" aria-label="Join Room" disabled={isUserLoading || !roomId.trim()}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
