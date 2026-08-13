'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '../ui/label';
import { Film, Monitor, UploadCloud, Play } from 'lucide-react';

interface AddMediaTabsProps {
  onUrlSelect: (url: string | MediaStream, title: string, source: 'youtube' | 'file' | 'screen') => void;
}

export function AddMediaTabs({ onUrlSelect }: AddMediaTabsProps) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const isYoutubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    const source = isYoutubeUrl(url) ? 'youtube' : 'file';
    const title = url.split('/').pop() || 'Direct Media';
    onUrlSelect(url, title, source);
  };
  
  const handleShareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      onUrlSelect(stream, "Screen Share", 'screen');
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      onUrlSelect(fileUrl, file.name, 'file');
    }
  };

  return (
    <div className="w-full glass-panel border-white/15 bg-slate-900/90 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl p-6 border">
      {/* Indian Tricolor Decorative Top Bar */}
      <div className="h-1.5 w-[calc(100%+3rem)] bg-gradient-to-r from-[#ff9933] via-white to-[#138808] -mt-6 -mx-6 mb-6" />

      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-950/80 border border-white/10 p-1 rounded-xl h-12">
          <TabsTrigger 
            value="url" 
            className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff9933] data-[state=active]:to-[#ff7700] data-[state=active]:text-slate-950 data-[state=active]:font-extrabold text-slate-300 transition-all text-xs sm:text-sm"
          >
            <Film className="h-4 w-4" />
            <span>From URL</span>
          </TabsTrigger>
          <TabsTrigger 
            value="screen"
            className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff9933] data-[state=active]:to-[#ff7700] data-[state=active]:text-slate-950 data-[state=active]:font-extrabold text-slate-300 transition-all text-xs sm:text-sm"
          >
            <Monitor className="h-4 w-4" />
            <span>Share Screen</span>
          </TabsTrigger>
          <TabsTrigger 
            value="upload"
            className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff9933] data-[state=active]:to-[#ff7700] data-[state=active]:text-slate-950 data-[state=active]:font-extrabold text-slate-300 transition-all text-xs sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload File</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-4">
          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pt-2 pb-4">
              <CardTitle className="text-xl font-extrabold tricolor-text tracking-wide flex items-center gap-2">
                <Film className="h-5 w-5 text-[#ff9933]" />
                Add from URL
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Enter a video or audio URL (YouTube, MP4, WebM, MP3) to start watching together.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <form onSubmit={handleAddUrl} className="space-y-4">
                <Input 
                  name="url" 
                  placeholder="https://example.com/video.mp4 or YouTube link" 
                  required 
                  onChange={(e) => setUrl(e.target.value)} 
                  value={url} 
                  className="bg-slate-950/80 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ff9933] focus-visible:border-transparent h-11 text-sm rounded-xl shadow-inner"
                />
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] hover:opacity-95 text-slate-950 font-extrabold text-sm h-12 rounded-xl shadow-xl shadow-[#ff9933]/25 transition-all flex items-center justify-center gap-2 tracking-wide hover:scale-[1.01]"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>Watch Stream</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screen" className="mt-4">
          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pt-2 pb-4">
              <CardTitle className="text-xl font-extrabold tricolor-text tracking-wide flex items-center gap-2">
                <Monitor className="h-5 w-5 text-emerald-400" />
                Share Your Screen
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Share a window, browser tab, or your entire screen with everyone in the room.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <Button 
                onClick={handleShareScreen} 
                className="w-full bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] hover:opacity-95 text-slate-950 font-extrabold text-sm h-12 rounded-xl shadow-xl shadow-[#ff9933]/25 transition-all flex items-center justify-center gap-2 tracking-wide hover:scale-[1.01]"
              >
                <Monitor className="h-5 w-5 text-slate-950" />
                <span>Start Screen Share</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pt-2 pb-4">
              <CardTitle className="text-xl font-extrabold tricolor-text tracking-wide flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-sky-400" />
                Upload File
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Upload your own local video or audio file to play in the room.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <Label 
                    htmlFor="dropzone-file" 
                    className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-[#ff9933]/40 bg-slate-950/60 hover:bg-slate-950/90 hover:border-[#ff9933] rounded-xl cursor-pointer transition-all shadow-inner"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                      <UploadCloud className="w-10 h-10 mb-2 text-[#ff9933] animate-bounce" />
                      {file ? (
                        <p className="font-bold text-sm text-emerald-400">{file.name}</p>
                      ) : (
                        <>
                          <p className="mb-1 text-sm text-slate-200">
                            <span className="font-bold text-[#ff9933]">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-400">MP4, WEBM, MOV, MP3, WAV</p>
                        </>
                      )}
                    </div>
                    <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                  </Label>
                </div>
                <Button 
                  type="submit" 
                  disabled={!file} 
                  className="w-full bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] hover:opacity-95 text-slate-950 font-extrabold text-sm h-12 rounded-xl shadow-xl shadow-[#ff9933]/25 transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-40 hover:scale-[1.01]"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>Upload and Play</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
