'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LogOut, Download, Clock, ShieldAlert, Sparkles, UserX, FileSpreadsheet } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemoFirebase } from '@/firebase/provider';

interface LeaveLog {
  id: string;
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  leftAt: any;
  reason: string;
}

export function LeaveLogsViewer({
  roomId,
  isHost,
  roomRef,
  requireLeaveReason = false,
}: {
  roomId: string;
  isHost: boolean;
  roomRef: any;
  requireLeaveReason?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { firestore } = useFirebase();

  const logsQuery = useMemoFirebase(
    () => (firestore && roomId && open)
      ? query(collection(firestore, 'rooms', roomId, 'leaveLogs'), orderBy('leftAt', 'desc'))
      : null,
    [firestore, roomId, open]
  );
  const { data: logs, isLoading } = useCollection<LeaveLog>(logsQuery);

  const toggleMandatoryReason = async () => {
    if (!roomRef || !isHost) return;
    await updateDoc(roomRef, {
      requireLeaveReason: !requireLeaveReason,
    }).catch(() => {});
  };

  const exportLeaveLogsCSV = () => {
    if (!logs || logs.length === 0) return;
    let csv = 'User Name,Email,Left Date & Time,Reason\n';
    logs.forEach((log) => {
      const d = log.leftAt?.toDate?.() || (log.leftAt instanceof Date ? log.leftAt : new Date());
      const dateStr = d.toLocaleString();
      const name = `"${log.displayName.replace(/"/g, '""')}"`;
      const email = `"${(log.email || '').replace(/"/g, '""')}"`;
      const reason = `"${log.reason.replace(/"/g, '""')}"`;
      csv += `${name},${email},"${dateStr}",${reason}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_logs_${roomId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 px-1.5 text-[11px] font-extrabold border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 gap-1 shadow-sm rounded-lg justify-center flex items-center min-w-0"
          title="Room Leave Logs"
        >
          <LogOut className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <span className="truncate">Leave Logs</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl border-0 bg-slate-950/98 text-white p-5 shadow-2xl z-[100] rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10">
          <div>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-red-400">
              <LogOut className="h-4 w-4" /> Room Leave Logs & Audit Trail
            </DialogTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tracks participants who left the room, their timestamp, and exit reason.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportLeaveLogsCSV}
            disabled={!logs || logs.length === 0}
            className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-1.5 text-slate-200 font-bold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export CSV
          </Button>
        </DialogHeader>

        {/* Admin Policy Control */}
        {isHost && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/10 my-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <div>
                <p className="font-bold text-white">Require Leave Reason (Mandatory Policy)</p>
                <p className="text-[10px] text-slate-400">When enabled, members MUST select a reason before exiting.</p>
              </div>
            </div>
            <button
              onClick={toggleMandatoryReason}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                requireLeaveReason
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {requireLeaveReason ? 'ON (Mandatory)' : 'OFF (Optional)'}
            </button>
          </div>
        )}

        {/* Leave Logs List */}
        <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 my-2 scrollbar-thin">
          {isLoading && <p className="text-xs text-slate-400 text-center py-6">Loading leave records...</p>}
          {!isLoading && (!logs || logs.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              <UserX className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-400" />
              <p className="text-xs font-semibold">No leave logs recorded yet</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Logs appear here when participants exit the room.</p>
            </div>
          )}

          {logs?.map((log) => {
            const dateObj = log.leftAt?.toDate?.() || (log.leftAt instanceof Date ? log.leftAt : new Date());
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-white/15">
                    <AvatarImage src={log.photoURL} />
                    <AvatarFallback className="bg-red-950 text-red-300 font-bold text-xs">
                      {log.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white leading-snug">{log.displayName}</p>
                    <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full inline-block mt-0.5 font-medium">
                      Reason: {log.reason}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" /> {timeStr} · {dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
