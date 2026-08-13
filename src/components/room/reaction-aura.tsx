'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { GripVertical } from 'lucide-react';

interface ReactionBurst {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

export function ReactionAura({ roomId }: { roomId: string }) {
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  const [ambientTheme] = useState<'tricolor' | 'cyberpunk' | 'sunset' | 'off'>('tricolor');
  const { firestore, user } = useFirebase();

  // ── Drag state ──
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Initialize position to bottom-right corner on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({
        x: window.innerWidth - 320,
        y: window.innerHeight - 80,
      });
    }
  }, []);

  const handleStartDrag = (clientX: number, clientY: number) => {
    if (!pos) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragOffsetRef.current = {
      x: clientX - pos.x,
      y: clientY - pos.y,
    };
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      hasMovedRef.current = true;
      const newX = Math.max(10, Math.min(window.innerWidth - 300, clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, clientY - dragOffsetRef.current.y));
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  // Listen to live reaction trigger in Firestore
  useEffect(() => {
    if (!firestore || !roomId) return;
    const roomRef = doc(firestore, 'rooms', roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.latestReaction) {
          triggerLocalBurst(data.latestReaction.emoji);
        }
      }
    });
    return () => unsub();
  }, [firestore, roomId]);

  const triggerLocalBurst = (emoji: string) => {
    const newBursts: ReactionBurst[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `b_${Date.now()}_${i}_${Math.random()}`,
      emoji,
      x: 10 + Math.random() * 80,
      y: 60 + Math.random() * 30,
      scale: 0.8 + Math.random() * 0.8,
    }));

    setBursts((prev) => [...prev, ...newBursts]);

    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !newBursts.some((nb) => nb.id === b.id)));
    }, 2500);
  };

  const sendReaction = async (emoji: string) => {
    if (hasMovedRef.current) return; // Don't trigger reaction if user was dragging
    triggerLocalBurst(emoji);
    if (firestore && roomId) {
      const roomRef = doc(firestore, 'rooms', roomId);
      await updateDoc(roomRef, {
        latestReaction: {
          emoji,
          userId: user?.uid || 'anon',
          timestamp: Date.now(),
        },
      }).catch(() => {});
    }
  };

  return (
    <>
      {/* Ambient Room Lighting Glow Backdrop */}
      {ambientTheme !== 'off' && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 transition-all duration-1000">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#ff9933]/20 via-transparent to-[#138808]/20 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Floating 3D Reaction Particles */}
      <div className="pointer-events-none fixed inset-0 z-[9990] overflow-hidden">
        {bursts.map((b) => (
          <div
            key={b.id}
            className="absolute text-4xl sm:text-5xl select-none animate-float-up opacity-90 transition-all"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `scale(${b.scale})`,
              filter: 'drop-shadow(0 0 12px rgba(255,153,51,0.5))',
            }}
          >
            {b.emoji}
          </div>
        ))}
      </div>

      {/* Freely Draggable Quick Reaction Dock */}
      {pos && (
        <div
          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          className="fixed z-[99] flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-slate-950/90 border border-white/20 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-[#ff9933]/40 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          {/* Drag handle icon */}
          <div className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing flex items-center pr-0.5">
            <GripVertical className="h-4 w-4" />
          </div>

          {[
            { key: 'heart', emoji: '❤️', label: 'Heart' },
            { key: 'fire', emoji: '🔥', label: 'Fire' },
            { key: 'party', emoji: '🎉', label: 'Party' },
            { key: 'flag', emoji: '🇮🇳', customRender: <span className="text-xs font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-[#ff9933] via-white to-[#138808] text-slate-950 shadow-sm border border-white/40">🇮🇳</span>, label: 'India Flag' },
            { key: 'clap', emoji: '👏', label: 'Clap' },
            { key: 'rocket', emoji: '🚀', label: 'Rocket' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => sendReaction(item.emoji)}
              className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center text-lg hover:scale-125 transition-transform active:scale-95"
              title={`Send ${item.label}`}
            >
              {item.customRender || item.emoji}
            </button>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.6) rotate(0deg);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-120px) scale(1.2) rotate(15deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-250px) scale(1.5) rotate(-15deg);
          }
        }
        .animate-float-up {
          animation: floatUp 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
    </>
  );
}
