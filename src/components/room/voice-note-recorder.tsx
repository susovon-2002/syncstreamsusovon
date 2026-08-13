'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, Loader2, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceNoteRecorderProps {
  onVoiceNoteRecorded: (audioBlob: Blob, durationSeconds: number) => void;
}

export function VoiceNoteRecorder({ onVoiceNoteRecorded }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          onVoiceNoteRecorded(audioBlob, recordingTime || 1);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Microphone Permission Required',
        description: 'Please allow microphone access in your browser to record voice notes.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div>
      {!isRecording ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={startRecording}
          title="Record Voice Note"
          className="h-9 w-9 text-slate-400 hover:text-[#FF9933] hover:bg-white/10 rounded-full transition-transform active:scale-95"
        >
          <Mic className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={stopRecording}
          className="h-8 px-2.5 bg-red-600 hover:bg-red-700 font-bold text-xs gap-1.5 animate-pulse rounded-full shadow-lg"
          title="Stop & Send Voice Note"
        >
          <Square className="h-3 w-3 fill-white" />
          <span>{recordingTime}s (Stop & Send)</span>
        </Button>
      )}
    </div>
  );
}
