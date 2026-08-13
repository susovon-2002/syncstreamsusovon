'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, CheckCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  uid?: string;
  displayName?: string;
  photoURL?: string;
  joinedAt?: any;
  isHandRaised?: boolean;
  isCameraOn?: boolean;
}

interface AttendanceExporterProps {
  participants: Participant[];
  roomName?: string;
  hostId?: string;
}

export function AttendanceExporter({ participants, roomName, hostId }: AttendanceExporterProps) {
  const { toast } = useToast();

  const exportAttendanceCSV = () => {
    if (!participants || participants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no active participants in this room currently.',
      });
      return;
    }

    const headers = ['Serial No', 'Participant Name', 'User ID', 'Role', 'Attendance / Hand Raised', 'Camera Active', 'Joined Time'];

    const rows = participants.map((p, index) => {
      const pId = p.uid || p.id;
      const isHost = hostId === pId;
      const role = isHost ? 'Host' : 'Participant';
      const handStatus = p.isHandRaised ? 'HAND RAISED (PRESENT)' : 'PRESENT';
      const cameraStatus = p.isCameraOn ? 'ON' : 'OFF';

      let joinedTimeString = 'N/A';
      if (p.joinedAt) {
        if (typeof p.joinedAt.toDate === 'function') {
          joinedTimeString = p.joinedAt.toDate().toLocaleString();
        } else if (p.joinedAt instanceof Date) {
          joinedTimeString = p.joinedAt.toLocaleString();
        } else {
          joinedTimeString = new Date(p.joinedAt).toLocaleString();
        }
      }

      const name = (p.displayName || 'Participant').replace(/"/g, '""');

      return [
        index + 1,
        `"${name}"`,
        `"${pId}"`,
        `"${role}"`,
        `"${handStatus}"`,
        `"${cameraStatus}"`,
        `"${joinedTimeString}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    const fileName = `${(roomName || 'SyncStream_Room').replace(/[^a-z0-9]/gi, '_')}_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Attendance Exported! 📊',
      description: `Downloaded ${participants.length} participant records to ${fileName}`,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportAttendanceCSV}
      className="w-full h-8 text-xs font-bold border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 gap-1.5 shadow-sm rounded-lg justify-center"
      title="Export Live Attendance to CSV File"
    >
      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      <span className="truncate">Export Sheet</span>
    </Button>
  );
}
