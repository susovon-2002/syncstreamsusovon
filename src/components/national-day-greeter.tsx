'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// ─── National Day & Festival Definitions ────────────────────────────────────
const NATIONAL_DAYS = [
  // ── Fixed National Days ──────────────────────────────────────────────────
  {
    month: 1, day: 14,
    name: 'Makar Sankranti', nameHindi: 'मकर संक्रांति',
    greetingLine1: '🪁 मकर संक्रांति की शुभकामनाएं!',
    greetingLine2: 'तिल और गुड़ की मिठास से भरा हो आपका जीवन।',
    speechText: `नमस्ते! मकर संक्रांति की आपको और आपके परिवार को हार्दिक शुभकामनाएं। यह पर्व खुशियाँ और मीठे रिश्ते लेकर आए।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! आपका दिन मंगलमय हो। धन्यवाद।`,
    bgGlow: 'from-yellow-500/20 via-orange-500/10 to-amber-500/20',
    particleColors: ['#f59e0b','#f97316','#fbbf24','#ffffff'],
    emoji: '🪁', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 1, day: 23,
    name: 'Parakram Diwas — Netaji Jayanti', nameHindi: 'पराक्रम दिवस — नेताजी जयंती',
    greetingLine1: '🌟 जय हिन्द! नेताजी को शत-शत नमन!',
    greetingLine2: 'नेताजी सुभाष चन्द्र बोस की जयंती पर विनम्र श्रद्धांजलि।',
    speechText: `नमस्ते! जय हिन्द! आज पराक्रम दिवस है, नेताजी सुभाष चन्द्र बोस की जयंती। उनका साहस, त्याग और देशप्रेम हमें सदा प्रेरित करता रहेगा। "तुम मुझे खून दो, मैं तुम्हें आज़ादी दूंगा" — यह नारा आज भी हमारे दिलों में गूंजता है।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! नेताजी को हमारा सलाम। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/30 via-white/10 to-[#138808]/30',
    particleColors: ['#ff9933','#ffffff','#138808','#000080'],
    emoji: '🎖️', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 1, day: 26,
    name: 'Republic Day', nameHindi: 'गणतंत्र दिवस',
    greetingLine1: '🇮🇳 जय हिन्द! गणतंत्र दिवस मुबारक!',
    greetingLine2: 'भारत के संविधान को नमन — लोकतंत्र अमर रहे।',
    speechText: `नमस्ते! जय हिन्द! आज भारत का गणतंत्र दिवस है। इस महान दिन पर सभी देशवासियों को हार्दिक बधाई। हमारे संविधान निर्माताओं को और सभी वीर जवानों को नमन।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! आपका दिन शुभ हो। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/30 via-white/10 to-[#138808]/30',
    particleColors: ['#ff9933','#ffffff','#138808','#000080'],
    emoji: '🇮🇳', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 3, day: 3,
    name: 'Holi', nameHindi: 'होली',
    greetingLine1: '🌈 होली की हार्दिक शुभकामनाएं!',
    greetingLine2: 'रंगों का यह त्योहार आपके जीवन में खुशियाँ भर दे।',
    speechText: `नमस्ते! होली की आपको और आपके पूरे परिवार को रंगीन शुभकामनाएं। यह होली का पर्व आपके जीवन को रंगों से, खुशियों से और प्यार से भर दे। बुराई पर अच्छाई की जीत हो।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! बुरा न मानो होली है! धन्यवाद।`,
    bgGlow: 'from-pink-500/20 via-yellow-500/15 to-green-500/20',
    particleColors: ['#ec4899','#f59e0b','#22c55e','#3b82f6','#a855f7'],
    emoji: '🌈', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 4, day: 13,
    name: 'Baisakhi', nameHindi: 'बैसाखी',
    greetingLine1: '🌾 बैसाखी की शुभकामनाएं!',
    greetingLine2: 'समृद्धि और खुशहाली का यह पर्व आपको मंगलमय करे।',
    speechText: `नमस्ते! बैसाखी पर्व की आपको हार्दिक शुभकामनाएं। यह उत्सव हमारे किसानों और वीर पंजाबियों की शान है। आपके जीवन में सुख और समृद्धि आए।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! आपका दिन मंगलमय हो। धन्यवाद।`,
    bgGlow: 'from-yellow-500/20 via-green-500/15 to-amber-500/20',
    particleColors: ['#f59e0b','#22c55e','#ffffff','#ff9933'],
    emoji: '🌾', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 5, day: 7,
    name: 'Operation Sindoor Day', nameHindi: 'ऑपरेशन सिंदूर दिवस',
    greetingLine1: '⚔️ भारत माता की जय! वीर जवानों को सलाम!',
    greetingLine2: 'ऑपरेशन सिंदूर — भारत की अटूट शक्ति और साहस को नमन।',
    speechText: `नमस्ते! भारत माता की जय! आज ऑपरेशन सिंदूर दिवस है। इस दिन भारत के वीर जवानों ने अदम्य साहस दिखाते हुए, आतंकवाद के खिलाफ कड़ी कार्रवाई की। हमारे वीर सैनिकों के शौर्य और बलिदान को हम नमन करते हैं। भारत हमेशा सुरक्षित रहेगा।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! वंदे मातरम्! हमारे जवान सदा अमर रहें। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/30 via-red-500/15 to-[#138808]/30',
    particleColors: ['#ff9933','#ef4444','#138808','#ffffff'],
    emoji: '⚔️', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 7, day: 26,
    name: 'Kargil Vijay Diwas', nameHindi: 'कारगिल विजय दिवस',
    greetingLine1: '🎖️ कारगिल विजय दिवस — वीर जवानों को सलाम!',
    greetingLine2: 'भारत माता के वीर सपूतों की शहादत को कोटि-कोटि नमन।',
    speechText: `नमस्ते! जय हिन्द! आज कारगिल विजय दिवस है। सन् १९९९ में इस दिन भारत के वीर सैनिकों ने कारगिल की ऊँची पहाड़ियों पर तिरंगा फहराया था। हम उन सभी शहीद जवानों को श्रद्धांजलि अर्पित करते हैं जिन्होंने अपने प्राणों की आहुति दी। आपका बलिदान व्यर्थ नहीं जाएगा।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! वंदे मातरम्! शहीदों को नमन। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/30 via-red-700/20 to-[#138808]/30',
    particleColors: ['#ff9933','#dc2626','#ffffff','#138808'],
    emoji: '🎖️', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 8, day: 9,
    name: 'Raksha Bandhan', nameHindi: 'रक्षा बंधन',
    greetingLine1: '🧵 रक्षा बंधन की शुभकामनाएं!',
    greetingLine2: 'भाई-बहन के पवित्र रिश्ते को समर्पित यह पर्व।',
    speechText: `नमस्ते! रक्षा बंधन की आपको हार्दिक शुभकामनाएं। यह पावन पर्व भाई-बहन के अटूट प्रेम और विश्वास का प्रतीक है। इस रेशमी धागे में बंधा प्यार सदा अमर रहे।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! आपका दिन मंगलमय हो। धन्यवाद।`,
    bgGlow: 'from-pink-500/20 via-yellow-500/15 to-rose-500/20',
    particleColors: ['#ec4899','#f59e0b','#ffffff','#a855f7'],
    emoji: '🧵', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 8, day: 15,
    name: 'Independence Day', nameHindi: 'स्वतंत्रता दिवस',
    greetingLine1: '🇮🇳 भारत माता की जय! स्वतंत्रता दिवस मुबारक!',
    greetingLine2: 'इस पावन पर्व पर हर देशवासी को हार्दिक शुभकामनाएं।',
    speechText: `नमस्ते! भारत माता की जय! आज भारत का स्वतंत्रता दिवस है। इस पावन पर्व पर सभी देशवासियों को हार्दिक शुभकामनाएं। हमारे उन सभी स्वतंत्रता सेनानियों को नमन, जिन्होंने अपना सर्वस्व देश के लिए समर्पित किया।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! वंदे मातरम्! आपका दिन शुभ हो। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/30 via-white/10 to-[#138808]/30',
    particleColors: ['#ff9933','#ffffff','#138808','#000080'],
    emoji: '🇮🇳', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 8, day: 19,
    name: 'Ganesh Chaturthi', nameHindi: 'गणेश चतुर्थी',
    greetingLine1: '🐘 गणपति बप्पा मोरया!',
    greetingLine2: 'विघ्नहर्ता की कृपा से आपके जीवन के सारे संकट दूर हों।',
    speechText: `नमस्ते! गणेश चतुर्थी की आपको हार्दिक शुभकामनाएं। गणपति बप्पा मोरया! भगवान गणेश की कृपा से आपके जीवन में सुख, समृद्धि और बुद्धि का संचार हो। मंगलमूर्ति मोरया!`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! गणपति बप्पा मोरया! अगले बरस तू जल्दी आ। धन्यवाद।`,
    bgGlow: 'from-orange-500/25 via-yellow-500/15 to-red-500/20',
    particleColors: ['#f97316','#f59e0b','#dc2626','#ffffff'],
    emoji: '🐘', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 9, day: 27,
    name: 'Navratri / Durga Puja', nameHindi: 'नवरात्रि — दुर्गा पूजा',
    greetingLine1: '🙏 जय माता दी! नवरात्रि की शुभकामनाएं!',
    greetingLine2: 'माँ दुर्गा की शक्ति और आशीर्वाद सदा आपके साथ रहे।',
    speechText: `नमस्ते! जय माता दी! नवरात्रि और दुर्गा पूजा की आपको हार्दिक शुभकामनाएं। माँ दुर्गा की शक्ति आपको जीवन की हर चुनौती से उबारे। शारदीय नवरात्रि में माँ के नौ रूपों की पूजा हमें शक्ति और भक्ति प्रदान करे।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! जय माता दी! आपका दिन मंगलमय हो। धन्यवाद।`,
    bgGlow: 'from-red-500/25 via-orange-500/20 to-yellow-500/20',
    particleColors: ['#dc2626','#f97316','#f59e0b','#ffffff'],
    emoji: '🌺', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 10, day: 1,
    name: 'Dussehra', nameHindi: 'दशहरा — विजयादशमी',
    greetingLine1: '🏹 दशहरे की हार्दिक शुभकामनाएं!',
    greetingLine2: 'बुराई पर अच्छाई की विजय का यह महापर्व।',
    speechText: `नमस्ते! विजयादशमी और दशहरे की आपको हार्दिक शुभकामनाएं। भगवान राम ने इसी दिन रावण का वध किया था। यह पर्व हमें सिखाता है कि सत्य और धर्म की हमेशा जीत होती है। असत्य का नाश हो, सत्य की जय हो।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! जय श्री राम! आपका दिन शुभ हो। धन्यवाद।`,
    bgGlow: 'from-orange-500/25 via-red-500/20 to-yellow-500/20',
    particleColors: ['#f97316','#dc2626','#f59e0b','#ffffff'],
    emoji: '🏹', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 10, day: 2,
    name: 'Gandhi Jayanti', nameHindi: 'गांधी जयंती',
    greetingLine1: '🕊️ बापू को शत-शत नमन!',
    greetingLine2: 'राष्ट्रपिता महात्मा गांधी की जयंती पर श्रद्धांजलि।',
    speechText: `नमस्ते! आज राष्ट्रपिता महात्मा गांधी जी की जयंती है। उनके सत्य और अहिंसा के सिद्धांत आज भी पूरी दुनिया के लिए प्रेरणा हैं। बापू के बताए मार्ग पर चलकर हम एक बेहतर भारत बना सकते हैं।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! बापू को हमारा नमन। आपका दिन शांतिपूर्ण हो। धन्यवाद।`,
    bgGlow: 'from-[#ff9933]/25 via-white/10 to-[#138808]/25',
    particleColors: ['#ff9933','#138808','#ffffff'],
    emoji: '🕊️', playAnthem: true, playVande: true,
    isFestival: false,
  },
  {
    month: 10, day: 20,
    name: 'Diwali', nameHindi: 'दीपावली',
    greetingLine1: '🪔 दीपावली की हार्दिक शुभकामनाएं!',
    greetingLine2: 'रोशनी का यह त्योहार आपके जीवन में खुशियाँ भर दे।',
    speechText: `नमस्ते! दीपावली की आपको और आपके पूरे परिवार को बहुत-बहुत शुभकामनाएं। दीपों का यह त्योहार आपके जीवन से सारे अंधकार को दूर करे और सुख, समृद्धि, स्वास्थ्य और आनंद लेकर आए। लक्ष्मी माता की कृपा आप पर सदा बनी रहे।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! शुभ दीपावली! आपका जीवन प्रकाशमय हो। धन्यवाद।`,
    bgGlow: 'from-yellow-500/30 via-orange-500/20 to-amber-500/30',
    particleColors: ['#f59e0b','#f97316','#fbbf24','#dc2626','#ffffff'],
    emoji: '🪔', playAnthem: false, playVande: false,
    isFestival: true,
  },
  {
    month: 11, day: 14,
    name: "Children's Day", nameHindi: 'बाल दिवस',
    greetingLine1: '🎈 बाल दिवस की शुभकामनाएं!',
    greetingLine2: 'पंडित नेहरू जी को नमन — बच्चे ही देश का भविष्य हैं।',
    speechText: `नमस्ते! बाल दिवस की सभी बच्चों और उनके परिवारों को हार्दिक शुभकामनाएं। पंडित जवाहरलाल नेहरू जी बच्चों से बहुत प्यार करते थे, इसलिए उनके जन्मदिन को बाल दिवस के रूप में मनाया जाता है। हर बच्चा देश का भविष्य है।`,
    closingText: `जय हिन्द! जय भारत! भारत माता की जय! आपका दिन मंगलमय हो। धन्यवाद।`,
    bgGlow: 'from-blue-500/20 via-pink-500/15 to-yellow-500/20',
    particleColors: ['#3b82f6','#ec4899','#f59e0b','#22c55e','#ffffff'],
    emoji: '🎈', playAnthem: false, playVande: false,
    isFestival: false,
  },
];

// ─── Web Audio Melody Engine ─────────────────────────────────────────────────
const NOTE: Record<string, number> = {
  B3:246.94, C4:261.63, D4:293.66, Eb4:311.13, E4:329.63,
  F4:349.23, G4:392.00, Ab4:415.30, A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25, E5:659.25, F5:698.46,
  G5:783.99, A5:880.00,
};

const VANDE_MATARAM_MELODY: [number, number][] = [
  [NOTE.D4,0.5],[NOTE.F4,0.5],[NOTE.G4,0.5],[NOTE.A4,0.5],
  [NOTE.A4,0.4],[NOTE.G4,0.2],[NOTE.F4,0.3],[NOTE.E4,0.3],[NOTE.D4,0.6],
  [NOTE.D4,0.5],[NOTE.F4,0.5],[NOTE.G4,0.5],[NOTE.Bb4,0.5],
  [NOTE.Bb4,0.4],[NOTE.A4,0.3],[NOTE.G4,0.5],[NOTE.F4,0.4],[NOTE.D4,0.7],
  [NOTE.G4,0.4],[NOTE.A4,0.4],[NOTE.Bb4,0.5],[NOTE.C5,0.5],
  [NOTE.D5,0.6],[NOTE.C5,0.3],[NOTE.Bb4,0.3],[NOTE.A4,0.4],[NOTE.G4,0.5],
  [NOTE.F4,0.4],[NOTE.G4,0.4],[NOTE.A4,0.5],[NOTE.D4,0.7],
  [NOTE.D4,0.4],[NOTE.E4,0.3],[NOTE.F4,0.5],[NOTE.G4,0.8],
];

const JANA_GANA_MELODY: [number, number][] = [
  [NOTE.G4,0.4],[NOTE.A4,0.3],[NOTE.B4,0.3],[NOTE.C5,0.5],
  [NOTE.D5,0.5],[NOTE.E5,0.3],[NOTE.D5,0.3],[NOTE.C5,0.5],
  [NOTE.B4,0.3],[NOTE.A4,0.3],[NOTE.G4,0.5],[NOTE.A4,0.3],[NOTE.B4,0.3],
  [NOTE.D5,0.6],[NOTE.C5,0.3],[NOTE.B4,0.3],[NOTE.A4,0.5],[NOTE.G4,0.5],
  [NOTE.A4,0.4],[NOTE.B4,0.3],[NOTE.C5,0.5],[NOTE.D5,0.5],
  [NOTE.E5,0.4],[NOTE.D5,0.3],[NOTE.C5,0.3],[NOTE.B4,0.3],[NOTE.A4,0.4],
  [NOTE.G4,0.4],[NOTE.A4,0.3],[NOTE.B4,0.5],[NOTE.C5,0.4],
  [NOTE.D5,0.6],[NOTE.E5,0.4],[NOTE.D5,0.4],[NOTE.C5,0.3],
  [NOTE.B4,0.3],[NOTE.A4,0.3],[NOTE.G4,0.8],
];

function playMelody(
  melody: [number, number][],
  ctx: AudioContext,
  startTime: number,
  gainVal = 0.2,
  waveType: OscillatorType = 'sine'
): number {
  let t = startTime;
  for (const [freq, dur] of melody) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();

    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = 4;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainVal, t + 0.03);
    gain.gain.setValueAtTime(gainVal, t + dur - 0.06);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t); vibrato.start(t);
    osc.stop(t + dur + 0.01); vibrato.stop(t + dur + 0.01);
    t += dur;
  }
  return t;
}

