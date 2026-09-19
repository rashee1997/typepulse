import { SwitchSoundProfile } from '@/types/typing';

// Web Audio API Sound Synthesizer for tactile typing sound feedback

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;
  private profile: SwitchSoundProfile = 'cherry-blue';

  constructor() {
    // Lazy initialized on first user interaction to satisfy browser autoplay policies
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setConfig(enabled: boolean, volume: number, profile: SwitchSoundProfile = 'cherry-blue') {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
    this.profile = profile;
  }

  public setProfile(profile: SwitchSoundProfile) {
    this.profile = profile;
  }

  public getProfile(): SwitchSoundProfile {
    return this.profile;
  }

  // Mechanical switch click with profile acoustics
  public playKeyClick(overrideProfile?: SwitchSoundProfile) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const prof = overrideProfile || this.profile;
    const now = ctx.currentTime;
    const jitter = (Math.random() - 0.5) * 0.06; // +/- 3% natural organic acoustic jitter

    try {
      if (prof === 'cherry-blue') {
        // Two-stage tactile clicky: Sharp click impulse + hollow bottom out
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime((2400 + Math.random() * 200) * (1 + jitter), now);
        clickGain.gain.setValueAtTime(this.volume * 0.25, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.015);

        const thockOsc = ctx.createOscillator();
        const thockGain = ctx.createGain();
        thockOsc.type = 'triangle';
        thockOsc.frequency.setValueAtTime((420 + Math.random() * 40) * (1 + jitter), now);
        thockOsc.frequency.exponentialRampToValueAtTime(120, now + 0.03);
        thockGain.gain.setValueAtTime(this.volume * 0.35, now);
        thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        thockOsc.connect(thockGain);
        thockGain.connect(ctx.destination);
        thockOsc.start(now);
        thockOsc.stop(now + 0.04);
      } else if (prof === 'gateron-red') {
        // Smooth linear deep thock: low frequency impulse with low-pass dampening
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime((220 + Math.random() * 30) * (1 + jitter), now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);

        gain.gain.setValueAtTime(this.volume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (prof === 'holy-panda') {
        // Tactile bump with punchy rounded thock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime((340 + Math.random() * 35) * (1 + jitter), now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.032);

        gain.gain.setValueAtTime(this.volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (prof === 'topre') {
        // Electro-capacitive dome: warm, muffled, deep tactile thud
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime((170 + Math.random() * 20) * (1 + jitter), now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(this.volume * 0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else {
        // Classic responsive switch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = (380 + Math.random() * 40) * (1 + jitter);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Audio errors should never disrupt typing
    }
  }

  // Chime when an in-flow DDA hesitation is mastered / remediated
  public playDdaRemediationChime() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  // Convenient alias for key click
  public playKeypress() {
    this.playKeyClick();
  }

  // Soft low error warning
  public playError() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Combo burst chime
  public playCombo() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playStreak() {
    this.playCombo();
  }

  public playComboMilestone() {
    this.playCombo();
  }

  // Level up / Victory fanfare
  public playSuccess() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.28);
      });
    } catch {}
  }

  public playVictory() {
    this.playSuccess();
  }

  public playLevelUp() {
    this.playSuccess();
  }

  // Cadence metronome pacer tick (organic woodblock pulse for steady rhythm)
  public playMetronomeTick(accent: boolean = false, customVolume?: number) {
    if (!this.enabled) return;
    const vol = customVolume !== undefined ? customVolume : this.volume;
    if (vol <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const freq = accent ? 1046.5 : 784; // C6 for accent, G5 for standard tick
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(accent ? 300 : 220, now + 0.025);

      const gainLevel = (vol * (accent ? 0.35 : 0.22));
      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.032);
    } catch {}
  }
}

export const soundFx = new SoundSynthesizer();
