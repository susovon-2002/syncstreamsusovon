'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Pencil, Eraser, Circle, Square, Minus, Trash2, Download, StickyNote,
  Palette, Undo, Redo, Sparkles
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

type Tool = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'circle';

const COLORS = [
  '#ffffff', '#ff9933', '#138808', '#3b82f6',
  '#ec4899', '#a855f7', '#eab308', '#ef4444'
];

interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export function CollaborativeWhiteboard({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#ff9933');
  const [brushSize, setBrushSize] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string; x: number; y: number; color: string }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { firestore } = useFirebase();

  // ── Sync strokes with Firestore ──────────────────────────────────────────
  useEffect(() => {
    if (!firestore || !roomId || !open) return;
    const wbRef = doc(firestore, 'rooms', roomId, 'whiteboard', 'canvas');
    const unsub = onSnapshot(wbRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.strokes) setStrokes(data.strokes);
        if (data.notes) setNotes(data.notes);
      }
    });
    return () => unsub();
  }, [firestore, roomId, open]);

  // ── Draw all strokes on canvas ───────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark grid background
    ctx.fillStyle = '#091121';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Render strokes
    strokes.forEach((s) => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.tool === 'eraser' ? '#091121' : s.color;
      ctx.lineWidth = s.tool === 'eraser' ? s.size * 3 : s.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'pencil' || s.tool === 'eraser') {
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      } else if (s.tool === 'line') {
        ctx.moveTo(s.points[0].x, s.points[0].y);
        ctx.lineTo(s.points[s.points.length - 1].x, s.points[s.points.length - 1].y);
        ctx.stroke();
      } else if (s.tool === 'rectangle') {
        const start = s.points[0];
        const end = s.points[s.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (s.tool === 'circle') {
        const start = s.points[0];
        const end = s.points[s.points.length - 1];
        const radius = Math.hypot(end.x - start.x, end.y - start.y);
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Drawing handlers ─────────────────────────────────────────────────────
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    currentStrokeRef.current = [pt];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current.push(pt);

    // Live preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#091121' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length < 2) return;

    const newStroke: Stroke = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tool,
      color,
      size: brushSize,
      points: [...currentStrokeRef.current],
    };

    const updatedStrokes = [...strokes, newStroke];
    setStrokes(updatedStrokes);
    currentStrokeRef.current = [];

    // Save to Firestore
    if (firestore && roomId) {
      const wbRef = doc(firestore, 'rooms', roomId, 'whiteboard', 'canvas');
      await setDoc(wbRef, { strokes: updatedStrokes, notes }, { merge: true }).catch(() => {});
    }
  };

  const handleClear = async () => {
    setStrokes([]);
    setNotes([]);
    if (firestore && roomId) {
      const wbRef = doc(firestore, 'rooms', roomId, 'whiteboard', 'canvas');
      await setDoc(wbRef, { strokes: [], notes: [] }, { merge: true }).catch(() => {});
    }
  };

  const addStickyNote = async () => {
    const newNote = {
      id: `n_${Date.now()}`,
      text: 'Idea / Note 💡',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 150,
      color: '#fef08a',
    };
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    if (firestore && roomId) {
      const wbRef = doc(firestore, 'rooms', roomId, 'whiteboard', 'canvas');
      await setDoc(wbRef, { strokes, notes: updatedNotes }, { merge: true }).catch(() => {});
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `whiteboard_${roomId}_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full justify-start gap-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold shadow"
        >
          <Pencil className="h-4 w-4 text-amber-400" />
          <span>Live Whiteboard</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl border-0 bg-slate-950/95 text-white p-4 shadow-2xl z-[100] rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2 tricolor-text">
            <Sparkles className="h-4 w-4 text-[#ff9933]" /> Collaborative Live Whiteboard
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadCanvas}
              className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-1 text-slate-300"
            >
              <Download className="h-3.5 w-3.5" /> Export Sketch
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 bg-slate-900/80 rounded-xl border border-white/10 text-xs">
          {/* Tools */}
          <div className="flex items-center gap-1">
            {[
              { id: 'pencil', icon: Pencil, label: 'Pencil' },
              { id: 'line', icon: Minus, label: 'Line' },
              { id: 'rectangle', icon: Square, label: 'Rect' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as Tool)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  tool === t.id
                    ? 'bg-[#ff9933]/20 border border-[#ff9933]/50 text-[#ff9933]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={t.label}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px]">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-slate-400" />
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pencil'); }}
                className={`h-5 w-5 rounded-full border transition-transform ${
                  color === c && tool !== 'eraser' ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Brush Size Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-[#ff9933] cursor-pointer"
            />
            <span className="text-[10px] text-slate-300 w-4 font-mono">{brushSize}</span>
          </div>

          {/* Add Sticky Note */}
          <Button
            size="sm"
            onClick={addStickyNote}
            className="h-7 text-[11px] bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 gap-1 font-bold"
          >
            <StickyNote className="h-3 w-3" /> Note
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900 touch-none">
          <canvas
            ref={canvasRef}
            width={850}
            height={480}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-[400px] cursor-crosshair block"
          />

          {/* Render Sticky Notes over canvas */}
          {notes.map((n) => (
            <div
              key={n.id}
              style={{ left: `${n.x}px`, top: `${n.y}px` }}
              className="absolute p-3 rounded-lg text-slate-950 font-medium text-xs shadow-xl w-36 border border-yellow-400 bg-yellow-200 backdrop-blur"
            >
              <textarea
                value={n.text}
                onChange={(e) => {
                  const updated = notes.map((nt) => (nt.id === n.id ? { ...nt, text: e.target.value } : nt));
                  setNotes(updated);
                }}
                className="w-full h-16 bg-transparent resize-none focus:outline-none text-xs text-slate-900 font-medium"
              />
              <button
                onClick={() => setNotes(notes.filter((nt) => nt.id !== n.id))}
                className="absolute top-1 right-1 text-slate-500 hover:text-slate-900 text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
