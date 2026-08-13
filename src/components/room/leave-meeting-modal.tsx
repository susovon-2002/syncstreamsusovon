'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, collection, addDoc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const PRESET_REASONS = [
  '✅ Meeting Completed / Topic Finished',
  '📶 Network / Audio Connection Issue',
  '📅 Next Scheduled Meeting / Appointment',
  '☕ Personal Break / BRB',
  '✍️ Other (Type below)',
];

interface LeaveMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName?: string;
  isMandatory?: boolean;
}

export function LeaveMeetingModal({
  open,
  onOpenChange,
  roomId,
  roomName,
  isMandatory = false,
}: LeaveMeetingModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore, user } = useFirebase();
  const router = useRouter();

  const finalReason = selectedReason === '✍️ Other (Type below)' ? customReason : selectedReason;
  const isButtonDisabled = isMandatory && !finalReason.trim();

  const handleConfirmLeave = async () => {
    if (isMandatory && !finalReason.trim()) return;
    setIsSubmitting(true);

    try {
      if (firestore && roomId && user) {
        // 1. Record leave log in Firestore
        const logsRef = collection(firestore, 'rooms', roomId, 'leaveLogs');
        await addDoc(logsRef, {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Member',
          email: user.email || '',
          photoURL: user.photoURL || null,
          leftAt: new Date(),
          reason: finalReason.trim() || 'No reason specified',
        }).catch(() => {});

        // 2. Mark presence as left and delete document from roomUsers collection
        const presenceRef = doc(firestore, 'rooms', roomId, 'roomUsers', user.uid);
        await updateDoc(presenceRef, { isLeft: true, isOnline: false, isCameraOn: false }).catch(() => {});
        await deleteDoc(presenceRef).catch(() => {});

        // 3. Remove user from room members map
        const roomRef = doc(firestore, 'rooms', roomId);
        await updateDoc(roomRef, {
          [`members.${user.uid}`]: deleteField(),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Error recording leave log:', e);
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
      router.push('/');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 bg-slate-950/98 text-white p-6 shadow-2xl z-[100] rounded-2xl">
        <DialogHeader className="flex flex-col items-center text-center pb-2">
          <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <LogOut className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-white">
            Leave <span className="tricolor-text">{roomName || 'Meeting Room'}</span>?
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            {isMandatory ? (
              <span className="text-amber-400 font-bold flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Host requires a leave reason before exiting.
              </span>
            ) : (
              'Please select your reason for leaving this session.'
            )}
          </p>
        </DialogHeader>

        {/* Reason Picker */}
        <div className="space-y-2 my-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
            Select Reason {isMandatory && <span className="text-red-400">*</span>}:
          </label>
          <div className="space-y-1.5">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReason(r)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                  selectedReason === r
                    ? 'bg-[#ff9933]/20 border-[#ff9933] text-[#ff9933]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>{r}</span>
                {selectedReason === r && <CheckCircle2 className="h-3.5 w-3.5 text-[#ff9933]" />}
              </button>
            ))}
          </div>

          {selectedReason === '✍️ Other (Type below)' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Type your reason here..."
              className="w-full mt-2 px-3 h-9 text-xs rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff9933]"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmLeave}
            disabled={isSubmitting || isButtonDisabled}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/20 disabled:opacity-40"
          >
            {isSubmitting ? 'Leaving...' : 'Confirm & Leave'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
