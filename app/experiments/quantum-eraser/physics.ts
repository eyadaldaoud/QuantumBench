/**
 * Pure TypeScript physics module for the Quantum Eraser Experiment.
 *
 * Model: Far-field (Fraunhofer) double slit, equal slit intensities, ideal polarizers.
 * No Three.js imports — suitable for pure unit testing and headless execution.
 */

export type EraserMode = "plain" | "tagged" | "analyzer";
export type EraserChannel = "A" | "B" | "ALL";
export type SlitTag = "H" | "V";

export interface QuantumEraserConfig {
  wavelength: number; // lambda: wavelength in meters (e.g. 532e-9)
  slitSeparation: number; // d: slit separation in meters (e.g. 0.2e-3)
  slitWidth: number; // a: slit width in meters (d > a, e.g. 0.04e-3)
  distanceToScreen: number; // L: distance to screen in meters (e.g. 1.0)
  theta: number; // theta: analyzer angle in radians (0 to pi/2)
  xMin: number; // visible screen window minimum in meters (e.g. -0.02)
  xMax: number; // visible screen window maximum in meters (e.g. +0.02)
  gridPoints?: number; // number of discretization points (e.g. 2001)
}

export interface EraserSample {
  x: number;
  channel: EraserChannel;
  slitTag?: SlitTag;
}

export const DEFAULT_CONFIG: QuantumEraserConfig = {
  wavelength: 532e-9, // 532 nm (Green)
  slitSeparation: 0.2e-3, // 0.20 mm
  slitWidth: 0.04e-3, // 0.04 mm
  distanceToScreen: 1.0, // 1.0 meter
  theta: Math.PI / 4, // 45 degrees
  xMin: -0.02, // -20 mm
  xMax: 0.02, // +20 mm
  gridPoints: 2001,
};

/**
 * Standard unnormalized sinc function: sinc(u) = sin(u)/u, sinc(0) = 1.
 */
export function sinc(u: number): number {
  if (Math.abs(u) < 1e-12) return 1.0;
  return Math.sin(u) / u;
}

/**
 * Single-slit diffraction amplitude A(x) = sinc(pi * a * x / (lambda * L)).
 */
export function computeA(x: number, config: QuantumEraserConfig): number {
  const { slitWidth: a, wavelength: lambda, distanceToScreen: L } = config;
  const u = (Math.PI * a * x) / (lambda * L);
  return sinc(u);
}

/**
 * Double-slit phase parameter phi(x) = pi * d * x / (lambda * L).
 */
export function computePhi(x: number, config: QuantumEraserConfig): number {
  const { slitSeparation: d, wavelength: lambda, distanceToScreen: L } = config;
  return (Math.PI * d * x) / (lambda * L);
}

/**
 * Fringe spacing Delta x = lambda * L / d.
 */
export function computeFringeSpacing(config: QuantumEraserConfig): number {
  const { slitSeparation: d, wavelength: lambda, distanceToScreen: L } = config;
  return (lambda * L) / d;
}

/**
 * Analytical fringe visibility V = |sin(2 * theta)|.
 */
export function computeVisibility(theta: number): number {
  return Math.abs(Math.sin(2 * theta));
}

/**
 * Seedable 32-bit pseudo-random number generator (Mulberry32).
 * Fast, deterministic, and statistically robust for Monte Carlo unit testing.
 */
export function createRNG(seed = 123456789): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Precomputed discrete distribution grids, numerical normalization integrals,
 * and inverse-CDF samplers for all 3 modes of the Quantum Eraser.
 */
export class QuantumEraserModel {
  readonly config: QuantumEraserConfig;
  readonly nPoints: number;
  readonly dx: number;
  readonly xGrid: Float64Array;

  // Single-slit diffraction envelope g(x) = A(x)^2, numerically normalized over [xMin, xMax]
  readonly g: Float64Array;
  readonly cdfG: Float64Array;

  // Mode 1: Plain double slit p_1(x) = g(x) * (1 + cos(2 * phi)), normalized
  readonly p1: Float64Array;
  readonly cdfP1: Float64Array;

  // Mode 3: Tagged + Analyzer at angle theta
  // p_A(x) = 0.5 * g(x) * (1 + sin(2 * theta) * cos(2 * phi))
  // p_B(x) = 0.5 * g(x) * (1 - sin(2 * theta) * cos(2 * phi))
  readonly pA: Float64Array;
  readonly pB: Float64Array;
  readonly cdfPA: Float64Array;
  readonly cdfPB: Float64Array;

