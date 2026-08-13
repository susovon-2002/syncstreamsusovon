"use client";

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Pencil, Check, X, Tv } from 'lucide-react';
import { updateDoc, DocumentReference } from 'firebase/firestore';

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

interface RoomIdDisplayProps {
  roomId: string;
  roomName?: string;
  isHost?: boolean;
  roomRef?: DocumentReference | null;
}

export function RoomIdDisplay({ roomId, roomName, isHost, roomRef }: RoomIdDisplayProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingValue, setEditingValue] = useState(roomName || '');

  const displayRoomName = roomName || 'SyncStream Room';

  const handleShare = () => {
    const roomUrl = window.location.href;
    const message = `Join me on SyncStream! 🚀\n\nRoom Name: ${displayRoomName}\nRoom ID: ${roomId}\n\nJoin here: ${roomUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSaveRoomName = async () => {
    if (!editingValue.trim() || !roomRef) return;
    try {
      await updateDoc(roomRef, {
        name: editingValue.trim()
      });
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update room name:', err);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-1.5 font-code text-xs text-white shadow-md">
        
        {/* Room Name display & Host edit form */}
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="h-7 text-xs bg-slate-900 border-white/20 text-white w-36"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-emerald-400 hover:bg-emerald-500/20"
              onClick={handleSaveRoomName}
              title="Save Room Name"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-rose-400 hover:bg-rose-500/20"
              onClick={() => setIsEditingName(false)}
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[280px] truncate">
            <Tv className="h-3.5 w-3.5 text-[#ff9933] flex-shrink-0" />
            <span className="font-bold text-white truncate" title={displayRoomName}>
              {displayRoomName}
            </span>
            <span className="text-slate-400 text-[10px] font-mono flex-shrink-0">({roomId})</span>

            {isHost && roomRef && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-slate-400 hover:text-[#ff9933] hover:bg-white/10 p-0 ml-0.5"
                onClick={() => {
                  setEditingValue(displayRoomName);
                  setIsEditingName(true);
                }}
                title="Edit Room Name"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center border-l border-white/15 pl-1.5 ml-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-300 hover:text-white hover:bg-white/10"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy Room ID</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-400 hover:text-emerald-300 hover:bg-white/10"
                onClick={handleShare}
              >
                <WhatsAppIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share on WhatsApp</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
