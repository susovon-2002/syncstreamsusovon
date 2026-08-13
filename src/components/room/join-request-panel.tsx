'use client';

import { useEffect, useState } from 'react';
import { collection, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, UserCheck } from 'lucide-react';

interface JoinRequest {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: any;
}

interface JoinRequestPanelProps {
  roomId: string;
}

export function JoinRequestPanel({ roomId }: JoinRequestPanelProps) {
  const { firestore, user } = useFirebase();
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!firestore || !roomId) return;

    const requestsRef = collection(firestore, 'rooms', roomId, 'joinRequests');
    const pendingQuery = query(requestsRef, where('status', '==', 'pending'));

    const unsub = onSnapshot(pendingQuery, (snap) => {
      const reqs: JoinRequest[] = snap.docs.map(d => ({ uid: d.id, ...d.data() } as JoinRequest));
      setPendingRequests(reqs);
    });

    return () => unsub();
  }, [firestore, roomId]);

  const handleAllow = async (req: JoinRequest) => {
    if (!firestore) return;

    // 1. Approve the request
    const reqRef = doc(firestore, 'rooms', roomId, 'joinRequests', req.uid);
    await updateDoc(reqRef, { status: 'approved' });

    // 2. Add user to room members
    const roomRef = doc(firestore, 'rooms', roomId);
    setDocumentNonBlocking(roomRef, {
      members: { [req.uid]: 'participant' }
    }, { merge: true });

    // 3. Add user presence doc
    const presenceRef = doc(firestore, 'rooms', roomId, 'roomUsers', req.uid);
    setDocumentNonBlocking(presenceRef, {
      uid: req.uid,
      displayName: req.displayName,
      photoURL: req.photoURL,
      joinedAt: new Date(),
      isCameraOn: false,
    }, { merge: true });
  };

  const handleDeny = async (req: JoinRequest) => {
    if (!firestore) return;
    const reqRef = doc(firestore, 'rooms', roomId, 'joinRequests', req.uid);
    await updateDoc(reqRef, { status: 'denied' });
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {pendingRequests.map((req) => (
        <div
          key={req.uid}
          className="relative flex items-center gap-3 rounded-xl border border-[#FF9933]/40 bg-[#061126]/90 p-4 shadow-[0_8px_32px_rgb(0_0_0_/_0.5)] backdrop-blur-xl animate-in slide-in-from-right-8 duration-300"
        >
          {/* Tricolor top stripe */}
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

          <div className="relative">
            <Avatar className="h-11 w-11 border-2 border-[#FF9933]/50">
              <AvatarImage src={req.photoURL || ''} />
              <AvatarFallback className="bg-[#FF9933]/20 text-[#FF9933] font-bold text-base">
                {req.displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#FF9933] ring-2 ring-[#061126] animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#FF9933] flex-shrink-0" />
              <p className="text-[11px] text-[#FF9933] font-semibold uppercase tracking-wide">Wants to join</p>
            </div>
            <p className="text-sm font-bold text-white truncate">{req.displayName}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              onClick={() => handleAllow(req)}
              className="h-8 px-3 bg-[#138808] hover:bg-[#0f6a06] text-white text-xs font-bold gap-1 shadow-[0_4px_14px_rgb(19_136_8_/_0.4)]"
            >
              <Check className="h-3.5 w-3.5" /> Allow
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeny(req)}
              className="h-8 px-3 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold gap-1"
            >
              <X className="h-3.5 w-3.5" /> Deny
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
