/**
 * Quantum Physics calculations for the Double-Slit Experiment.
 *
 * Model: Far-field Fraunhofer dual-slit interference modulated by
 * single-slit diffraction sinc² envelope and environmental decoherence.
 *
 * 1. Quantum Wave Superposition: Multi-fringe interference with bright central peak:
 *    I(z) = cos²(α) · sinc²(β)
 *    where α = π·d·z / (λ·L),  β = π·a·z / (λ·L) = α · (a / d)
 *
 * 2. Physical Which-Path Measurement: Decoherence collapse into two distinct
 *    classical particle bands centered directly behind each aperture:
 *    I(z) = 0.5 · [I_A(z) + I_B(z)]
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
 * Standard unnormalized cardinal sine function: sinc(u) = sin(u) / u, sinc(0) = 1.
 */
export function sinc(u: number): number {
  if (Math.abs(u) < 1e-9) return 1.0;
  return Math.sin(u) / u;
}

/**
 * Converts wavelength in nm (390 - 700 nm) to high-vibrance RGB color
 * using CIE spectral approximation with gamma correction.
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
 * Physical apparatus dimensions in meters (calibrated to the 3D visualization bench):
 * - Screen distance L = 5.68 m
 * - Center-to-center slit separation d = 1.10 m (slit centers at z = -0.55m and z = +0.55m)
 * - Individual slit aperture width a = 0.36 m
 */
export const APPARATUS_GEOMETRY = {
  screenDistanceL: 5.68,
  slitSeparationD: 1.10,
  slitWidthA: 0.36,
  slitOffset: 0.55,
} as const;

/**
 * Computes the relative probability density I(z) on the detector screen across z in [-1.9, 1.9].
 *
 * UNMONITORED (whichPath = false):
 * - Wave superposition: I(z) = cos²(α) · sinc²(β) · envelope(z)
 *   yielding 5+ bright and dark interference fringes with a bright center peak at z = 0.
 *
 * OBSERVED (whichPath = true):
 * - Physical measurement collapses phase coherence (entanglement decoherence).
 * - Produces TWO distinct classical particle bands centered directly behind the two slits
 *   (at z = -0.55 and z = +0.55), with a dark central valley at z = 0.
 */
export function computeIntensity(z: number, params: PhysicsParams): number {
  const { wavelengthNm, whichPath } = params;

  if (!whichPath) {
    // --- QUANTUM WAVE SUPERPOSITION ---
    // Spatial frequency is inversely proportional to wavelength (violet = tighter, red = wider)
    const waveFreq = (532 / wavelengthNm) * 3.4;
    const alpha = z * waveFreq;
    const beta = alpha * (APPARATUS_GEOMETRY.slitWidthA / APPARATUS_GEOMETRY.slitSeparationD);

    // Interference modulation cos²(α)
    const interference = Math.pow(Math.cos(alpha), 2);

    // Diffraction envelope sinc²(β)
    const sincVal = sinc(beta);
    const diffractionEnvelope = sincVal * sincVal;

    // Smooth soft aperture/screen edge decay at the boundaries of the 3D rail/screen (z in [-1.9, +1.9])
    const screenAperture = Math.exp(-Math.pow(z / 1.75, 4));

    return interference * diffractionEnvelope * screenAperture;
  } else {
    // --- CLASSICAL WHICH-PATH PARTICLES (DECOHERENCE) ---
    // Incoherent statistical mixture: 0.5 · [P_SlitA(z) + P_SlitB(z)]
    // Two distinct classical single-slit particle distributions centered behind each slit
    const slitOffset = APPARATUS_GEOMETRY.slitOffset;
    const dispersion = APPARATUS_GEOMETRY.slitWidthA; // a = 0.36m

    const clumpLeft = Math.exp(-Math.pow((z + slitOffset) / dispersion, 2));
    const clumpRight = Math.exp(-Math.pow((z - slitOffset) / dispersion, 2));

    return 0.5 * (clumpLeft + clumpRight);
  }
}

/**
 * Theoretical spacing between constructive interference peaks:
 * Δz = (π / waveFreq) = (π / 3.4) * (wavelengthNm / 532)
 */
export function computeFringeSpacing(wavelengthNm: number): number {
  return (Math.PI / 3.4) * (wavelengthNm / 532);
}

/**
 * Samples a random arrival coordinate (z, y) on the detector screen.
 * - In which-path mode: stochastic particle trajectories through chosen slit
 * - In wave mode: Monte Carlo stochastic inverse-probability sampling of Born probability density
 */
export function samplePhotonImpact(params: PhysicsParams): { z: number; y: number; slitChoice: -1 | 1 } {
  const { whichPath } = params;
  const slitChoice: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  let z = 0;

  if (whichPath) {
    // In particle mode, photon traversed the chosen slit and lands in that slit's distribution
    const slitOffset = slitChoice === -1 ? -APPARATUS_GEOMETRY.slitOffset : APPARATUS_GEOMETRY.slitOffset;
    const dispersion = APPARATUS_GEOMETRY.slitWidthA; // 0.36
    const sigma = dispersion / Math.SQRT2; // exact sigma for exp(-(z - mu)^2 / dispersion^2)

    // Box-Muller normal sampling centered on the chosen slit
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const normal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    z = THREE_clamp(slitOffset + normal * sigma, -1.85, 1.85);
  } else {
    // In wave superposition mode, rejection sampling from the multi-fringe Born probability distribution
    const maxZ = 1.88;
    let accepted = false;
    for (let i = 0; i < 150; i++) {
      const candidateZ = (Math.random() * 2 - 1) * maxZ;
      const prob = computeIntensity(candidateZ, params);
      if (Math.random() <= prob) {
        z = candidateZ;
        accepted = true;
        break;
      }
    }
    if (!accepted) {
      z = (Math.random() * 2 - 1) * maxZ;
    }
  }

  // Vertical Gaussian spread representing the finite vertical beam height
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const normalY = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const y = THREE_clamp(normalY * 0.45, -1.45, 1.45);

  return { z, y, slitChoice };
}

function THREE_clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
