'use client';

import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Crown, Send, Video, VideoOff, Smile, Paperclip, Image as ImageIcon, 
  FileText, FileSpreadsheet, FileCode, FileArchive, File as FileIcon, 
  X, Download, ExternalLink, Loader2, ChevronLeft, ChevronRight, Eye, Plus, Sparkles,
  Search, Trash2, Clock, Eye as EyeIcon, EyeOff, MoreVertical, Timer, Filter, Monitor, SlidersHorizontal
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useFirebase } from '@/firebase';
import { useCollection, useDoc } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, limit, doc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AttendanceExporter } from './attendance-exporter';
import { ParticipantMediaManagerModal } from './participant-media-manager-modal';
import { RoomPolls } from './room-polls';
import { DJSoundboard } from './dj-soundboard';
import { VoiceNoteRecorder } from './voice-note-recorder';
import { RoomThemeSelector } from './room-theme-selector';
import { CollaborativeWhiteboard } from './collaborative-whiteboard';
import { LeaveLogsViewer } from './leave-logs-viewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Dynamically import EmojiPicker to prevent SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export interface ChatAttachment {
  id?: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  size?: string;
  mimeType?: string;
}

// Failsafe Error Boundary for EmojiPicker network/fetch errors
interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class EmojiErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("EmojiPicker encountered network fetch error, switching to native fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Built-in offline native emoji picker fallback
const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'] },
  { name: 'Hands & People', emojis: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '🤙', '🖐️', '✋', '👌', '<ctrl42>', '👈', '👉', '👆', '👇', '☝️', '💪', '🖕', '✍️', '🙋', '🙆', '🙅', '🤷', '🤦'] },
  { name: 'Hearts & Reaction', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '🌟', '⭐', '💥', '💯', '💢', '💬', '💭'] },
  { name: 'Objects & Symbols', emojis: ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🚀', '💡', '🔔', '📌', '📍', '🔑', '🔒', '❤️‍🔥', '⚠️', '✅', '❌', '➡️', '⬅️', '⬆️', '⬇️'] }
];

