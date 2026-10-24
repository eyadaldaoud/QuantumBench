/**
 * Quantum Physics calculations for the Double-Slit Experiment.
 * Computes:
 * 1. Quantum Wave Superposition: Multi-fringe interference with bright central peak
 * 2. Physical Which-Path Measurement: Decoherence collapse into two distinct classical particle bands
 */

export interface WavelengthColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  css: string;
  name: string;
  rgbNum: number;
}

/**
 * Converts wavelength in nm (390 - 700 nm) to high-vibrance RGB color.
 */
export function wavelengthToColor(wavelength: number): WavelengthColor {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0.0;
    g = (wavelength - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1.0;
    g = -(wavelength - 645) / (645 - 580);
    b = 0.0;
  } else if (wavelength >= 645 && wavelength <= 750) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  }

  let factor = 1.0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.35 + (0.65 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength > 670 && wavelength <= 750) {
    factor = 0.35 + (0.65 * (750 - wavelength)) / (750 - 670);
  }

  const gamma = 0.82;
  const ri = Math.min(255, Math.max(0, Math.round(Math.pow(r * factor, gamma) * 255)));
  const gi = Math.min(255, Math.max(0, Math.round(Math.pow(g * factor, gamma) * 255)));
  const bi = Math.min(255, Math.max(0, Math.round(Math.pow(b * factor, gamma) * 255)));

  const hex = `#${((1 << 24) + (ri << 16) + (gi << 8) + bi).toString(16).slice(1)}`;
  const rgbNum = (ri << 16) | (gi << 8) | bi;

  let name = "Cyan";
  if (wavelength < 425) name = "Deep Violet (405nm)";
  else if (wavelength < 460) name = "Royal Blue (450nm)";
  else if (wavelength < 495) name = "Cyan Blue (488nm)";
  else if (wavelength < 540) name = "Emerald Green (532nm)";
  else if (wavelength < 590) name = "Amber Yellow (589nm)";
  else if (wavelength < 630) name = "Orange (615nm)";
  else name = "Laser Red (650nm)";

  return {
    r: ri / 255,
    g: gi / 255,
    b: bi / 255,
    hex,
    css: `rgb(${ri}, ${gi}, ${bi})`,
    name,
    rgbNum,
  };
}

export interface PhysicsParams {
  wavelengthNm: number;
  whichPath: boolean;
}

/**
 * Computes the relative probability density I(z) on the detector screen across z in [-1.9, 1.9].
 *
 * UNMONITORED (whichPath = false):
 * - Wave superposition creates 5+ crisp interference fringes with a bright center peak at z = 0.
 *
 * OBSERVED (whichPath = true):
 * - Wavefunction collapses into classical particle behavior.
 * - Produces TWO distinct separate clumps directly behind the two slits (at z = -0.55 and z = +0.55),
 *   with a dark gap at z = 0.
 */
export function computeIntensity(z: number, params: PhysicsParams): number {
  const { wavelengthNm, whichPath } = params;

  if (!whichPath) {
    // --- QUANTUM WAVE SUPERPOSITION ---
    // Fringe spacing inversely proportional to wavelength (violet = tighter, red = wider)
    const waveFreq = (532 / wavelengthNm) * 3.4;
    const phase = z * waveFreq;

    // Interference term cos^2(phase) gives alternating bright/dark bands
    const interference = Math.pow(Math.cos(phase), 2);

    // Diffraction envelope: smooth Gaussian falloff toward the screen edges
    const envelope = Math.exp(-Math.pow(z / 1.45, 2));

    return interference * envelope;
  } else {
    // --- CLASSICAL WHICH-PATH PARTICLES ---
    // Two distinct classical single-slit particle distributions centered behind each slit (z = -0.55 and +0.55)
    const slitOffset = 0.55;
    const dispersion = 0.36; // Narrow enough to clearly separate the two bands with a dark central valley

    const clumpLeft = Math.exp(-Math.pow((z + slitOffset) / dispersion, 2));
    const clumpRight = Math.exp(-Math.pow((z - slitOffset) / dispersion, 2));

    return 0.5 * (clumpLeft + clumpRight);
  }
}

/**
 * Samples a random arrival coordinate (z, y) on the detector screen.
 */
export function samplePhotonImpact(params: PhysicsParams): { z: number; y: number; slitChoice: -1 | 1 } {
  const { whichPath } = params;
  const slitChoice: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  let z = 0;

  if (whichPath) {
    // In particle mode, photon traveled through the chosen slit and lands in that slit's distribution
    const slitOffset = slitChoice === -1 ? -0.55 : 0.55;
    const dispersion = 0.36;

    // Box-Muller normal sampling centered on the chosen slit
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const normal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    z = THREE_clamp(slitOffset + normal * dispersion * 0.72, -1.85, 1.85);
  } else {
    // In wave superposition mode, rejection sampling from the multi-fringe interference curve
    const maxZ = 1.88;
    for (let i = 0; i < 80; i++) {
      const candidateZ = (Math.random() * 2 - 1) * maxZ;
      const prob = computeIntensity(candidateZ, params);
      if (Math.random() <= prob) {
        z = candidateZ;
        break;
      }
    }
  }

  // Vertical Gaussian spread representing the vertical beam height
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const normalY = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const y = THREE_clamp(normalY * 0.45, -1.45, 1.45);

  return { z, y, slitChoice };
}

function THREE_clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
