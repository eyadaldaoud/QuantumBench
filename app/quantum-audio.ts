/**
 * Web Audio API synthesizer for the Quantum Double-Slit Experiment.
 * Generates clean, crisp, satisfying acoustic cues:
 * - Pure sine emission chirps tuned to photon wavelength (no buzz, no static)
 * - Delicate crystalline phosphor impact pings
 * - Slit transit indicator blips
 * - ZERO background drone or static noise
 */

class QuantumAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isEnabled = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  public setEnabled(enabled: boolean): boolean {
    this.isEnabled = enabled;
    if (enabled) {
      const ctx = this.ensureContext();
      if (ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.05);
      }
    } else {
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      }
    }
    return this.isEnabled;
  }

  public isAudioActive(): boolean {
    return this.isEnabled && !!this.ctx && this.ctx.state === "running";
  }

  /**
   * Pure, gentle photon emission chime. Zero static or distortion.
   * Frequency mapped to wavelength (400nm -> 780 Hz, 700nm -> 390 Hz).
   */
  public playPhotonLaunch(wavelengthNm: number): void {
    if (!this.isEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Map wavelength smoothly to pure harmonic pitch
    const norm = (700 - Math.min(700, Math.max(390, wavelengthNm))) / 310;
    const freq = 420 + norm * 360;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.045);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Slit transit event sound.
   */
  public playSlitTransit(whichPath: boolean, slitChoice: -1 | 1): void {
    if (!this.isEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (whichPath) {
      // Physical detector gate click: crisp clean blip
      osc.type = "sine";
      const freq = slitChoice === -1 ? 880 : 1050;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.035);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    } else {
      // Soft quantum phase harmonic
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.04);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Crisp, delicate phosphor impact tick (like a clean quartz chime).
   */
  public playScreenHit(z: number): void {
    if (!this.isEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Subtle pitch variation based on position
    const hitFreq = 1200 + Math.sin(z * 4) * 80 + (Math.random() * 30 - 15);

    osc.type = "sine";
    osc.frequency.setValueAtTime(hitFreq, now);
    osc.frequency.exponentialRampToValueAtTime(hitFreq * 0.5, now + 0.025);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const quantumAudio = new QuantumAudioEngine();
