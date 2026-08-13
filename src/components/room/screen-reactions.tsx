'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Flame, Film, Laugh, Heart, ThumbsUp, Sparkles, Popcorn } from 'lucide-react';

interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  createdAt: number;
  leftPercent: number; // Random horizontal position (10% to 90%)
}

interface ScreenReactionsProps {
  roomId: string;
}

const EMOJI_LIST = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎬', label: 'Movie' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🍿', label: 'Popcorn' },
  { emoji: '🇮🇳', label: 'India' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '❤️', label: 'Love' },
];

export function ScreenReactions({ roomId }: ScreenReactionsProps) {
  const { firestore, user } = useFirebase();
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);

  // Listen to live reactions
  useEffect(() => {
    if (!firestore || !roomId) return;

    const reactionsRef = collection(firestore, 'rooms', roomId, 'reactions');
    const q = query(reactionsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsub = onSnapshot(q, (snap) => {
      const newItems: ReactionItem[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          emoji: data.emoji || '🔥',
          senderName: data.senderName || 'Member',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          leftPercent: data.leftPercent || Math.floor(Math.random() * 80) + 10,
        };
      });

      // Filter out reactions older than 3 seconds
      const now = Date.now();
      const freshReactions = newItems.filter((r) => now - r.createdAt < 3000);
      setActiveReactions(freshReactions);
    });

    return () => unsub();
  }, [firestore, roomId]);

  const handleSendReaction = async (emoji: string) => {
    if (!firestore || !roomId || !user) return;

    const reactionsRef = collection(firestore, 'rooms', roomId, 'reactions');
    const leftPercent = Math.floor(Math.random() * 75) + 12; // 12% to 87%

    await addDoc(reactionsRef, {
      emoji,
      senderName: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Member',
      leftPercent,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <>
      {/* ── Floating Emojis Canvas Overlay ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-6 flex flex-col items-center animate-float-up opacity-90"
            style={{
              left: `${r.leftPercent}%`,
              animation: 'floatUp 2.8s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            }}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter">
              {r.emoji}
            </span>
            <span className="text-[10px] font-extrabold text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/20 shadow-md">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* ── Reaction Control Bar ── */}
      <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-950/70 backdrop-blur-xl border-t border-white/10 rounded-b-xl overflow-x-auto">
        <span className="text-[11px] font-bold text-[#FF9933] uppercase tracking-wider px-2 hidden sm:flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Express:
        </span>
        {EMOJI_LIST.map((item) => (
          <Button
            key={item.emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleSendReaction(item.emoji)}
            className="h-8 px-2.5 bg-white/5 hover:bg-[#FF9933]/20 border border-white/10 hover:border-[#FF9933]/50 text-base sm:text-lg rounded-full transition-all duration-200 hover:scale-125 active:scale-95"
            title={`Send ${item.label}`}
          >
            {item.emoji}
          </Button>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 1;
          }
          50% {
            transform: translateY(-140px) scale(1.2) rotate(-5deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(-280px) scale(1) rotate(5deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