// ─── Hindi Speech (Enhanced Fluent Voice) ────────────────────────────────────
function getBestHindiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Priority order for high-quality / neural Hindi voices
  const preferredVoice =
    voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Online'))) ||
    voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && (v.name.includes('Swara') || v.name.includes('Kalpana') || v.name.includes('Hemant') || v.name.includes('Madhur'))) ||
    voices.find(v => v.lang === 'hi-IN') ||
    voices.find(v => v.lang.startsWith('hi'));

  return preferredVoice || null;
}

function speakHindi(text: string, rate = 0.88, pitch = 1.02): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(resolve, 1500);
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    // Split into natural clauses for fluent, human-like cadence
    const phrases = text.split(/(?<=[।!?,\n])\s*/).filter(p => p.trim().length > 0);
    if (phrases.length === 0) {
      resolve();
      return;
    }

    let index = 0;

    const speakNext = () => {
      if (index >= phrases.length) {
        resolve();
        return;
      }

      const phrase = phrases[index++];
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = 'hi-IN';
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;

      const voice = getBestHindiVoice();
      if (voice) u.voice = voice;

      u.onend = () => {
        // Subtle pause between natural phrases for maximum fluency
        setTimeout(speakNext, 180);
      };
      u.onerror = () => {
        setTimeout(speakNext, 100);
      };

      synth.speak(u);
    };

    // Ensure voices are loaded (handling Chrome's async getVoices)
    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        speakNext();
      };
      // Fallback timeout if onvoiceschanged doesn't fire
      setTimeout(() => {
        if (index === 0) speakNext();
      }, 250);
    } else {
      speakNext();
    }
  });
}