function NativeEmojiFallback({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  const currentCategory = EMOJI_CATEGORIES[activeCategory];
  const filteredEmojis = search.trim() 
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : currentCategory.emojis;

  return (
    <div className="w-[300px] bg-slate-900 border border-white/20 rounded-xl p-3 shadow-2xl space-y-2.5">
      <Input 
        placeholder="Search emojis..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs bg-slate-950/70 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-[#ff9933]"
      />
      
      {!search.trim() && (
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-white/10 text-xs scrollbar-none">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === idx ? 'bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="h-44 overflow-y-auto grid grid-cols-7 gap-1 p-1 scrollbar-thin">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onEmojiClick({ emoji })}
            className="h-8 w-8 flex items-center justify-center text-lg hover:bg-slate-800 rounded transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ roomId }: { roomId: string }) {
  const { firestore, user } = useFirebase();
  const [newMessage, setNewMessage] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // WhatsApp Gallery Lightbox state
  const [galleryImages, setGalleryImages] = useState<{ url: string; name: string; size?: string }[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  // WhatsApp Document Viewer state
  const [selectedDocument, setSelectedDocument] = useState<ChatAttachment | null>(null);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomRef = useMemoFirebase(() => doc(firestore, 'rooms', roomId), [firestore, roomId]);
  const { data: room } = useDoc(roomRef);

  const messagesRef = useMemoFirebase(() => collection(firestore, 'rooms', roomId, 'chatMessages'), [firestore, roomId]);
  const messagesQuery = useMemoFirebase(() => query(messagesRef, orderBy('timestamp', 'asc'), limit(50)), [messagesRef]);
  const { data: messages, isLoading: loadingMessages } = useCollection(messagesQuery);
  
  const roomUsersRef = useMemoFirebase(() => collection(firestore, 'rooms', roomId, 'roomUsers'), [firestore, roomId]);
  const { data: participants, isLoading: loadingParticipants } = useCollection(roomUsersRef);

  const isHost = user && room ? room.hostId === user.uid : false;
  const allowParticipantScreenShare = room?.allowParticipantScreenShare !== false;
  const canShareScreen = !!user && (isHost || allowParticipantScreenShare);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert base64 Data URLs to Blob URLs to bypass browser iframe data-URI security blocks
  useEffect(() => {
    if (!selectedDocument?.url) {
      setDocBlobUrl(null);
      setTextContent(null);
      return;
    }

    const url = selectedDocument.url;
    let createdBlobUrl = '';

    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        createdBlobUrl = URL.createObjectURL(blob);
        setDocBlobUrl(createdBlobUrl);

        const ext = selectedDocument.name.split('.').pop()?.toLowerCase() || '';
        if (['txt', 'csv', 'json', 'md', 'js', 'ts', 'html', 'css', 'py', 'xml'].includes(ext) || mime.startsWith('text/')) {
          setTextContent(new TextDecoder().decode(u8arr));
        } else {
          setTextContent(null);
        }
      } catch (err) {
        console.error('Error converting data URL to Blob URL:', err);
        setDocBlobUrl(url);
        setTextContent(null);
      }
    } else {
      setDocBlobUrl(url);
      setTextContent(null);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [selectedDocument]);

  // Canvas image compression for fast delivery & Firestore size compatibility
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(img.src);
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processSelectedFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    const fileArray = Array.from(files);
    const newAttachments: ChatAttachment[] = [];

    for (const file of fileArray) {
      if (file.size > 2.5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 2.5MB size limit and was skipped.`);
        continue;
      }

      try {
        const isImage = file.type.startsWith('image/');
        let fileUrl = '';
        
        if (isImage) {
          fileUrl = await compressImage(file);
        } else {
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
        }

        newAttachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: isImage ? 'image' : 'document',
          url: fileUrl,
          size: formatFileSize(file.size),
          mimeType: file.type,
        });
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSelectedFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const removePendingAttachment = (id?: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleMakeHost = (newHostId: string) => {
    if (!isHost || !user || !room) return;
    const oldHostId = user.uid;

    const updatedMembers = {
      ...room.members,
      [newHostId]: 'host',
      [oldHostId]: 'participant',
    };

    updateDocumentNonBlocking(roomRef, {
      hostId: newHostId,
      members: updatedMembers,
    });
  };

  const [isHandRaised, setIsHandRaised] = useState(false);

  const getUsername = (userId: string, fallbackParticipant?: any) => {
    const pId = userId || fallbackParticipant?.uid || fallbackParticipant?.id;
    const participant = participants?.find(p => p.uid === pId || p.id === pId) || fallbackParticipant;
    let name = participant?.displayName;
    if (!name || name === 'Anonymous' || name.startsWith('Guest_')) {
      if (user && (user.uid === pId || user.uid === userId)) {
        name = user.displayName || user.email?.split('@')[0] || 'Member';
      } else {
        name = participant?.email?.split('@')[0] || 'Member';
      }
    }
    return name.split(' ')[0];
  };

  // ── New Chat Feature State ──────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [deletedForMe, setDeletedForMe] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(`dfm_${roomId}`) || '[]')); } catch { return new Set(); }
  });
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState<number | null>(null);
  const [timerPickerOpen, setTimerPickerOpen] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if ((trimmedMessage || pendingAttachments.length > 0) && user && firestore) {
      const messageData: any = {
        userId: user.uid,
        message: trimmedMessage.slice(0, 1000),
        timestamp: new Date(),
      };

      if (pendingAttachments.length > 0) {
        messageData.attachments = pendingAttachments;
        messageData.attachment = pendingAttachments[0];
      }

      if (viewOnceMode) {
        messageData.viewOnce = true;
        messageData.viewedBy = [];
      }

      if (autoDeleteMinutes) {
        messageData.deleteAt = new Date(Date.now() + autoDeleteMinutes * 60 * 1000);
      }

      addDocumentNonBlocking(messagesRef, messageData);
      setNewMessage('');
      setPendingAttachments([]);
      // reset per-message options after send
      setViewOnceMode(false);
      setAutoDeleteMinutes(null);
    }
  };

  const handleDeleteForMe = (msgId: string) => {
    setDeletedForMe(prev => {
      const updated = new Set(prev);
      updated.add(msgId);
      try { localStorage.setItem(`dfm_${roomId}`, JSON.stringify([...updated])); } catch {}
      return updated;
    });
  };

  const handleDeleteForEveryone = async (msgId: string) => {
    if (!firestore || !roomId) return;
    const msgRef = doc(firestore, 'rooms', roomId, 'messages', msgId);
    setDocumentNonBlocking(msgRef, {
      deletedForAll: true,
      message: '',
      attachments: [],
      attachment: null,
    }, { merge: true });
  };

  const handleMarkViewOnce = async (msgId: string) => {
    if (!user || !firestore) return;
    const msgRef = doc(firestore, 'rooms', roomId, 'messages', msgId);
    await updateDoc(msgRef, { viewedBy: [user.uid] }).catch(() => {});
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prevMessage => prevMessage + emojiData.emoji);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, pendingAttachments]);

  const toggleCamera = async () => {
    if (!user || !firestore) return;
    const currentUser = participants?.find(p => p.uid === user.uid || p.id === user.uid);
    if (currentUser?.cameraBlocked) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', user.uid);
    const newCameraState = !isCameraOn;
    setIsCameraOn(newCameraState);
    setDocumentNonBlocking(userRef, { isCameraOn: newCameraState }, { merge: true });
  };

  const toggleHand = async () => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', user.uid);
    const newHandState = !isHandRaised;
    setIsHandRaised(newHandState);
    setDocumentNonBlocking(userRef, {
      isHandRaised: newHandState,
      handRaisedAt: newHandState ? new Date() : null,
    }, { merge: true });
  };

  const handleLowerHand = (targetUid: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    setDocumentNonBlocking(userRef, { isHandRaised: false, handRaisedAt: null }, { merge: true });
  };

  const handleLowerAllHands = () => {
    if (!firestore || !participants) return;
    participants.filter(p => p.isHandRaised).forEach(p => {
      const uId = p.uid || p.id;
      const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
      setDocumentNonBlocking(userRef, { isHandRaised: false, handRaisedAt: null }, { merge: true });
    });
  };

  const handleRemoveParticipant = async (targetUid: string) => {
    if (!firestore || !roomId || !isHost || !user) return;
    const kickRef = doc(firestore, 'rooms', roomId, 'kickedUsers', targetUid);
    await setDoc(kickRef, { kickedAt: new Date(), kickedBy: user.uid, reason: 'Kicked by room host' }, { merge: true }).catch(() => {});

    const reqRef = doc(firestore, 'rooms', roomId, 'joinRequests', targetUid);
    await setDoc(reqRef, { status: 'denied', kicked: true }, { merge: true }).catch(() => {});

    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    await setDoc(userRef, { isKicked: true, isOnline: false, isCameraOn: false }, { merge: true }).catch(() => {});
    await deleteDoc(userRef).catch(() => {});

    if (roomRef) {
      await updateDoc(roomRef, {
        [`members.${targetUid}`]: deleteField(),
      }).catch(() => {});
    }
  };

  const handleToggleUserCameraBlock = (targetUid: string, blocked: boolean) => {
    if (!firestore || !isHost) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    setDocumentNonBlocking(userRef, blocked ? { cameraBlocked: true, isCameraOn: false } : { cameraBlocked: false }, { merge: true });
  };

  const handleToggleUserMicBlock = (targetUid: string, blocked: boolean) => {
    if (!firestore || !isHost) return;
    const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', targetUid);
    setDocumentNonBlocking(userRef, blocked ? { micBlocked: true, isMicOn: false } : { micBlocked: false }, { merge: true });
  };

  const handleToggleAllCameras = (blocked: boolean) => {
    if (!firestore || !isHost || !participants) return;
    participants.forEach(p => {
      const uId = p.uid || p.id;
      if (uId && uId !== user?.uid) {
        const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
        setDocumentNonBlocking(userRef, blocked ? { cameraBlocked: true, isCameraOn: false } : { cameraBlocked: false }, { merge: true });
      }
    });
    if (roomRef) {
      setDocumentNonBlocking(roomRef, { allCamerasBlocked: blocked }, { merge: true });
    }
  };

  const handleToggleAllMics = (blocked: boolean) => {
    if (!firestore || !isHost || !participants) return;
    participants.forEach(p => {
      const uId = p.uid || p.id;
      if (uId && uId !== user?.uid) {
        const userRef = doc(firestore, 'rooms', roomId, 'roomUsers', uId);
        setDocumentNonBlocking(userRef, blocked ? { micBlocked: true, isMicOn: false } : { micBlocked: false }, { merge: true });
      }
    });
    if (roomRef) {
      setDocumentNonBlocking(roomRef, { allMicsBlocked: blocked }, { merge: true });
    }
  };

  const handleVoiceNoteRecorded = (audioBlob: Blob, durationSeconds: number) => {
    if (!user || !firestore) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const voiceAttachment: ChatAttachment = {
        id: `voice_${Date.now()}`,
        name: `Voice Note (${durationSeconds}s)`,
        type: 'document',
        size: `${Math.round(audioBlob.size / 1024)} KB`,
        url: base64Data,
        mimeType: 'audio/webm',
      };
      addDocumentNonBlocking(messagesRef, {
        userId: user.uid,
        message: '🎙️ Voice Note',
        timestamp: new Date(),
        attachments: [voiceAttachment],
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  useEffect(() => {
    if (user && participants) {
      const currentUser = participants.find(p => p.uid === user.uid || p.id === user.uid);
      if (currentUser) {
        setIsCameraOn(!!currentUser.isCameraOn);
        setIsHandRaised(!!currentUser.isHandRaised);
      }
    }
  }, [user, participants]);

  const getDocumentIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return <FileText className="h-5 w-5 text-sky-400" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return <FileCode className="h-5 w-5 text-amber-400" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className="h-5 w-5 text-purple-400" />;
    return <FileIcon className="h-5 w-5 text-[#ff9933]" />;
  };

  const getFileExtensionPill = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toUpperCase() || 'FILE';
    return <span className="text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30">{ext}</span>;
  };

  // Helper to normalize any attachment object from Firestore
  const normalizeAttachment = (raw: any, fallbackId: string): ChatAttachment => {
    const url = raw?.url || raw?.fileUrl || raw?.src || raw?.dataUrl || raw?.link || '';
    const name = raw?.name || raw?.fileName || raw?.title || 'Attachment';
    let type: 'image' | 'document' = raw?.type;
    
    if (type !== 'image' && type !== 'document') {
      if (url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(name)) {
        type = 'image';
      } else {
        type = 'document';
      }
    }

    return {
      id: raw?.id || fallbackId,
      name,
      type,
      url,
      size: raw?.size || '',
      mimeType: raw?.mimeType || raw?.type || '',
    };
  };

  const openGallery = (imageList: ChatAttachment[], initialIndex: number) => {
    setGalleryImages(imageList.map(img => ({ url: img.url, name: img.name, size: img.size })));
    setGalleryIndex(initialIndex);
  };

  const handleNextGalleryImage = () => {
    setGalleryIndex(prev => (prev + 1) % galleryImages.length);
  };

  const handlePrevGalleryImage = () => {
    setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  // Keyboard navigation for WhatsApp Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (galleryImages.length === 0) return;
      if (e.key === 'ArrowRight') handleNextGalleryImage();
      if (e.key === 'ArrowLeft') handlePrevGalleryImage();
      if (e.key === 'Escape') setGalleryImages([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryImages]);

  return (
    <Card 
      className={`h-full flex flex-col glass-panel border-white/10 bg-slate-900/80 transition-colors shadow-2xl rounded-xl overflow-hidden ${
        isDragging ? 'border-[#ff9933] border-2 bg-[#ff9933]/10' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Indian Tricolor Decorative Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />

      <CardHeader className="pb-3 pt-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-white tracking-wide">Participants</CardTitle>
            {participants && participants.filter(p => p.isHandRaised).length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-extrabold bg-[#FF9933]/20 text-[#FF9933] px-2.5 py-0.5 rounded-full border border-[#FF9933]/40 animate-pulse">
                ✋ {participants.filter(p => p.isHandRaised).length} Raised
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMediaManagerOpen(true)}
                className="h-8 px-2.5 text-xs font-extrabold border-[#ff9933]/50 bg-[#ff9933]/15 text-[#ff9933] hover:bg-[#ff9933]/25 shadow-sm rounded-lg flex items-center gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff9933]" />
                <span>Media Manager</span>
              </Button>
            )}

            {/* Screen Share Button */}
            {canShareScreen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.dispatchEvent(new Event('syncstream:start-screen-share'))}
                      className="h-8 w-8 rounded-full border border-[#ff9933]/40 bg-[#ff9933]/10 text-[#ff9933] transition-all hover:bg-[#ff9933]/20 hover:text-[#ffb366] shadow-[0_0_10px_rgba(255,153,51,0.25)]"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share Screen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Raise Hand Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleHand}
                    className={`h-8 w-8 rounded-full border transition-all ${
                      isHandRaised 
                        ? 'border-[#FF9933] bg-[#FF9933]/20 text-[#FF9933] shadow-[0_0_12px_rgba(255,153,51,0.5)] animate-bounce' 
                        : 'border-white/15 bg-white/5 text-slate-400 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    <span className="text-sm">✋</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isHandRaised ? 'Lower Hand 🖐️' : 'Raise Hand ✋ (Attendance)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Camera Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleCamera}
                    className={`h-8 w-8 rounded-full border transition-all ${
                      isCameraOn 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                        : 'border-white/15 bg-white/5 text-slate-400 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    {isCameraOn ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-slate-400" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <div className="flex items-center gap-3 p-2 px-4 overflow-x-auto border-t border-white/10 bg-slate-950/40">
        {!loadingParticipants && participants?.filter(p => {
          const pId = p.uid || p.id;
          if (!pId) return false;
          if (p.isLeft === true || p.isOnline === false) return false;
          if (room?.members && !(pId in room.members) && pId !== room.hostId) return false;
          return true;
        }).map((p) => {
          const pId = p.uid || p.id;
          const isCurrent = (user ? (pId === user.uid || p.uid === user.uid || p.id === user.uid) : false);
          const nameToDisplay = isCurrent ? 'You' : getUsername(pId, p);
          const initial = nameToDisplay.charAt(0).toUpperCase();

          return (
            <div key={p.id || p.uid} className="flex flex-col items-center gap-1 text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!isHost || isCurrent}>
                  <div className="relative cursor-pointer group">
                    <Avatar className={`h-9 w-9 border-2 transition-colors ${p.isHandRaised ? 'border-[#FF9933] ring-2 ring-[#FF9933]/50' : 'border-white/20 group-hover:border-[#ff9933]'}`}>
                      <AvatarImage src={p.photoURL} />
                      <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">{initial}</AvatarFallback>
                    </Avatar>

                    {/* Raised Hand Badge */}
                    {p.isHandRaised && (
                      <div className="absolute -top-1 -left-1 bg-[#FF9933] rounded-full p-0.5 shadow-[0_0_8px_rgba(255,153,51,0.8)] animate-bounce z-10 text-[10px]" title="Hand Raised for Attendance">
                        ✋
                      </div>
                    )}

                    {/* Host Crown */}
                    {room?.hostId === pId && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#ff9933] to-[#ff7700] rounded-full p-0.5 shadow z-10">
                        <Crown className="h-3 w-3 text-slate-950" />
                      </div>
                    )}
                    {(p.cameraBlocked || p.micBlocked) && (
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-black text-white shadow z-10">
                        {p.cameraBlocked && p.micBlocked ? 'A/V' : p.cameraBlocked ? 'CAM' : 'MIC'}
                      </div>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-slate-700 text-white text-xs">
                  <DropdownMenuItem onClick={() => handleMakeHost(pId)} className="hover:bg-slate-800 cursor-pointer">
                    Make Host
                  </DropdownMenuItem>
                  {p.isHandRaised && (
                    <DropdownMenuItem onClick={() => handleLowerHand(pId)} className="hover:bg-slate-800 cursor-pointer text-[#FF9933]">
                      Lower Hand 🖐️
                    </DropdownMenuItem>
                  )}
                  {isHost && !isCurrent && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleToggleUserCameraBlock(pId, !p.cameraBlocked)}
                        className="hover:bg-slate-800 cursor-pointer text-sky-400 font-bold"
                      >
                        {p.cameraBlocked ? 'Enable Camera 📹' : 'Block Camera 📹🚫'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleUserMicBlock(pId, !p.micBlocked)}
                        className="hover:bg-slate-800 cursor-pointer text-amber-400 font-bold"
                      >
                        {p.micBlocked ? 'Unmute Mic 🎤' : 'Mute Mic 🎤🚫'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRemoveParticipant(pId)} className="hover:bg-red-500/10 cursor-pointer text-red-400">
                        Remove from Room ❌
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-xs text-slate-300 w-16 truncate font-medium">{nameToDisplay}</span>
            </div>
          );
        })}
      </div>

      {/* ── Dedicated 3-Column Room Quick Tools Bar ── */}
      <div className="p-2.5 border-t border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF9933] mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[#FF9933]" /> Room Quick Tools
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <DJSoundboard />
          <CollaborativeWhiteboard roomId={roomId} />
          <LeaveLogsViewer roomId={roomId} isHost={isHost} roomRef={roomRef} requireLeaveReason={room?.requireLeaveReason} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <RoomThemeSelector />
          <AttendanceExporter participants={participants || []} roomName={room?.name} hostId={room?.hostId} />
        </div>
      </div>
      
      <Separator className="bg-white/10" />

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {isDragging && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-20 flex flex-col items-center justify-center border-2 border-dashed border-[#ff9933] m-2 rounded-lg pointer-events-none">
            <ImageIcon className="h-10 w-10 text-[#ff9933] animate-bounce mb-2" />
            <p className="text-sm font-bold text-white">Drop photos or documents here to send</p>
          </div>
        )}

        {/* Live Chat Header */}
        <div className="p-3 px-4 flex items-center justify-between border-b border-white/10 bg-slate-950/20">
          <h3 className="text-base font-bold tricolor-text">Live Chat</h3>
          <div className="flex items-center gap-1.5">
            <RoomPolls roomId={roomId} isHost={isHost} />
            {/* Search Toggle */}
            <button
              onClick={() => { setSearchOpen(o => !o); setSearchQuery(''); setSearchDate(''); }}
              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                searchOpen ? 'bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/40' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Search Messages"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search Panel */}
        {searchOpen && (
          <div className="px-3 py-2 border-b border-white/10 bg-slate-950/60 animate-in fade-in slide-in-from-top-1">
            <div className="flex gap-2 items-center mb-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-8 pr-3 h-8 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff9933]/50"
                />
              </div>
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg bg-slate-900 border border-white/10 text-slate-300 focus:outline-none focus:border-[#ff9933]/50 w-32"
                title="Filter by date"
              />
              {(searchQuery || searchDate) && (
                <button onClick={() => { setSearchQuery(''); setSearchDate(''); }} className="h-7 w-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {(searchQuery || searchDate) && (
              <p className="text-[10px] text-slate-500">Showing filtered results · press Esc to clear</p>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-3">
            {loadingMessages && <p className="text-center text-slate-400 text-xs">Loading chat...</p>}
            {messages?.map((msg) => {
              const isCurrentUser = msg.userId === user?.uid;
              
              // Extract and normalize all attachments safely
              const rawAttachments = Array.isArray(msg.attachments) 
                ? msg.attachments 
                : msg.attachment 
                  ? [msg.attachment] 
                  : [];

              const messageAttachments: ChatAttachment[] = rawAttachments.map((rawItem: any, idx: number) => 
                normalizeAttachment(rawItem, `${msg.id}_${idx}`)
              );

              const images = messageAttachments.filter(a => a.type === 'image' && a.url);
              const documents = messageAttachments.filter(a => a.type === 'document' && a.url);

              // ── Filter deleted / expired messages ──
              if (deletedForMe.has(msg.id)) return null;
              if (msg.deletedForAll) return (
                <div key={msg.id} className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                  <p className="text-[11px] italic text-slate-500 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">🚫 This message was deleted</p>
                </div>
              );
              const deleteAt = msg.deleteAt?.toDate?.() || (msg.deleteAt instanceof Date ? msg.deleteAt : null);
              if (deleteAt && new Date() > deleteAt) return null;

              // ── View-once: hide if already viewed by someone else ──
              const isViewOnce = !!msg.viewOnce;
              const viewedByMe = isViewOnce && Array.isArray(msg.viewedBy) && user && msg.viewedBy.includes(user.uid);
              const viewedByOther = isViewOnce && !isCurrentUser && Array.isArray(msg.viewedBy) && msg.viewedBy.length > 0;
              if (isViewOnce && viewedByOther) return null;

              // ── Search filter ──
              const msgDate = msg.timestamp?.toDate?.() || (msg.timestamp instanceof Date ? msg.timestamp : null);
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (!msg.message?.toLowerCase().includes(q)) return null;
              }
              if (searchDate && msgDate) {
                const d = new Date(searchDate);
                if (msgDate.toDateString() !== d.toDateString()) return null;
              }

              return (
                <div key={msg.id} className={`flex items-start gap-2 group/msg ${isCurrentUser ? 'justify-end' : ''}`}>
                  <div className={`flex flex-col gap-1 max-w-[88%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    
                    {/* View-once badge */}
                    {isViewOnce && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <EyeIcon className="h-2.5 w-2.5" /> View Once
                        </span>
                      </div>
                    )}

                    {/* Auto-delete countdown badge */}
                    {deleteAt && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Timer className="h-2.5 w-2.5" /> Disappears {deleteAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble styling matching Indian Tricolor Theme */}
                    <div className={`relative rounded-2xl px-3.5 py-2.5 space-y-2 shadow-md ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#ff8800] text-slate-950 font-medium shadow-[#ff9933]/15' 
                        : 'bg-gradient-to-r from-[#0a2318] to-[#091b29] border border-emerald-500/30 text-slate-100 shadow-slate-950/50'
                    }`}>
                      
                      {/* WhatsApp Style Image Grid */}
                      {images.length > 0 && (
                        <div className="max-w-xs sm:max-w-sm rounded-lg overflow-hidden border border-white/20 bg-black/30 shadow-inner">
                          {/* 1 Image */}
                          {images.length === 1 && (
                            <div 
                              className="relative group overflow-hidden cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGallery(images, 0);
                              }}
                            >
                              <img
                                src={images[0].url}
                                alt={images[0].name}
                                className="max-h-64 w-full object-cover rounded-md transition-transform duration-200 hover:scale-[1.02]"
                              />
                            </div>
                          )}

                          {/* 2 Images Layout */}
                          {images.length === 2 && (
                            <div className="grid grid-cols-2 gap-0.5">
                              {images.map((img, idx) => (
                                <img
                                  key={img.id || idx}
                                  src={img.url}
                                  alt={img.name}
                                  className="h-36 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGallery(images, idx);
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* 3 Images Layout */}
                          {images.length === 3 && (
                            <div className="grid grid-cols-2 gap-0.5">
                              <img
                                src={images[0].url}
                                alt={images[0].name}
                                className="h-44 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGallery(images, 0);
                                }}
                              />
                              <div className="flex flex-col gap-0.5">
                                {images.slice(1).map((img, idx) => (
                                  <img
                                    key={img.id || idx}
                                    src={img.url}
                                    alt={img.name}
                                    className="h-[86px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openGallery(images, idx + 1);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4+ Images Layout (WhatsApp Grid with +N Overlay) */}
                          {images.length >= 4 && (
                            <div className="grid grid-cols-2 gap-0.5">
                              {images.slice(0, 3).map((img, idx) => (
                                <img
                                  key={img.id || idx}
                                  src={img.url}
                                  alt={img.name}
                                  className="h-28 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGallery(images, idx);
                                  }}
                                />
                              ))}
                              {/* 4th tile with +N overlay if more than 4 */}
                              <div 
                                className="relative h-28 w-full cursor-pointer group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGallery(images, 3);
                                }}
                              >
                                <img
                                  src={images[3].url}
                                  alt={images[3].name}
                                  className="h-full w-full object-cover"
                                />
                                {images.length > 4 ? (
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-xl group-hover:bg-black/70 transition-colors">
                                    +{images.length - 3}
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 group-hover:bg-black/10 transition-colors" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}


                      {/* WhatsApp Style Document / Audio / Video Cards */}
                      {documents.length > 0 && (
                        <div className="space-y-1.5">
                          {documents.map((docItem, idx) => {
                            const mime = docItem.mimeType || '';
                            const isAudio = mime.startsWith('audio/') || docItem.name?.toLowerCase().includes('voice') || docItem.name?.toLowerCase().endsWith('.webm') || docItem.name?.toLowerCase().endsWith('.ogg') || docItem.name?.toLowerCase().endsWith('.mp3') || docItem.name?.toLowerCase().endsWith('.wav');
                            const isVideo = mime.startsWith('video/') || docItem.name?.toLowerCase().endsWith('.mp4') || docItem.name?.toLowerCase().endsWith('.mov');

                            // ── Inline Audio Player ──
                            if (isAudio) {
                              return (
                                <div
                                  key={docItem.id || idx}
                                  className="rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-slate-900/80 shadow-lg max-w-xs"
                                >
                                  {/* Header */}
                                  <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/30 flex-shrink-0">
                                      <span className="text-base">🎙️</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-white truncate">
                                        {docItem.name || 'Voice Note'}
                                      </p>
                                      <p className="text-[10px] text-purple-300 font-medium">
                                        🎵 Voice Note {docItem.size ? `· ${docItem.size}` : ''}
                                      </p>
                                    </div>
                                    <a
                                      href={docItem.url}
                                      download={docItem.name}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                      title="Download"
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  </div>
                                  {/* Waveform visual hint */}
                                  <div className="flex items-center gap-0.5 px-3 pb-1.5 pointer-events-none">
                                    {Array.from({ length: 22 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className="bg-purple-400/60 rounded-full w-1 flex-1"
                                        style={{ height: `${6 + Math.sin(i * 1.3) * 5 + Math.random() * 6}px` }}
                                      />
                                    ))}
                                  </div>
                                  {/* Native audio player */}
                                  <div className="px-3 pb-3">
                                    <audio
                                      controls
                                      src={docItem.url}
                                      className="w-full h-8 rounded-lg"
                                      style={{ accentColor: '#a855f7' }}
                                      preload="metadata"
                                    />
                                  </div>
                                </div>
                              );
                            }

                            // ── Inline Video Player ──
                            if (isVideo) {
                              return (
                                <div
                                  key={docItem.id || idx}
                                  className="rounded-2xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-900/40 to-slate-900/80 shadow-lg max-w-xs"
                                >
                                  {/* Header */}
                                  <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
                                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow flex-shrink-0">
                                      <span className="text-sm">🎬</span>
                                    </div>
                                    <p className="flex-1 text-xs font-bold text-white truncate">
                                      {docItem.name || 'Video Note'}
                                    </p>
                                    <a
                                      href={docItem.url}
                                      download={docItem.name}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                      title="Download"
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  </div>
                                  {/* Native video player */}
                                  <video
                                    controls
                                    src={docItem.url}
                                    className="w-full max-h-48 object-contain bg-black/60"
                                    preload="metadata"
                                  />
                                </div>
                              );
                            }

                            // ── Generic Document Card (fallback) ──
                            return (
                              <div
                                key={docItem.id || idx}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer max-w-xs group shadow-sm ${
                                  isCurrentUser
                                    ? 'bg-slate-950/85 border-slate-950/40 text-white hover:bg-slate-950'
                                    : 'bg-slate-900/90 border-emerald-500/30 text-white hover:bg-slate-850'
                                }`}
                                onClick={(e) => { e.stopPropagation(); setSelectedDocument(docItem); }}
                              >
                                <div className="p-2.5 rounded-lg bg-slate-800 flex-shrink-0 shadow-inner">
                                  {getDocumentIcon(docItem.name, docItem.mimeType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold truncate leading-tight">{docItem.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getFileExtensionPill(docItem.name)}
                                    {docItem.size && (
                                      <span className="text-[10px] opacity-75 font-medium">{docItem.size}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 opacity-85 group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full hover:bg-white/10 text-white"
                                    title="Preview Document"
                                    onClick={(e) => { e.stopPropagation(); setSelectedDocument(docItem); }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <a
                                    href={docItem.url}
                                    download={docItem.name}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
                                    title="Download Document"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Text Message */}
                      {msg.message && (
                        viewedByMe || viewedByOther ? (
                          <p className="text-[11px] italic text-slate-500">👁️ Viewed once — content hidden</p>
                        ) : (
                          <p className={`text-sm break-words whitespace-pre-wrap leading-relaxed ${
                            isCurrentUser ? 'text-slate-950 font-medium' : 'text-slate-100'
                          }`}>
                            {msg.message}
                          </p>
                        )
                      )}

                      {/* View-once read button for receiver */}
                      {isViewOnce && !isCurrentUser && !viewedByOther && (
                        <button
                          onClick={() => handleMarkViewOnce(msg.id)}
                          className="mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full hover:bg-amber-500/20 transition-colors"
                        >
                          👁️ Tap to View (Once)
                        </button>
                      )}

                      {/* Message 3-dot Context Menu */}
                      <div className="absolute -top-3 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-6 w-6 rounded-full bg-slate-800/90 border border-white/15 flex items-center justify-center hover:bg-slate-700 shadow-lg">
                              <MoreVertical className="h-3 w-3 text-white" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isCurrentUser ? 'end' : 'start'} className="bg-slate-900/95 border-slate-700 text-white text-xs min-w-[150px] z-50 backdrop-blur-xl rounded-xl shadow-2xl p-1">
                            <DropdownMenuItem
                              onClick={() => handleDeleteForMe(msg.id)}
                              className="gap-2 py-2 px-3 cursor-pointer hover:bg-slate-800 rounded-lg text-slate-200"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                              Delete for Me
                            </DropdownMenuItem>
                            {(isCurrentUser || isHost) && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteForEveryone(msg.id)}
                                className="gap-2 py-2 px-3 cursor-pointer hover:bg-red-500/10 rounded-lg text-red-400 font-semibold"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete for Everyone
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => { const t = msg.timestamp?.toDate?.() || msg.timestamp; if (t) setSearchDate(new Date(t).toISOString().slice(0, 10)); setSearchOpen(true); }}
                              className="gap-2 py-2 px-3 cursor-pointer hover:bg-slate-800 rounded-lg text-slate-400"
                            >
                              <Filter className="h-3.5 w-3.5" />
                              Find by Date
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium px-1.5">{getUsername(msg.userId)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* WhatsApp Style Pending Attachment Tray */}
        {pendingAttachments.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-950/90 backdrop-blur border-t border-[#ff9933]/30 space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>{pendingAttachments.length} file{pendingAttachments.length > 1 ? 's' : ''} attached</span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-rose-400 hover:text-rose-300 p-0"
                onClick={() => setPendingAttachments([])}
              >
                Clear all
              </Button>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {pendingAttachments.map((att) => (
                <div 
                  key={att.id} 
                  className="relative group flex-shrink-0 flex items-center gap-2 p-1.5 pr-6 rounded-md bg-slate-900 border border-white/15 max-w-[170px]"
                >
                  {att.type === 'image' ? (
                    <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0 border border-white/20">
                      <img src={att.url} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded bg-slate-800 flex-shrink-0">
                      {getDocumentIcon(att.name, att.mimeType)}
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white truncate">{att.name}</p>
                    <p className="text-[9px] text-slate-400">{att.size}</p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-white"
                    onClick={() => removePendingAttachment(att.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {/* Add More Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 border-dashed border-[#ff9933]/50 text-[#ff9933] hover:bg-[#ff9933]/10 text-xs gap-1 flex-shrink-0"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('accept');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add file</span>
              </Button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          {/* Hidden File Input supporting multiple files */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.zip,.rar"
            className="hidden"
          />

          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            {/* Attachment Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  disabled={!user || isProcessingFiles}
                  title="Attach Photos or Documents"
                  className="text-slate-300 hover:text-[#ff9933] hover:bg-slate-800"
                >
                  {isProcessingFiles ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#ff9933]" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 z-50 bg-slate-900 border-slate-700 text-white">
                <DropdownMenuItem 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                  }} 
                  className="gap-2.5 cursor-pointer py-2 hover:bg-slate-800"
                >
                  <ImageIcon className="h-4 w-4 text-sky-400" />
                  <div className="flex flex-col">
                    <span className="font-medium">Photos & Videos</span>
                    <span className="text-[10px] text-slate-400">Multiple images supported</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = ".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.zip,.rar";
                      fileInputRef.current.click();
                    }
                  }} 
                  className="gap-2.5 cursor-pointer py-2 hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="font-medium">Documents</span>
                    <span className="text-[10px] text-slate-400">PDFs, Office docs, archives</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Voice Note Recorder Button */}
            <VoiceNoteRecorder onVoiceNoteRecorded={handleVoiceNoteRecorded} />

            {/* View-Once Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewOnceMode(v => !v)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                      viewOnceMode
                        ? 'border-amber-500/60 bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'border-white/15 bg-white/5 text-slate-400 hover:text-amber-400 hover:border-amber-500/40'
                    }`}
                    title={viewOnceMode ? 'View Once ON — click to disable' : 'Enable View Once'}
                  >
                    {viewOnceMode ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{viewOnceMode ? '👁️ View Once: ON' : 'View Once (tap to enable)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Auto-Delete Timer Picker */}
            <Popover open={timerPickerOpen} onOpenChange={setTimerPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                    autoDeleteMinutes
                      ? 'border-red-500/60 bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                      : 'border-white/15 bg-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/40'
                  }`}
                  title="Auto-Delete Timer"
                >
                  <Timer className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-3 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl text-white">
                <div className="mb-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5 mb-0.5">
                    <Timer className="h-3 w-3" /> Auto-Delete After
                  </p>
                  <p className="text-[10px] text-slate-500">Message disappears for everyone after send</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Off', val: null },
                    { label: '1 min', val: 1 },
                    { label: '5 min', val: 5 },
                    { label: '15 min', val: 15 },
                    { label: '1 hour', val: 60 },
                    { label: '24 hrs', val: 1440 },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      onClick={() => { setAutoDeleteMinutes(opt.val); setTimerPickerOpen(false); }}
                      className={`text-xs py-1.5 rounded-lg font-bold border transition-all ${
                        autoDeleteMinutes === opt.val
                          ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {autoDeleteMinutes && (
                  <p className="text-[10px] text-red-400 mt-2 text-center">⏳ Next message deletes in {autoDeleteMinutes < 60 ? `${autoDeleteMinutes}m` : `${autoDeleteMinutes/60}h`}</p>
                )}
              </PopoverContent>
            </Popover>

            <Input
              placeholder={user ? "Say something..." : "Joining..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
              className="flex-1 bg-slate-950/70 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-[#ff9933]"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  disabled={!user}
                  className="text-slate-300 hover:text-[#ff9933] hover:bg-slate-800"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0 z-50">
                <EmojiErrorBoundary fallback={<NativeEmojiFallback onEmojiClick={onEmojiClick} />}>
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick} 
                    emojiStyle={"native" as any}
                    theme={"dark" as any}
                  />
                </EmojiErrorBoundary>
              </PopoverContent>
            </Popover>

            <Button 
              type="submit" 
              size="icon" 
              disabled={!user || (!newMessage.trim() && pendingAttachments.length === 0) || isProcessingFiles}
              className="bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] hover:opacity-90 text-slate-950 font-bold shadow-lg shadow-[#ff9933]/20 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>

      {/* WhatsApp Gallery Lightbox Modal */}
      <Dialog open={galleryImages.length > 0} onOpenChange={(open) => !open && setGalleryImages([])}>
        <DialogContent className="max-w-4xl border-0 bg-slate-950/95 text-white p-4 sm:p-6 shadow-2xl z-[100]">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3 truncate max-w-[70%]">
              <DialogTitle className="text-sm sm:text-base font-semibold truncate text-white">
                {galleryImages[galleryIndex]?.name || 'Photo'}
              </DialogTitle>
              <span className="text-xs opacity-60">
                ({galleryIndex + 1} of {galleryImages.length})
              </span>
            </div>

            {galleryImages[galleryIndex] && (
              <a
                href={galleryImages[galleryIndex].url}
                download={galleryImages[galleryIndex].name || 'photo.jpg'}
                className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 font-bold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity shadow"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            )}
          </DialogHeader>

          {/* Main Image Stage */}
          <div className="relative flex items-center justify-center py-4 min-h-[60vh] max-h-[75vh]">
            {galleryImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white bg-black/60 hover:bg-black/80 rounded-full h-10 w-10"
                onClick={handlePrevGalleryImage}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {galleryImages[galleryIndex] && (
              <img
                src={galleryImages[galleryIndex].url}
                alt={galleryImages[galleryIndex].name}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-200 border border-white/10"
              />
            )}

            {galleryImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white bg-black/60 hover:bg-black/80 rounded-full h-10 w-10"
                onClick={handleNextGalleryImage}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Thumbnail Strip for Multi-Image Set */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto pt-2 border-t border-white/10">
              {galleryImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`h-12 w-12 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                    idx === galleryIndex ? 'border-[#ff9933] scale-105 shadow-md shadow-[#ff9933]/30' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Document Viewer Modal */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl border border-white/15 bg-slate-950/95 text-white p-4 sm:p-6 z-[100] shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded bg-slate-900 border border-white/10">
                {selectedDocument && getDocumentIcon(selectedDocument.name, selectedDocument.mimeType)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-white truncate">
                  {selectedDocument?.name}
                </DialogTitle>
                {selectedDocument?.size && (
                  <p className="text-xs text-slate-400">{selectedDocument.size}</p>
                )}
              </div>
            </div>

            {selectedDocument && (docBlobUrl || selectedDocument.url) && (
              <a
                href={docBlobUrl || selectedDocument.url}
                download={selectedDocument.name}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 px-3.5 py-2 rounded-md hover:opacity-90 transition-opacity flex-shrink-0 shadow"
              >
                <Download className="h-4 w-4" />
                <span>Download Document</span>
              </a>
            )}
          </DialogHeader>

          {/* Inline Document Preview Body using Blob URL */}
          <div className="py-2">
            {(selectedDocument?.mimeType?.includes('pdf') || selectedDocument?.name?.toLowerCase().endsWith('.pdf')) && docBlobUrl ? (
              <object
                data={docBlobUrl}
                type="application/pdf"
                className="w-full h-[68vh] rounded-md border border-white/15 bg-white"
              >
                <iframe
                  src={docBlobUrl}
                  title={selectedDocument.name}
                  className="w-full h-[68vh] rounded-md border border-white/15 bg-white"
                />
              </object>
            ) : textContent !== null ? (
              <div className="w-full h-[65vh] overflow-auto p-4 rounded-md border border-white/15 bg-slate-900/80 font-mono text-xs text-slate-200 whitespace-pre-wrap select-text">
                {textContent}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg bg-slate-900/60 border border-dashed border-white/15 min-h-[40vh]">
                <div className="p-4 rounded-full bg-slate-800 border border-white/10 shadow-md">
                  {selectedDocument && getDocumentIcon(selectedDocument.name, selectedDocument.mimeType)}
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="font-semibold text-base text-white">{selectedDocument?.name}</h4>
                  <p className="text-xs text-slate-400">
                    This document format can be opened on your computer or device once downloaded.
                  </p>
                </div>
                {docBlobUrl && (
                  <a
                    href={docBlobUrl}
                    download={selectedDocument?.name}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] text-slate-950 px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download File ({selectedDocument?.size})</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Participant Media Manager Modal */}
      <ParticipantMediaManagerModal
        open={isMediaManagerOpen}
        onOpenChange={setIsMediaManagerOpen}
        roomId={roomId}
        participants={participants || []}
        isHost={isHost}
        roomState={room}
      />
    </Card>
  );
}
