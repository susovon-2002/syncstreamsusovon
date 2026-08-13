'use client';

import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Vote, Plus, CheckCircle2, BarChart2, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PollOption {
  id: number;
  text: string;
  votes: string[]; // List of user IDs who voted for this option
}

interface Poll {
  id: string;
  question: string;
  createdBy: string;
  createdByName: string;
  options: PollOption[];
  createdAt: any;
  active: boolean;
}

interface RoomPollsProps {
  roomId: string;
  isHost: boolean;
}

export function RoomPolls({ roomId, isHost }: RoomPollsProps) {
  const { firestore, user } = useFirebase();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const { toast } = useToast();

  // Listen to room polls in real-time
  useEffect(() => {
    if (!firestore || !roomId) return;

    const pollsRef = collection(firestore, 'rooms', roomId, 'polls');
    const q = query(pollsRef, orderBy('createdAt', 'desc'), limit(5));

    const unsub = onSnapshot(pollsRef, (snap) => {
      const pList: Poll[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
      setPolls(pList);
    });

    return () => unsub();
  }, [firestore, roomId]);

  const activePoll = polls.find((p) => p.active !== false);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !firestore || !user || !roomId) return;

    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      toast({
        variant: 'destructive',
        title: 'At least 2 options required',
        description: 'Please add at least two choices for your poll.',
      });
      return;
    }

    const pollData = {
      question: question.trim(),
      createdBy: user.uid,
      createdByName: user.displayName?.split(' ')[0] || 'Host',
      options: validOptions.map((optText, index) => ({
        id: index,
        text: optText,
        votes: [],
      })),
      active: true,
      createdAt: serverTimestamp(),
    };

    const pollsRef = collection(firestore, 'rooms', roomId, 'polls');
    await addDoc(pollsRef, pollData);

    setQuestion('');
    setOptions(['', '']);
    setIsDialogOpen(false);

    toast({
      title: 'Poll Created! 🗳️',
      description: 'Room participants can now vote live.',
    });
  };

  const handleVote = async (poll: Poll, optionId: number) => {
    if (!firestore || !user || !roomId) return;

    // Remove user's previous vote from any option and add to selected option
    const updatedOptions = poll.options.map((opt) => {
      const filteredVotes = opt.votes.filter((uid) => uid !== user.uid);
      if (opt.id === optionId) {
        return { ...opt, votes: [...filteredVotes, user.uid] };
      }
      return { ...opt, votes: filteredVotes };
    });

    const pollRef = doc(firestore, 'rooms', roomId, 'polls', poll.id);
    await updateDoc(pollRef, { options: updatedOptions });
  };

  const handleClosePoll = async (pollId: string) => {
    if (!firestore || !roomId) return;
    const pollRef = doc(firestore, 'rooms', roomId, 'polls', pollId);
    await updateDoc(pollRef, { active: false });
  };

  // Calculate total votes
  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  };

  return (
    <div className="w-full">
      {/* ── Active Poll Display ── */}
      {activePoll ? (
        <Card className="border border-[#FF9933]/40 bg-[#061126]/90 shadow-xl backdrop-blur-xl rounded-xl overflow-hidden mb-3">
          <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#FF9933]" />
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">
                Live Room Poll
              </CardTitle>
            </div>
            {isHost && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleClosePoll(activePoll.id)}
                className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
              >
                End Poll
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2.5">
            <p className="text-sm font-bold text-white">{activePoll.question}</p>

            {/* Options List */}
            <div className="space-y-2">
              {activePoll.options.map((opt) => {
                const totalVotes = getTotalVotes(activePoll);
                const voteCount = opt.votes?.length || 0;
                const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const hasVotedThis = user ? opt.votes?.includes(user.uid) : false;

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(activePoll, opt.id)}
                    className={`relative w-full text-left p-2.5 rounded-lg border transition-all overflow-hidden ${
                      hasVotedThis
                        ? 'border-[#FF9933] bg-[#FF9933]/15'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Animated Progress Bar Fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF9933]/30 to-[#138808]/30 transition-all duration-500 rounded-lg"
                      style={{ width: `${percent}%` }}
                    />

                    <div className="relative flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        {hasVotedThis && <CheckCircle2 className="h-3.5 w-3.5 text-[#FF9933]" />}
                        {opt.text}
                      </span>
                      <span className="font-extrabold text-[#FF9933]">
                        {percent}% ({voteCount})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 text-right">
              Total votes: {getTotalVotes(activePoll)} • Click any option to vote
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Host Create Poll Dialog Trigger ── */}
      {isHost && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-bold border-[#FF9933]/40 text-[#FF9933] hover:bg-[#FF9933]/20 gap-1"
            >
              <Vote className="h-3.5 w-3.5" /> Launch Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#061126] border-white/20 text-white max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="tricolor-text text-xl font-bold flex items-center gap-2">
                <Vote className="h-5 w-5 text-[#FF9933]" /> Create Live Room Poll
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreatePoll} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Poll Question</label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which movie should we watch next?"
                  className="bg-white/10 border-white/15 text-sm text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Poll Choices</label>
                {options.map((opt, idx) => (
                  <Input
                    key={idx}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="bg-white/10 border-white/15 text-xs text-white"
                    required={idx < 2}
                  />
                ))}

                {options.length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOption}
                    className="text-xs text-[#FF9933] hover:bg-[#FF9933]/10 gap-1 p-0 h-auto"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Choice
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808] font-bold text-slate-950 shadow-lg"
              >
                Launch Poll to Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