// ─── Daily Greeting Text (every day) ─────────────────────────────────────────
const DAILY_GREETING_SPEECH =
  `जय हिन्द! जय भारत! वंदे मातरम्! ` +
  `नमस्ते, आपका सिंकस्ट्रीम में हार्दिक स्वागत है। ` +
  `आज का दिन आपका बहुत शुभ और मंगलमय हो। ` +
  `हर हर महादेव!`;

// ─── Component ────────────────────────────────────────────────────────────────
type Day = typeof NATIONAL_DAYS[0];

export function NationalDayGreeter() {
  const [activeDay, setActiveDay]   = useState<Day | null>(null);
  const [phase, setPhase]           = useState<'idle'|'greeting'|'vande'|'anthem'|'closing'|'done'>('idle');
  const [visible, setVisible]       = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const audioCtxRef                 = useRef<AudioContext | null>(null);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day   = now.getDate();

    // Special day detection
    const found = NATIONAL_DAYS.find(d => d.month === month && d.day === day);
    if (found) { setActiveDay(found); setVisible(true); }

    // Auto-play daily greeting immediately on page load (no card shown)
    const trySpeak = () => speakHindi(DAILY_GREETING_SPEECH, 0.85, 1.08);
    // Small delay to let page settle
    const t = setTimeout(trySpeak, 1200);
    return () => clearTimeout(t);
  }, []);

  const runCelebration = useCallback(async () => {
    if (!activeDay) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      setPhase('greeting');
      await speakHindi(activeDay.speechText, 0.82, 1.05);

      if (activeDay.playVande) {
        setPhase('vande');
        await speakHindi('वंदे मातरम्!', 0.72, 1.1);
        const ve = playMelody(VANDE_MATARAM_MELODY, ctx, ctx.currentTime + 0.2, 0.22, 'sine');
        await new Promise(r => setTimeout(r, (ve - ctx.currentTime + 0.5) * 1000));
        await speakHindi('वंदे मातरम्! सुजलाम् सुफलाम् मलयज शीतलाम्, शस्य श्यामलाम् मातरम्!', 0.78, 1.05);
      }

      if (activeDay.playAnthem) {
        setPhase('anthem');
        await speakHindi('राष्ट्रगान — जन गण मन अधिनायक जय हे!', 0.75, 1.05);
        const ae = playMelody(JANA_GANA_MELODY, ctx, ctx.currentTime + 0.3, 0.22, 'sine');
        await new Promise(r => setTimeout(r, (ae - ctx.currentTime + 0.5) * 1000));
        await speakHindi('जन गण मन अधिनायक जय हे, भारत भाग्य विधाता! पंजाब सिंधु गुजरात मराठा, द्राविड़ उत्कल बंग!', 0.78, 1.05);
      }

      setPhase('closing');
      await speakHindi(activeDay.closingText, 0.82, 1.05);
      // Final Jai Hind shout
      await speakHindi('जय हिन्द! जय भारत! भारत माता की जय!', 0.9, 1.15);

      setPhase('done');
    } catch { setPhase('done'); }
  }, [activeDay]);

  const handleDismiss = () => {
    window.speechSynthesis?.cancel();
    audioCtxRef.current?.close().catch(() => {});
    setDismissed(true);
  };

  // No special day — nothing to render (daily greeting plays via speech only)
  if (!visible || dismissed || !activeDay) return null;

  const phaseLabels: Record<string, string> = {
    idle: '▶ शुरू करें',
    greeting: '🙏 अभिवादन...',
    vande: '🎵 वंदे मातरम् ...',
    anthem: '🎶 राष्ट्रगान ...',
    closing: '💐 समापन...',
    done: '✅ जय हिन्द!',
  };

  const isPlaying = phase !== 'idle' && phase !== 'done';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 48 }).map((_, i) => {
          const color = activeDay.particleColors[i % activeDay.particleColors.length];
          const size = 3 + (i % 7) * 2;
          const angle = (i / 48) * 360;
          const r = 36 + (i % 5) * 7;
          const x = 50 + r * Math.cos((angle * Math.PI) / 180);
          const y = 50 + r * Math.sin((angle * Math.PI) / 180);
          return (
            <div key={i} className="absolute rounded-full animate-pulse"
              style={{
                width: size, height: size,
                left: `${x}%`, top: `${y}%`,
                backgroundColor: color,
                opacity: 0.5 + (i % 5) * 0.1,
                animationDelay: `${i * 0.07}s`,
                animationDuration: `${1.2 + (i % 4) * 0.4}s`,
              }}
            />
          );
        })}
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl border border-white/15">
        {/* Tricolor top */}
        <div className="h-2 w-full bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />

        <div className={`bg-gradient-to-br from-slate-950/99 via-slate-900/99 to-slate-950/99 px-7 py-7 flex flex-col items-center text-center gap-3.5`}>

          {/* Close */}
          <button onClick={handleDismiss}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>

          {/* Emoji */}
          <div className="text-6xl" style={{ animation: 'bounce 2s infinite' }}>{activeDay.emoji}</div>

          {/* Titles */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">{activeDay.name}</p>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#ff9933] via-white to-[#138808] bg-clip-text text-transparent leading-tight" style={{ fontFamily: 'serif' }}>
              {activeDay.nameHindi}
            </h1>
          </div>

          {/* Greeting */}
          <div className="space-y-0.5">
            <p className="text-white text-lg font-bold leading-snug">{activeDay.greetingLine1}</p>
            <p className="text-slate-400 text-xs">{activeDay.greetingLine2}</p>
          </div>

          {/* Ashoka Chakra */}
          <svg viewBox="0 0 100 100" className="w-14 h-14 opacity-75"
            style={{ animation: isPlaying ? 'spin 3s linear infinite' : 'none' }}>
            <circle cx="50" cy="50" r="46" fill="none" stroke="#000080" strokeWidth="4"/>
            <circle cx="50" cy="50" r="6" fill="#000080"/>
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <line key={i}
                x1={50 + 6 * Math.cos(a)} y1={50 + 6 * Math.sin(a)}
                x2={50 + 44 * Math.cos(a)} y2={50 + 44 * Math.sin(a)}
                stroke="#000080" strokeWidth="2"/>;
            })}
          </svg>

          {/* Phase badge */}
          {phase !== 'idle' && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              {isPlaying && <div className="h-2 w-2 rounded-full bg-[#ff9933] animate-ping" />}
              <span className="text-xs font-bold text-white">{phaseLabels[phase]}</span>
            </div>
          )}

          {/* Jay Hind strip */}
          <div className="w-full bg-gradient-to-r from-[#ff9933]/20 via-white/5 to-[#138808]/20 border border-white/10 rounded-xl py-2 px-4">
            <p className="text-xs font-extrabold tracking-widest text-center">
              <span className="text-[#ff9933]">जय हिन्द</span>
              <span className="text-white mx-2">•</span>
              <span className="text-white">जय भारत</span>
              <span className="text-white mx-2">•</span>
              <span className="text-[#138808]">भारत माता की जय</span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 mt-1 w-full">
            {phase === 'idle' && (
              <button onClick={runCelebration}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#ff9933] via-[#ffaa44] to-[#138808] text-white font-extrabold text-sm tracking-wide hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#ff9933]/20">
                🎵 {activeDay.playVande ? 'वंदे मातरम् & राष्ट्रगान बजाएं' : 'शुभकामनाएं सुनें'}
              </button>
            )}
            {phase === 'done' && (
              <button onClick={handleDismiss}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#138808] to-[#ff9933] text-white font-extrabold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg">
                जय हिन्द! 🇮🇳 बंद करें
              </button>
            )}
            {isPlaying && (
              <button onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-2xl bg-white/8 border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/15 transition-all">
                Skip & Close
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-600">वंदे मातरम् 🇮🇳 — SyncStream</p>
        </div>

        {/* Tricolor bottom */}
        <div className="h-2 w-full bg-gradient-to-r from-[#138808] via-white to-[#ff9933]" />
      </div>

      <style jsx>{`
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  );
}
