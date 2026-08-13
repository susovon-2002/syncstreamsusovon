'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Music, Volume2, Sparkles, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Web Audio API Synthesized Sound FX generator for 0-latency instant sounds
function playSynthesizedSound(type: string) {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const now = ctx.currentTime;

  if (type === 'airhorn') {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(466, now);
    osc2.frequency.setValueAtTime(470, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.6); osc2.stop(now + 0.6);
  } else if (type === 'applause') {
    const bufferSize = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.8);
  } else if (type === 'drumroll') {
    for (let i = 0; i < 8; i++) {
      const pulseTime = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, pulseTime);
      gain.gain.setValueAtTime(0.2, pulseTime);
      gain.gain.exponentialRampToValueAtTime(0.01, pulseTime + 0.06);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(pulseTime); osc.stop(pulseTime + 0.06);
    }
  } else if (type === 'chime') {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(startTime); osc.stop(startTime + 0.8);
    });
  } else if (type === 'dhol') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'laugh') {
    const notes = [400, 480, 420, 500, 440];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.1;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(startTime); osc.stop(startTime + 0.08);
    });
  }
}

const SOUNDS = [
  { id: 'airhorn',  name: 'Airhorn',       emoji: '🎉', desc: 'Party Horn',    color: 'from-orange-500/20 to-red-500/10',    border: 'border-orange-500/30', glow: 'hover:shadow-orange-500/25', text: 'text-orange-300' },
  { id: 'applause', name: 'Applause',       emoji: '👏', desc: 'Clapping',      color: 'from-yellow-500/20 to-amber-500/10',  border: 'border-yellow-500/30', glow: 'hover:shadow-yellow-500/25', text: 'text-yellow-300' },
  { id: 'dhol',     name: 'Desi Dhol',      emoji: '🥁', desc: 'Bhangra Beat',  color: 'from-[#ff9933]/20 to-[#138808]/10',   border: 'border-[#ff9933]/40',  glow: 'hover:shadow-[#ff9933]/25',  text: 'text-[#FF9933]'  },
  { id: 'drumroll', name: 'Drum Roll',      emoji: '🎸', desc: 'Snare Roll',    color: 'from-blue-500/20 to-indigo-500/10',  border: 'border-blue-500/30',   glow: 'hover:shadow-blue-500/25',   text: 'text-blue-300'   },
  { id: 'chime',    name: 'Victory Chime',  emoji: '🔔', desc: 'Bell Chime',    color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30',glow: 'hover:shadow-emerald-500/25',text: 'text-emerald-300'},
  { id: 'laugh',    name: 'Sitcom Laugh',   emoji: '😂', desc: 'Laugh Track',   color: 'from-pink-500/20 to-rose-500/10',    border: 'border-pink-500/30',   glow: 'hover:shadow-pink-500/25',   text: 'text-pink-300'   },
];

export function DJSoundboard() {
  const [isMuted, setIsMuted] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePlaySound = (sound: typeof SOUNDS[0]) => {
    if (isMuted) return;
    setPlaying(sound.id);
    playSynthesizedSound(sound.id);
    toast({ title: `${sound.emoji} ${sound.name}`, description: sound.desc });
    setTimeout(() => setPlaying(null), 800);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-bold border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 gap-1.5 shadow-sm rounded-lg justify-center"
          title="Play Live DJ Sound Effects"
        >
          <Music className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="truncate">Soundboard</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="left"
        align="start"
        className="w-72 p-0 border-0 shadow-2xl rounded-2xl overflow-hidden bg-transparent"
      >
        {/* Glassmorphism Container */}
        <div className="bg-gradient-to-br from-[#0a0f1e]/98 via-[#0d1530]/98 to-[#0a0f1e]/98 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="relative px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
            {/* Gradient accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-purple-500 via-[#FF9933] to-pink-500" />

            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Music className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">DJ Soundboard</h4>
                <p className="text-[10px] text-slate-400">Click a card to play</p>
              </div>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Sound Cards Grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            {SOUNDS.map((s) => {
              const isPlaying = playing === s.id;
              return (
                <button
                  key={s.id}
                  disabled={isMuted}
                  onClick={() => handlePlaySound(s)}
                  className={`
                    group relative flex flex-col items-center justify-center gap-1.5 p-3
                    bg-gradient-to-br ${s.color}
                    border ${s.border}
                    rounded-xl transition-all duration-200
                    hover:scale-[1.04] hover:shadow-lg ${s.glow}
                    active:scale-95
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${isPlaying ? 'scale-95 brightness-125' : ''}
                    cursor-pointer
                  `}
                >
                  {/* Ripple flash when playing */}
                  {isPlaying && (
                    <span className="absolute inset-0 rounded-xl animate-ping opacity-30 bg-white" />
                  )}

                  {/* Emoji */}
                  <span className={`text-2xl transition-transform duration-150 ${isPlaying ? 'scale-125' : 'group-hover:scale-110'}`}>
                    {s.emoji}
                  </span>

                  {/* Name */}
                  <span className={`text-[11px] font-extrabold tracking-wide ${s.text}`}>
                    {s.name}
                  </span>

                  {/* Desc tag */}
                  <span className="text-[9px] font-medium text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/10">
                    {s.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <p className="text-[10px] text-slate-500 font-medium">Sounds are synthesized locally — instant & private</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
