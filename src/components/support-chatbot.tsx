'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, MessageSquare, X, Send, Sparkles, RefreshCw, ChevronDown, 
  HelpCircle, ShieldCheck, PlayCircle, Lock, Mail, Users, CheckCircle2, User, GripHorizontal
} from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  quickReplies?: string[];
}

const QUICK_QUESTIONS = [
  '🚀 How do I create a watch room?',
  '🔐 How does room entry approval work?',
  '📁 What video formats are supported?',
  '🔑 Password rules & account help',
  '📧 How do I contact human support?',
];

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: "Namaste! 🙏 I am your **SyncStream Assistant**. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: QUICK_QUESTIONS,
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set default position near bottom right on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && position === null) {
      const defaultX = window.innerWidth - (window.innerWidth < 640 ? 210 : 240);
      const defaultY = window.innerHeight - 90;
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [position]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    hasMovedRef.current = true;
    const newX = Math.max(10, Math.min(window.innerWidth - 180, e.clientX - dragStartRef.current.x));
    const newY = Math.max(10, Math.min(window.innerHeight - 90, e.clientY - dragStartRef.current.y));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleButtonClick = () => {
    // Only toggle if user didn't drag the button across the screen
    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // Intelligent Knowledge Base Answer Generator
  const generateAgentResponse = (userText: string): { response: string; quickReplies?: string[] } => {
    const query = userText.toLowerCase();

    if (query.includes('create') || query.includes('room') || query.includes('start') || query.includes('host')) {
      return {
        response: `To create a watch room on **SyncStream**:
1. Go to the Home Page.
2. Enter an optional **Room Name** (e.g. *"Movie Night"* or *"React Study Group"*).
3. Click **"CREATE ROOM"**.
4. Share the generated **Room ID** or click the **WhatsApp button** to invite your friends!

Hosts have exclusive controls to pause, play, change videos, and approve new members! 🎬`,
        quickReplies: ['🔐 How does approval work?', '📁 Supported video formats?', '🏠 Back to start']
      };
    }

    if (query.includes('approval') || query.includes('meet') || query.includes('join') || query.includes('allow') || query.includes('deny') || query.includes('permission') || query.includes('waiting')) {
      return {
        response: `🔒 **Host Room Entry Approval**:
- When a new participant clicks a room link, they are placed in a **Waiting Room**.
- The **Room Host** receives an instant floating notification popup with **Allow** and **Deny** buttons.
- Once the host clicks **"Allow"**, the participant enters the room automatically!
- This keeps your watch parties private, safe, and free from unwanted guests.`,
        quickReplies: ['🚀 How do I create a room?', '📧 Contact support']
      };
    }

    if (query.includes('format') || query.includes('video') || query.includes('link') || query.includes('mp4') || query.includes('url') || query.includes('play')) {
      return {
        response: `📺 **Supported Media & Direct URLs**:
- **Direct Video Links**: Direct \`.mp4\`, \`.mkv\`, \`.webm\`, \`.m3u8\` URLs.
- **Local File Uploads**: Upload videos directly from your device to stream.
- **Screen Share**: Share your browser tab or screen in real-time.
- **Audio Files**: Supports \`.mp3\` & audio streams!

💡 *Tip: External drive links like Google Drive or Dropbox require direct download links to stream in sync.*`,
        quickReplies: ['🚀 How do I create a room?', '💬 Live chat features']
      };
    }

    if (query.includes('password') || query.includes('strength') || query.includes('account') || query.includes('login') || query.includes('signup') || query.includes('name') || query.includes('register')) {
      return {
        response: `🔑 **Account Security & Registration Rules**:
- **Full Name**: Real names only (letters, spaces, hyphens — no numbers or special symbols).
- **Strong Password Requirement**:
  • Minimum 8 characters
  • At least 1 uppercase letter (A-Z)
  • At least 1 lowercase letter (a-z)
  • At least 1 number (0-9)
  • At least 1 special symbol (@#$%^&*!)
- 🇮🇳 Look for the **Indian Tricolor Strength Bar** on sign-up — it glows green when your password is fully secure!`,
        quickReplies: ['🚀 How do I create a room?', '📧 Contact support']
      };
    }

    if (query.includes('contact') || query.includes('email') || query.includes('human') || query.includes('help') || query.includes('support') || query.includes('mail')) {
      return {
        response: `📧 **Need Direct Assistance?**
You can reach our official SyncStream support team at:
👉 **support@syncstream.in**

We answer all user inquiries within **24 to 48 hours**. For immediate help with common features, ask me anything right here!`,
        quickReplies: ['🚀 Create a room', '🔐 Room entry rules', '📁 Media formats']
      };
    }

    if (query.includes('chat') || query.includes('emoji') || query.includes('document') || query.includes('photo') || query.includes('image') || query.includes('attachment')) {
      return {
        response: `💬 **Live Room Chat & File Sharing**:
- Send instant text messages to everyone in the room.
- Attach **Multiple Photos & Documents** (PDFs, TXT, Code files).
- Click any photo or document to open WhatsApp-style fullscreen lightboxes and code viewers!
- Use native emojis with 0 delay.
- Styled in our signature **Indian Tricolor** dark glass theme.`,
        quickReplies: ['🚀 Create a room', '📁 Supported formats']
      };
    }

    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('namaste')) {
      return {
        response: `Namaste! 👋 I'm here to answer any questions about SyncStream watch rooms, video sync, room entry security, or account help. How can I assist you?`,
        quickReplies: QUICK_QUESTIONS
      };
    }

    // Default Fallback
    return {
      response: `Thank you for your question! SyncStream allows you to watch videos with friends in perfect sync, chat in real-time, and manage private rooms with host approvals.

If you need further help, feel free to email our team directly at **support@syncstream.in**!`,
      quickReplies: QUICK_QUESTIONS
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const { response, quickReplies } = generateAgentResponse(query);
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies,
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'agent',
        text: "Chat reset! How can I assist you with SyncStream today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: QUICK_QUESTIONS,
      },
    ]);
  };

  return (
    <div
      style={
        position
          ? {
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 9999,
            }
          : undefined
      }
      className={`fixed ${!position ? 'bottom-5 right-5 z-50' : ''} flex flex-col items-end touch-none select-none`}
    >
      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[400px] h-[520px] rounded-2xl border border-white/20 bg-[#061126]/95 text-white shadow-[0_20px_60px_rgb(0_0_0_/_0.5)] backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header with Drag Handle & Tricolor Accent */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative cursor-grab active:cursor-grabbing border-b border-white/10 bg-white/5 p-4 flex items-center justify-between"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
            <div className="flex items-center gap-2.5">
              <GripHorizontal className="h-4 w-4 text-slate-400 opacity-60 hover:opacity-100" />
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#FF9933] to-[#138808] p-0.5 flex items-center justify-center shadow-[0_0_12px_rgb(255_153_51_/_0.4)]">
                  <div className="h-full w-full rounded-full bg-[#061126] flex items-center justify-center">
                    <Bot className="h-4.5 w-4.5 text-[#FF9933]" />
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#138808] ring-2 ring-[#061126]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  SyncStream Assistant
                  <Sparkles className="h-3.5 w-3.5 text-[#FF9933]" />
                </h3>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online • Drag anywhere
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleResetChat}
                title="Restart Chat"
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#FF9933] to-[#e68a00] text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-900/90 border border-white/15 text-slate-100 rounded-tl-none backdrop-blur-md'
                  }`}
                >
                  {msg.sender === 'agent' && (
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-[#FF9933]">
                      <Bot className="h-3.5 w-3.5" />
                      SyncStream Agent
                    </div>
                  )}
                  
                  <div className="whitespace-pre-line space-y-1">
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx}>
                        {line.split(/(\*\*.*?\*\*)/).map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    ))}
                  </div>

                  <span
                    className={`block text-[10px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-slate-900/70 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.quickReplies && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.quickReplies.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="text-left text-[11px] font-medium bg-white/5 hover:bg-[#FF9933]/20 border border-white/10 hover:border-[#FF9933]/50 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-full transition-all duration-200 active:scale-95"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-900/60 border border-white/10 p-3 rounded-2xl rounded-tl-none w-fit">
                <Bot className="h-4 w-4 text-[#FF9933] animate-bounce" />
                <span>Agent is thinking</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-ping" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping delay-150" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#138808] animate-ping delay-300" />
                </span>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-3 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about watch rooms, sync, login..."
                className="h-10 bg-white/10 border-white/15 text-xs sm:text-sm text-white placeholder:text-slate-400 focus-visible:ring-[#FF9933]"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputQuery.trim()}
                className="h-10 w-10 shrink-0 bg-gradient-to-r from-[#FF9933] to-[#138808] text-white shadow-md hover:scale-105 transition-transform"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-center text-slate-500 mt-2">
              Powered by SyncStream Support AI • support@syncstream.in
            </p>
          </div>

        </div>
      )}

      {/* ── Draggable Floating Launcher Trigger Button ── */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleButtonClick}
        className={`group relative flex items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-[#FF9933] via-[#FFAA44] to-[#138808] p-3 sm:px-4 sm:py-3 font-bold text-white shadow-[0_10px_30px_rgb(255_153_51_/_0.35)] backdrop-blur-xl transition-transform duration-200 active:scale-95 cursor-grab active:cursor-grabbing ${
          isDragging ? 'scale-105 shadow-[0_15px_40px_rgb(255_153_51_/_0.5)]' : ''
        }`}
        title="Click to open or drag anywhere on screen"
      >
        <GripHorizontal className="h-4 w-4 text-slate-950/60 group-hover:text-slate-950 transition-colors" />
        <div className="relative">
          <Bot className="h-6 w-6 text-slate-950 transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#061126] animate-pulse" />
        </div>
        <span className="hidden sm:inline text-xs font-extrabold tracking-wide uppercase text-slate-950">
          {isOpen ? 'Close Support' : 'Need Support?'}
        </span>
        <Sparkles className="h-4 w-4 text-slate-950 animate-pulse" />
      </button>
    </div>
  );
}