  constructor(config: QuantumEraserConfig = DEFAULT_CONFIG) {
    if (config.slitSeparation <= config.slitWidth) {
      throw new Error(`Slit separation d (${config.slitSeparation}) must be strictly greater than slit width a (${config.slitWidth}).`);
    }

    this.config = { ...config };
    this.nPoints = config.gridPoints ?? 2001;
    this.dx = (config.xMax - config.xMin) / (this.nPoints - 1);

    this.xGrid = new Float64Array(this.nPoints);
    const rawG = new Float64Array(this.nPoints);
    const cos2Phi = new Float64Array(this.nPoints);

    // 1. Compute raw A(x)^2 and cos(2 * phi) on the grid
    let intG = 0;
    for (let i = 0; i < this.nPoints; i++) {
      const x = config.xMin + i * this.dx;
      this.xGrid[i] = x;

      const A = computeA(x, config);
      const valG = A * A;
      rawG[i] = valG;

      // Trapezoidal rule weight
      const weight = i === 0 || i === this.nPoints - 1 ? 0.5 : 1.0;
      intG += valG * weight * this.dx;

      const phi = computePhi(x, config);
      cos2Phi[i] = Math.cos(2 * phi);
    }

    // 2. Normalized g(x) and its cumulative distribution function (CDF)
    this.g = new Float64Array(this.nPoints);
    this.cdfG = new Float64Array(this.nPoints);
    let cumG = 0;
    this.cdfG[0] = 0;

    for (let i = 0; i < this.nPoints; i++) {
      this.g[i] = rawG[i] / intG;
      if (i > 0) {
        const seg = 0.5 * (this.g[i - 1] + this.g[i]) * this.dx;
        cumG += seg;
        this.cdfG[i] = cumG;
      }
    }
    // Force exact boundary
    this.cdfG[this.nPoints - 1] = 1.0;

    // 3. Mode 1: Plain double slit p_1(x) = g(x) * (1 + cos(2 * phi)), normalized
    const rawP1 = new Float64Array(this.nPoints);
    let intP1 = 0;
    for (let i = 0; i < this.nPoints; i++) {
      const v = this.g[i] * (1.0 + cos2Phi[i]);
      rawP1[i] = v;
      const weight = i === 0 || i === this.nPoints - 1 ? 0.5 : 1.0;
      intP1 += v * weight * this.dx;
    }

    this.p1 = new Float64Array(this.nPoints);
    this.cdfP1 = new Float64Array(this.nPoints);
    let cumP1 = 0;
    this.cdfP1[0] = 0;

    for (let i = 0; i < this.nPoints; i++) {
      this.p1[i] = rawP1[i] / intP1;
      if (i > 0) {
        const seg = 0.5 * (this.p1[i - 1] + this.p1[i]) * this.dx;
        cumP1 += seg;
        this.cdfP1[i] = cumP1;
      }
    }
    this.cdfP1[this.nPoints - 1] = 1.0;

    // 4. Mode 3: Tagged + Analyzer at angle theta
    // p_A(x) = 0.5 * g(x) * (1 + sin(2 * theta) * cos(2 * phi))
    // p_B(x) = 0.5 * g(x) * (1 - sin(2 * theta) * cos(2 * phi))
    const sin2Theta = Math.sin(2 * config.theta);
    this.pA = new Float64Array(this.nPoints);
    this.pB = new Float64Array(this.nPoints);
    this.cdfPA = new Float64Array(this.nPoints);
    this.cdfPB = new Float64Array(this.nPoints);

    let cumPA = 0;
    let cumPB = 0;
    this.cdfPA[0] = 0;
    this.cdfPB[0] = 0;

    for (let i = 0; i < this.nPoints; i++) {
      const gVal = this.g[i];
      const mod = sin2Theta * cos2Phi[i];
      const valA = 0.5 * gVal * (1.0 + mod);
      const valB = 0.5 * gVal * (1.0 - mod);
      this.pA[i] = valA;
      this.pB[i] = valB;

      if (i > 0) {
        cumPA += 0.5 * (this.pA[i - 1] + this.pA[i]) * this.dx;
        cumPB += 0.5 * (this.pB[i - 1] + this.pB[i]) * this.dx;
        this.cdfPA[i] = cumPA;
        this.cdfPB[i] = cumPB;
      }
    }
  }

  /**
   * Sample a position x from a precomputed CDF via inverse-CDF with linear interpolation.
   */
  private sampleFromCDF(cdf: Float64Array, u: number): number {
    // Binary search for interval
    let low = 0;
    let high = this.nPoints - 1;

    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (cdf[mid] <= u) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const cdfLow = cdf[low];
    const cdfHigh = cdf[high];
    const t = cdfHigh > cdfLow ? (u - cdfLow) / (cdfHigh - cdfLow) : 0.0;
    return this.xGrid[low] + t * this.dx;
  }

  /**
   * Generates a single photon impact on the detector screen.
   *
   * In Mode 3 ("analyzer"):
   * 1. x is sampled from g(x) via inverse CDF.
   * 2. Channel A is assigned with probability p_A(x) / g(x) = 0.5 * (1 + sin(2*theta) * cos(2*phi)).
   *    Otherwise, channel B is assigned.
   * This guarantees that the all-hits distribution is EXACTLY g(x) for all theta!
   */
  sample(mode: EraserMode, rng: () => number = Math.random): EraserSample {
    if (mode === "plain") {
      // Mode 1: Plain double slit interference fringes
      const u = rng();
      const x = this.sampleFromCDF(this.cdfP1, u);
      return { x, channel: "ALL" };
    }

    if (mode === "tagged") {
      // Mode 2: Which-path tagged (Slit 1 = H, Slit 2 = V)
      // Orthogonal polarizations yield p(x) = g(x) without interference fringes.
      const u = rng();
      const x = this.sampleFromCDF(this.cdfG, u);
      const slitTag: SlitTag = rng() < 0.5 ? "H" : "V";
      return { x, channel: "ALL", slitTag };
    }

    // Mode 3: Tagged + Analyzer at angle theta
    const u = rng();
    const x = this.sampleFromCDF(this.cdfG, u);

    const phi = computePhi(x, this.config);
    const sin2Theta = Math.sin(2 * this.config.theta);
    const probA = 0.5 * (1.0 + sin2Theta * Math.cos(2 * phi));

    const channel: EraserChannel = rng() < probA ? "A" : "B";
    return { x, channel };
  }
}
