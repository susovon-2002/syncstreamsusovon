'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Check } from 'lucide-react';

export type RoomTheme = 'tricolor' | 'cinema' | 'cyberpunk' | 'chai';

interface RoomThemeSelectorProps {
  onThemeChange?: (theme: RoomTheme) => void;
}

const THEMES: { id: RoomTheme; name: string; icon: string; bgStyle: string; borderStyle: string }[] = [
  {
    id: 'tricolor',
    name: 'Indian Tricolor',
    icon: '🇮🇳',
    bgStyle: 'from-[#061126] via-[#0b1d3a] to-slate-950',
    borderStyle: 'border-[#FF9933]/40',
  },
  {
    id: 'cinema',
    name: 'Midnight Cinema',
    icon: '🎬',
    bgStyle: 'from-black via-slate-950 to-black',
    borderStyle: 'border-white/10',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    icon: '💜',
    bgStyle: 'from-[#120524] via-[#1a0836] to-[#0a0218]',
    borderStyle: 'border-purple-500/50',
  },
  {
    id: 'chai',
    name: 'Chai & Focus',
    icon: '🍵',
    bgStyle: 'from-[#1c120c] via-[#281a12] to-[#120a07]',
    borderStyle: 'border-amber-600/40',
  },
];

export function RoomThemeSelector({ onThemeChange }: RoomThemeSelectorProps) {
  const [activeTheme, setActiveTheme] = useState<RoomTheme>('tricolor');

  useEffect(() => {
    const savedTheme = localStorage.getItem('syncstream_theme') as RoomTheme;
    if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
      setActiveTheme(savedTheme);
      applyThemeToBody(savedTheme);
    }
  }, []);

  const applyThemeToBody = (themeId: RoomTheme) => {
    localStorage.setItem('syncstream_theme', themeId);
    const body = document.body;
    body.classList.remove('theme-tricolor', 'theme-cinema', 'theme-cyberpunk', 'theme-chai');
    body.classList.add(`theme-${themeId}`);
    if (onThemeChange) onThemeChange(themeId);
  };

  const handleSelectTheme = (themeId: RoomTheme) => {
    setActiveTheme(themeId);
    applyThemeToBody(themeId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1.5 shadow-sm rounded-lg justify-center"
          title="Change Room Ambient Theme"
        >
          <Palette className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-[#061126]/95 border-white/20 text-white shadow-2xl backdrop-blur-xl rounded-2xl">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 p-2 pb-1">
          Ambient Room Themes
        </div>
        <div className="space-y-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTheme(t.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTheme === t.id
                  ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/50'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </span>
              {activeTheme === t.id && <Check className="h-3.5 w-3.5 text-[#FF9933]" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
