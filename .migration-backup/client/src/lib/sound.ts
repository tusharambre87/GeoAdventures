
// Simple AudioContext based sound effects for the game
// No external assets required!

class SoundManager {
  private context: AudioContext | null = null;

  private getContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.context;
  }

  public resumeContext() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    } else if (!this.context) {
      this.getContext();
    }
  }

  public isMuted(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geoquest_auto_speech_muted') === 'true';
    }
    return false;
  }

  playSuccess() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Play a cheerful "Ta-da!" chord (C major arpeggio)
    osc1.frequency.setValueAtTime(523.25, t); // C5
    osc1.frequency.setValueAtTime(659.25, t + 0.1); // E5
    osc1.frequency.setValueAtTime(783.99, t + 0.2); // G5
    osc1.frequency.setValueAtTime(1046.50, t + 0.4); // C6

    osc2.frequency.setValueAtTime(523.25, t);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, t + 0.4);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

    osc1.start(t);
    osc1.stop(t + 0.8);
    osc2.start(t);
    osc2.stop(t + 0.8);
  }

  playError() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    
    // Play a sad "Wah-wah" sound
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.2);
    osc.frequency.setValueAtTime(100, t + 0.25);
    osc.frequency.linearRampToValueAtTime(80, t + 0.5);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.start(t);
    osc.stop(t + 0.6);
  }

  playClick() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playStamp() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Thud sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  playFanfare() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = now + (i * 0.1);
        const duration = 0.4;
        
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    });
  }
  
  speak(text: string) {
    if (this.isMuted()) return;
    if ('speechSynthesis' in window) {
       // Cancel any previous speech
       window.speechSynthesis.cancel();
       
       const utterance = new SpeechSynthesisUtterance(text);
       
       // Get available voices
       let voices = window.speechSynthesis.getVoices();
       
       // If voices aren't loaded yet, wait for them
       if (voices.length === 0) {
         window.speechSynthesis.onvoiceschanged = () => {
           voices = window.speechSynthesis.getVoices();
           this.setNaturalVoice(utterance, voices);
           window.speechSynthesis.speak(utterance);
         };
       } else {
         this.setNaturalVoice(utterance, voices);
         window.speechSynthesis.speak(utterance);
       }
    }
  }
  
  private setNaturalVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) {
    // Priority list of natural-sounding voices (these tend to be more human-like)
    const naturalVoiceNames = [
      // Premium/Neural voices (most human-like)
      'Samantha', // iOS/Mac - very natural
      'Karen', // iOS/Mac - Australian, natural
      'Daniel', // iOS/Mac - British, natural  
      'Moira', // iOS/Mac - Irish, natural
      'Tessa', // iOS/Mac - South African
      'Google UK English Female',
      'Google UK English Male', 
      'Google US English',
      'Microsoft Zira', // Windows - natural female
      'Microsoft David', // Windows - natural male
      'Microsoft Mark', // Windows
      'Alex', // Mac
      'Victoria', // Mac
      'Fiona', // Mac - Scottish
      // Android voices
      'English (United States)',
      'English (United Kingdom)',
    ];
    
    // Find the best available natural voice
    let selectedVoice: SpeechSynthesisVoice | null = null;
    
    for (const voiceName of naturalVoiceNames) {
      const found = voices.find(v => 
        v.name.includes(voiceName) || 
        v.voiceURI.includes(voiceName)
      );
      if (found) {
        selectedVoice = found;
        break;
      }
    }
    
    // Fallback: find any English voice that's marked as "local" (usually higher quality)
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && v.localService
      ) || voices.find(v => v.lang.startsWith('en')) || null;
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Natural speech settings
    utterance.rate = 0.85; // Slightly slower for clarity and naturalness
    utterance.pitch = 1.0; // Natural pitch (1.0 is default)
    utterance.volume = 1.0;
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
  }

  playDing() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t); // High ding
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0); // Long tail

    osc.start(t);
    osc.stop(t + 1.0);
  }
}

export const soundManager = new SoundManager();

const ttsAudioCache = new Map<string, string>();
let currentTtsAudio: HTMLAudioElement | null = null;

export async function speakWithServerTTS(text: string, voice: string = 'eva'): Promise<void> {
  if (soundManager.isMuted()) return;
  
  if (currentTtsAudio) {
    currentTtsAudio.pause();
    currentTtsAudio = null;
  }

  const cacheKey = `${voice}:${text}`;
  let audioUrl = ttsAudioCache.get(cacheKey);

  if (!audioUrl) {
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      
      if (!response.ok) {
        soundManager.speak(text);
        return;
      }

      const blob = await response.blob();
      audioUrl = URL.createObjectURL(blob);
      ttsAudioCache.set(cacheKey, audioUrl);
    } catch {
      soundManager.speak(text);
      return;
    }
  }

  const audio = new Audio(audioUrl);
  currentTtsAudio = audio;
  audio.play().catch(() => {
    soundManager.speak(text);
  });
}

export function stopServerTTS() {
  if (currentTtsAudio) {
    currentTtsAudio.pause();
    currentTtsAudio = null;
  }
  soundManager.stopSpeaking();
}
