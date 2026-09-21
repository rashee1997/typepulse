import { SwitchSoundProfile } from '@/types/typing';

// Web Audio API Sound Synthesizer for tactile typing sound feedback

export type KeySoundCategory = 'letter' | 'space' | 'backspace' | 'enter' | 'punctuation';

export function categorizeKey(key?: string): KeySoundCategory {
  if (!key) return 'letter';
  if (key === ' ') return 'space';
  if (key === 'Backspace') return 'backspace';
  if (key === 'Enter') return 'enter';
  if (key.length === 1 && /[,.\/#!$%^&*;:{}=\-_`~()'"?<>[\]\\|+@]/.test(key)) return 'punctuation';
  return 'letter';
}

/** Per-category multipliers applied uniformly inside every existing profile
 *  branch, so each switch keeps its character — just deepened/lightened
 *  per key role, the way a real keyboard's spacebar stabilizer or a
 *  backspace's harder finger strike actually sounds. */
export const CATEGORY_MODIFIERS: Record<KeySoundCategory, { pitchMul: number; volMul: number; durMul: number }> = {
  letter:      { pitchMul: 1.00, volMul: 1.00, durMul: 1.00 },
  space:       { pitchMul: 0.72, volMul: 1.15, durMul: 1.30 }, // deeper, longer — stabilizer wobble
  backspace:   { pitchMul: 0.80, volMul: 1.10, durMul: 1.15 }, // harder strike, slightly duller
  enter:       { pitchMul: 0.78, volMul: 1.20, durMul: 1.35 }, // biggest keycap, most resonance
  punctuation: { pitchMul: 1.05, volMul: 0.90, durMul: 0.90 }, // smaller keycap, lighter tap
};

export const RELEASE_PROFILE: Record<SwitchSoundProfile, { volMul: number; freqMul: number }> = {
  'cherry-blue': { volMul: 0.50, freqMul: 1.4 }, // clicky: release click is nearly as loud as press
  'holy-panda':  { volMul: 0.40, freqMul: 1.3 },
  'gateron-red': { volMul: 0.12, freqMul: 1.1 }, // linear: release is almost silent
  'topre':       { volMul: 0.15, freqMul: 1.1 },
  'classic':     { volMul: 0.25, freqMul: 1.2 },
};

export interface PlayKeyClickOptions {
  key?: string;
  overrideProfile?: SwitchSoundProfile;
}

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

  /**
   * `profile` is optional so a caller that only means to change the volume or mute
   * cannot silently reset the user's chosen switch sound back to the default.
   */
  public setConfig(enabled: boolean, volume: number, profile?: SwitchSoundProfile) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
    if (profile) this.profile = profile;
  }

  public setProfile(profile: SwitchSoundProfile) {
    this.profile = profile;
  }

  public getProfile(): SwitchSoundProfile {
    return this.profile;
  }

  // Mechanical switch click with profile acoustics and per-key category acoustics
  public playKeyClick(opts?: PlayKeyClickOptions | SwitchSoundProfile) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const key = typeof opts === 'object' && opts !== null ? opts.key : undefined;
    const prof = (typeof opts === 'object' && opts !== null ? opts.overrideProfile : (typeof opts === 'string' ? opts : undefined)) || this.profile;
    const mod = CATEGORY_MODIFIERS[categorizeKey(key)];
    const now = ctx.currentTime;
    const jitter = (Math.random() - 0.5) * 0.06; // +/- 3% natural organic acoustic jitter

    try {
      if (prof === 'cherry-blue') {
        // Two-stage tactile clicky: Sharp click impulse + hollow bottom out
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime((2400 + Math.random() * 200) * (1 + jitter) * mod.pitchMul, now);
        clickGain.gain.setValueAtTime(this.volume * 0.25 * mod.volMul, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012 * mod.durMul);
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.015 * mod.durMul);

        const thockOsc = ctx.createOscillator();
        const thockGain = ctx.createGain();
        thockOsc.type = 'triangle';
        thockOsc.frequency.setValueAtTime((420 + Math.random() * 40) * (1 + jitter) * mod.pitchMul, now);
        thockOsc.frequency.exponentialRampToValueAtTime(120 * mod.pitchMul, now + 0.03 * mod.durMul);
        thockGain.gain.setValueAtTime(this.volume * 0.35 * mod.volMul, now);
        thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035 * mod.durMul);
        thockOsc.connect(thockGain);
        thockGain.connect(ctx.destination);
        thockOsc.start(now);
        thockOsc.stop(now + 0.04 * mod.durMul);
      } else if (prof === 'gateron-red') {
        // Smooth linear deep thock: low frequency impulse with low-pass dampening
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime((220 + Math.random() * 30) * (1 + jitter) * mod.pitchMul, now);
        osc.frequency.exponentialRampToValueAtTime(90 * mod.pitchMul, now + 0.04 * mod.durMul);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900 * mod.pitchMul, now);

        gain.gain.setValueAtTime(this.volume * 0.45 * mod.volMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045 * mod.durMul);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05 * mod.durMul);
      } else if (prof === 'holy-panda') {
        // Tactile bump with punchy rounded thock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime((340 + Math.random() * 35) * (1 + jitter) * mod.pitchMul, now);
        osc.frequency.exponentialRampToValueAtTime(150 * mod.pitchMul, now + 0.032 * mod.durMul);

        gain.gain.setValueAtTime(this.volume * 0.5 * mod.volMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035 * mod.durMul);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04 * mod.durMul);
      } else if (prof === 'topre') {
        // Electro-capacitive dome: warm, muffled, deep tactile thud
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime((170 + Math.random() * 20) * (1 + jitter) * mod.pitchMul, now);
        osc.frequency.exponentialRampToValueAtTime(80 * mod.pitchMul, now + 0.05 * mod.durMul);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600 * mod.pitchMul, now);

        gain.gain.setValueAtTime(this.volume * 0.55 * mod.volMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055 * mod.durMul);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06 * mod.durMul);
      } else {
        // Classic responsive switch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = (380 + Math.random() * 40) * (1 + jitter) * mod.pitchMul;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(140 * mod.pitchMul, now + 0.035 * mod.durMul);
        gain.gain.setValueAtTime(this.volume * 0.4 * mod.volMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035 * mod.durMul);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04 * mod.durMul);
      }
    } catch {
      // Audio errors should never disrupt typing
    }
  }

  // Key release acoustic sound with switch and category differentiation
  public playKeyRelease(key?: string, overrideProfile?: SwitchSoundProfile) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const prof = overrideProfile || this.profile;
    const rel = RELEASE_PROFILE[prof] || RELEASE_PROFILE['classic'];
    const catMod = CATEGORY_MODIFIERS[categorizeKey(key)];
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = (500 + Math.random() * 60) * rel.freqMul * catMod.pitchMul;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq * 0.4), now + 0.02);
      gain.gain.setValueAtTime(this.volume * rel.volMul * catMod.volMul, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {}
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
