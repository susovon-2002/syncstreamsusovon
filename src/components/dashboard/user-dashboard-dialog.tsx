'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, FileSpreadsheet, FileCode, FileArchive, File as FileIcon, 
  Image as ImageIcon, Download, Eye, Trash2, Search, Folder, ExternalLink, HardDrive
} from 'lucide-react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import Link from 'next/link';

export interface SavedDocument {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  size?: string;
  mimeType?: string;
  roomId: string;
  roomName: string;
  savedAt: any;
  uploadedBy?: string;
}

interface UserDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDashboardDialog({ open, onOpenChange }: UserDashboardDialogProps) {
  const { firestore, user } = useFirebase();
  const [search, setSearch] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  
  // Document Viewer modal state
  const [viewingDoc, setViewingDoc] = useState<SavedDocument | null>(null);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Fetch saved documents for the current user
  const savedDocsRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, 'users', user.uid, 'savedDocuments') : null,
    [firestore, user]
  );
  const savedDocsQuery = useMemoFirebase(
    () => savedDocsRef ? query(savedDocsRef, orderBy('savedAt', 'desc')) : null,
    [savedDocsRef]
  );
  const { data: rawSavedDocs, isLoading } = useCollection(savedDocsQuery);

  const savedDocs: SavedDocument[] = (rawSavedDocs || []).map((docData: any) => ({
    id: docData.id,
    name: docData.name || 'Attachment',
    type: docData.type || 'document',
    url: docData.url || '',
    size: docData.size || '',
    mimeType: docData.mimeType || '',
    roomId: docData.roomId || 'Unknown',
    roomName: docData.roomName || 'SyncStream Room',
    savedAt: docData.savedAt,
    uploadedBy: docData.uploadedBy || 'You',
  }));

  // Extract unique room list for filtering
  const uniqueRooms = Array.from(
    new Map(savedDocs.map(item => [item.roomId, { id: item.roomId, name: item.roomName }])).values()
  );

  // Convert base64 Data URLs to Blob URLs for safe previewing
  useEffect(() => {
    if (!viewingDoc?.url) {
      setDocBlobUrl(null);
      setTextContent(null);
      return;
    }

    const url = viewingDoc.url;
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

        const ext = viewingDoc.name.split('.').pop()?.toLowerCase() || '';
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
  }, [viewingDoc]);

  const handleDeleteSavedDoc = async (docId: string) => {
    if (!firestore || !user) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'savedDocuments', docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Failed to delete saved document:', err);
    }
  };

  const getDocumentIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return <FileText className="h-5 w-5 text-sky-400" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return <FileCode className="h-5 w-5 text-amber-400" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className="h-5 w-5 text-purple-400" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon className="h-5 w-5 text-[#ff9933]" />;
    return <FileIcon className="h-5 w-5 text-primary" />;
  };

  const filteredDocs = savedDocs.filter(docItem => {
    const matchesSearch = docItem.name.toLowerCase().includes(search.toLowerCase()) || 
                          docItem.roomName.toLowerCase().includes(search.toLowerCase()) ||
                          docItem.roomId.toLowerCase().includes(search.toLowerCase());
    const matchesRoom = selectedRoomFilter === 'all' || docItem.roomId === selectedRoomFilter;
    return matchesSearch && matchesRoom;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border border-white/15 bg-slate-950/95 text-white p-4 sm:p-6 shadow-2xl backdrop-blur-xl z-[100] max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-[#ff9933]" />
            <DialogTitle className="text-xl font-extrabold tricolor-text">
              My Saved Documents & Files
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            Access and manage all photos, PDFs, and documents shared across your SyncStream rooms.
          </DialogDescription>
        </DialogHeader>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 py-3 border-b border-white/10 flex-shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by filename or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-900 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-[#ff9933]"
            />
          </div>

          {/* Room Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedRoomFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRoomFilter === 'all' 
                  ? 'bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 shadow-sm' 
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              All Rooms ({savedDocs.length})
            </button>
            {uniqueRooms.map(rm => (
              <button
                key={rm.id}
                type="button"
                onClick={() => setSelectedRoomFilter(rm.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedRoomFilter === rm.id 
                    ? 'bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 shadow-sm' 
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {rm.name} ({savedDocs.filter(d => d.roomId === rm.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* Saved Documents Grid/List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[40vh] max-h-[55vh] pr-1">
          {isLoading && (
            <p className="text-center text-slate-400 text-xs py-8">Loading your saved documents...</p>
          )}

          {!isLoading && filteredDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-slate-900/40 rounded-xl border border-dashed border-white/10">
              <FileIcon className="h-10 w-10 text-slate-500" />
              <p className="text-slate-300 font-medium text-sm">No saved documents found</p>
              <p className="text-slate-400 text-xs max-w-sm">
                Photos and files shared in live chat rooms will automatically be saved here.
              </p>
            </div>
          )}

          {!isLoading && filteredDocs.map((docItem) => (
            <div 
              key={docItem.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-white/10 hover:border-[#ff9933]/50 transition-all group shadow-sm"
            >
              {/* File Icon / Image Thumbnail */}
              {docItem.type === 'image' && docItem.url ? (
                <div 
                  className="h-12 w-12 rounded-lg overflow-hidden border border-white/15 flex-shrink-0 cursor-pointer"
                  onClick={() => setViewingDoc(docItem)}
                >
                  <img src={docItem.url} alt={docItem.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-800 border border-white/10 flex-shrink-0 shadow-inner">
                  {getDocumentIcon(docItem.name, docItem.mimeType)}
                </div>
              )}

              {/* Info Block */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{docItem.name}</p>
                
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-emerald-500/40 text-emerald-400 font-mono">
                    Room: {docItem.roomName} ({docItem.roomId})
                  </Badge>

                  {docItem.size && (
                    <span className="text-[10px] text-slate-400">{docItem.size}</span>
                  )}
                </div>
              </div>

              {/* Room Navigation Link */}
              <Link 
                href={`/room/${docItem.roomId}`}
                onClick={() => onOpenChange(false)}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#ff9933] hover:underline px-2 py-1 rounded bg-[#ff9933]/10"
                title="Go to Room"
              >
                <span>Go to Room</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Preview Document"
                  onClick={() => setViewingDoc(docItem)}
                >
                  <Eye className="h-4 w-4" />
                </Button>

                <a
                  href={docItem.url}
                  download={docItem.name}
                  className="p-2 rounded-lg bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 font-bold hover:opacity-90 transition-opacity shadow-sm"
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </a>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  title="Remove from Dashboard"
                  onClick={() => handleDeleteSavedDoc(docItem.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span>{filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} saved</span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-white/20 text-white hover:bg-slate-900">
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Embedded Document Preview Modal for Dashboard */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl border border-white/15 bg-slate-950/95 text-white p-4 sm:p-6 z-[120] shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded bg-slate-900 border border-white/10">
                {viewingDoc && getDocumentIcon(viewingDoc.name, viewingDoc.mimeType)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-white truncate">
                  {viewingDoc?.name}
                </DialogTitle>
                <p className="text-xs text-emerald-400 font-mono">Room: {viewingDoc?.roomName} ({viewingDoc?.roomId})</p>
              </div>
            </div>

            {viewingDoc && (docBlobUrl || viewingDoc.url) && (
              <a
                href={docBlobUrl || viewingDoc.url}
                download={viewingDoc.name}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#ff9933] to-[#ff7700] text-slate-950 px-3.5 py-2 rounded-md hover:opacity-90 transition-opacity flex-shrink-0 shadow"
              >
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </a>
            )}
          </DialogHeader>

          {/* Preview Body */}
          <div className="py-2">
            {viewingDoc?.type === 'image' && viewingDoc.url ? (
              <div className="flex items-center justify-center p-2 min-h-[50vh] max-h-[70vh]">
                <img src={viewingDoc.url} alt={viewingDoc.name} className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xl" />
              </div>
            ) : (viewingDoc?.mimeType?.includes('pdf') || viewingDoc?.name?.toLowerCase().endsWith('.pdf')) && docBlobUrl ? (
              <object
                data={docBlobUrl}
                type="application/pdf"
                className="w-full h-[68vh] rounded-md border border-white/15 bg-white"
              >
                <iframe
                  src={docBlobUrl}
                  title={viewingDoc.name}
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
                  {viewingDoc && getDocumentIcon(viewingDoc.name, viewingDoc.mimeType)}
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="font-semibold text-base text-white">{viewingDoc?.name}</h4>
                  <p className="text-xs text-slate-400">
                    This document format can be opened on your computer or device once downloaded.
                  </p>
                </div>
                {docBlobUrl && (
                  <a
                    href={docBlobUrl}
                    download={viewingDoc?.name}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] text-slate-950 px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download File ({viewingDoc?.size})</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
