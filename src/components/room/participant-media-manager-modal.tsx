'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Mic, MicOff, Video, VideoOff, UserX, Shield, Users, VolumeX, Camera, Hand } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface ParticipantMediaManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  participants: any[];
  isHost: boolean;
  roomState?: any;
}

export function ParticipantMediaManagerModal({
  open,
  onOpenChange,
  roomId,
  participants,
  isHost,
  roomState,
}: ParticipantMediaManagerModalProps) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();

  const activeParticipants = participants?.filter(p => {
    const pId = p.uid || p.id;
    if (!pId) return false;
    if (p.isLeft === true || p.isOnline === false) return false;
    if (roomState?.members && !(pId in roomState.members) && pId !== roomState?.hostId) return false;
    return true;
  }) || [];

  const handleToggleUserCamera = (targetUid: string, blocked: boolean) => {
    if (!firestore || !isHost) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    setDocumentNonBlocking(userRef, blocked ? { cameraBlocked: true, isCameraOn: false } : { cameraBlocked: false }, { merge: true });
    toast({
      title: blocked ? 'Camera Blocked 📹🚫' : 'Camera Enabled 📹',
      description: `Updated camera settings for participant`,
    });
  };

  const handleToggleUserMic = (targetUid: string, blocked: boolean) => {
    if (!firestore || !isHost) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    setDocumentNonBlocking(userRef, blocked ? { micBlocked: true, isMicOn: false } : { micBlocked: false }, { merge: true });
    toast({
      title: blocked ? 'Microphone Muted 🔇' : 'Microphone Unmuted 🎙️',
      description: `Updated microphone settings for participant`,
    });
  };

  const handleToggleAllCameras = (blocked: boolean) => {
    if (!firestore || !isHost || !activeParticipants) return;
    activeParticipants.forEach(p => {
      const uId = p.uid || p.id;
      if (uId && uId !== currentUser?.uid) {
        const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
        setDocumentNonBlocking(userRef, blocked ? { cameraBlocked: true, isCameraOn: false } : { cameraBlocked: false }, { merge: true });
      }
    });
    const roomRef = doc(firestore, 'rooms', roomId);
    setDocumentNonBlocking(roomRef, { allCamerasBlocked: blocked }, { merge: true });
    toast({
      title: blocked ? 'All Cameras Blocked 📹🚫' : 'All Cameras Enabled 📷',
      description: blocked ? 'Disabled camera access for all members' : 'Re-enabled cameras for all members',
    });
  };

  const handleToggleAllMics = (blocked: boolean) => {
    if (!firestore || !isHost || !activeParticipants) return;
    activeParticipants.forEach(p => {
      const uId = p.uid || p.id;
      if (uId && uId !== currentUser?.uid) {
        const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
        setDocumentNonBlocking(userRef, blocked ? { micBlocked: true, isMicOn: false } : { micBlocked: false }, { merge: true });
      }
    });
    const roomRef = doc(firestore, 'rooms', roomId);
    setDocumentNonBlocking(roomRef, { allMicsBlocked: blocked }, { merge: true });
    toast({
      title: blocked ? 'All Microphones Muted 🔇' : 'All Microphones Enabled 🎙️',
      description: blocked ? 'Muted microphones for all members' : 'Re-enabled microphones for all members',
    });
  };

  const handleLowerAllHands = () => {
    if (!firestore || !activeParticipants) return;
    activeParticipants.filter(p => p.isHandRaised).forEach(p => {
      const uId = p.uid || p.id;
      const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
      setDocumentNonBlocking(userRef, { isHandRaised: false, handRaisedAt: null }, { merge: true });
    });
    toast({
      title: 'Lowered All Hands 🖐️',
      description: 'Cleared raised hands list',
    });
  };

  const handleRemoveParticipant = async (targetUid: string) => {
    if (!firestore || !roomId || !isHost) return;
    const kickRef = doc(firestore, 'rooms', roomId, 'kickedUsers', targetUid);
    await setDoc(kickRef, { kickedAt: new Date(), kickedBy: currentUser?.uid, reason: 'Kicked by room host' }, { merge: true }).catch(() => {});

    const reqRef = doc(firestore, 'rooms', roomId, 'joinRequests', targetUid);
    await setDoc(reqRef, { status: 'denied', kicked: true }, { merge: true }).catch(() => {});

    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    await setDoc(userRef, { isKicked: true, isOnline: false, isCameraOn: false }, { merge: true }).catch(() => {});
    await deleteDoc(userRef).catch(() => {});

    const roomRef = doc(firestore, 'rooms', roomId);
    await updateDoc(roomRef, {
      [`members.${targetUid}`]: deleteField(),
    }).catch(() => {});

    toast({
      title: 'Participant Removed ❌',
      description: 'Removed user from room permanently',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl glass-panel bg-slate-950/95 border-white/20 text-white rounded-2xl p-0 overflow-hidden shadow-2xl backdrop-blur-2xl">
        {/* Tricolor Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />

        <DialogHeader className="p-6 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#ff9933]" />
              Call Participant & Media Manager
            </DialogTitle>
            <span className="flex items-center gap-1.5 bg-[#ff9933]/20 border border-[#ff9933]/40 text-[#ff9933] text-xs font-bold px-3 py-1 rounded-full">
              <Users className="h-3.5 w-3.5" />
              {activeParticipants.length} Active {activeParticipants.length === 1 ? 'Caller' : 'Callers'}
            </span>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Host Global Quick Actions Card */}
          {isHost && (
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Room-Wide Host Controls
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAllMics(!roomState?.allMicsBlocked)}
                  className={`h-10 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 rounded-lg ${
                    roomState?.allMicsBlocked
                      ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <VolumeX className="h-4 w-4" />
                  {roomState?.allMicsBlocked ? 'Unmute All Mics' : 'Mute All Mics'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAllCameras(!roomState?.allCamerasBlocked)}
                  className={`h-10 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 rounded-lg ${
                    roomState?.allCamerasBlocked
                      ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {roomState?.allCamerasBlocked ? 'Enable All Cams' : 'Block All Cams'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLowerAllHands}
                  className="h-10 text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Hand className="h-4 w-4" />
                  Lower All Hands
                </Button>
              </div>
            </div>
          )}

          {/* Participant Media Status List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Listed Participants ({activeParticipants.length})
            </span>

            {activeParticipants.map((p) => {
              const pId = p.uid || p.id;
              const isSelf = currentUser ? pId === currentUser.uid : false;
              const nameToDisplay = isSelf ? 'You' : p.displayName || p.email?.split('@')[0] || 'Member';
              const isParticipantHost = roomState?.hostId === pId;

              return (
                <div
                  key={pId}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={p.photoURL} />
                        <AvatarFallback className="bg-slate-800 font-bold text-xs">
                          {nameToDisplay.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isParticipantHost && (
                        <div className="absolute -top-1 -right-1 bg-[#ff9933] rounded-full p-0.5 shadow">
                          <Crown className="h-3 w-3 text-slate-950" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{nameToDisplay}</span>
                        {isSelf && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-bold">YOU</span>}
                        {isParticipantHost && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">HOST</span>}
                      </div>
                      <span className="text-xs text-slate-400 block">
                        {p.isCameraOn ? '📹 Cam Active' : '📹 Cam Off'} • {p.isMicOn ? '🎙️ Mic Active' : '🎙️ Mic Off'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Host */}
                  {isHost && !isSelf ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleUserMic(pId, !p.micBlocked)}
                        className={`h-8 px-2.5 text-xs font-bold border rounded-lg ${
                          p.micBlocked
                            ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                        title={p.micBlocked ? 'Unmute Participant Mic' : 'Mute Participant Mic'}
                      >
                        {p.micBlocked ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        <span>{p.micBlocked ? 'Muted' : 'Mic On'}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleUserCamera(pId, !p.cameraBlocked)}
                        className={`h-8 px-2.5 text-xs font-bold border rounded-lg ${
                          p.cameraBlocked
                            ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                        title={p.cameraBlocked ? 'Enable Participant Camera' : 'Block Participant Camera'}
                      >
                        {p.cameraBlocked ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                        <span>{p.cameraBlocked ? 'Blocked' : 'Cam On'}</span>
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveParticipant(pId)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg border border-red-500/30"
                        title="Remove Participant"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      {p.cameraBlocked && <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Cam Blocked</span>}
                      {p.micBlocked && <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Mic Muted</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
