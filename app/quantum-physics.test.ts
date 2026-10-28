import { describe, expect, it } from "vitest";
import {
  APPARATUS_GEOMETRY,
  computeFringeSpacing,
  computeIntensity,
  PhysicsParams,
  samplePhotonImpact,
  sinc,
  wavelengthToColor,
} from "./quantum-physics";

describe("Double-Slit Quantum Physics Module", () => {
  // --------------------------------------------------------------------------
  // 1. Cardinal Sine (sinc) Mathematical Fidelity
  // --------------------------------------------------------------------------
  describe("sinc function", () => {
    it("returns 1.0 at u = 0 (removable singularity limit)", () => {
      expect(sinc(0)).toBe(1.0);
      expect(sinc(1e-12)).toBe(1.0);
      expect(sinc(-1e-12)).toBe(1.0);
    });

    it("evaluates roots at integer multiples of pi", () => {
      expect(Math.abs(sinc(Math.PI))).toBeLessThan(1e-6);
      expect(Math.abs(sinc(2 * Math.PI))).toBeLessThan(1e-6);
      expect(Math.abs(sinc(-Math.PI))).toBeLessThan(1e-6);
    });

    it("satisfies even parity symmetry: sinc(-u) == sinc(u)", () => {
      const testValues = [0.1, 0.5, 1.25, 2.7, 5.0, 10.3];
      for (const u of testValues) {
        expect(sinc(-u)).toBeCloseTo(sinc(u), 10);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Wave Superposition Interference & Sinc² Envelope
  // --------------------------------------------------------------------------
  describe("Wave Superposition (whichPath = false)", () => {
    const params532: PhysicsParams = { wavelengthNm: 532, whichPath: false };

    it("produces central constructive interference peak at z = 0", () => {
      const centerIntensity = computeIntensity(0, params532);
      expect(centerIntensity).toBeCloseTo(1.0, 4);
    });

    it("exhibits strictly even spatial symmetry I(-z) == I(z)", () => {
      for (let z = 0.05; z <= 1.8; z += 0.05) {
        const positiveZ = computeIntensity(z, params532);
        const negativeZ = computeIntensity(-z, params532);
        expect(positiveZ).toBeCloseTo(negativeZ, 8);
      }
    });

    it("reaches destructive interference minima where cos²(alpha) = 0", () => {
      // waveFreq = 3.4 at 532nm -> first minimum at alpha = pi/2 => z = pi / (2 * 3.4) ≈ 0.462 m
      const minZ = Math.PI / (2 * 3.4);
      const intensityAtMin = computeIntensity(minZ, params532);
      expect(intensityAtMin).toBeLessThan(0.01);
    });

    it("modulates secondary peaks through the single-slit sinc² diffraction envelope", () => {
      // First secondary constructive maximum occurs near alpha ≈ pi => z ≈ pi / 3.4 ≈ 0.924 m
      const secondPeakZ = Math.PI / 3.4;
      const secondPeakIntensity = computeIntensity(secondPeakZ, params532);

      // Diffraction envelope sinc²(beta) where beta = alpha * (a / d) = pi * (0.36 / 1.10) ≈ 1.028
      // sinc(1.028) ≈ sin(1.028)/1.028 ≈ 0.833 => sinc² ≈ 0.694
      expect(secondPeakIntensity).toBeLessThan(1.0);
      expect(secondPeakIntensity).toBeGreaterThan(0.5);
    });

    it("scales fringe spacing linearly with optical wavelength lambda", () => {
      const deltaZ405 = computeFringeSpacing(405);
      const deltaZ532 = computeFringeSpacing(532);
      const deltaZ650 = computeFringeSpacing(650);

      // Violet has tighter fringes than green, green tighter than red
      expect(deltaZ405).toBeLessThan(deltaZ532);
      expect(deltaZ532).toBeLessThan(deltaZ650);

      // Linear scaling: deltaZ / lambda is constant
      const ratio405 = deltaZ405 / 405;
      const ratio532 = deltaZ532 / 532;
      const ratio650 = deltaZ650 / 650;
      expect(ratio405).toBeCloseTo(ratio532, 6);
      expect(ratio650).toBeCloseTo(ratio532, 6);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Observer Decoherence & Classical Which-Path Mixture
  // --------------------------------------------------------------------------
  describe("Observer Effect & Decoherence (whichPath = true)", () => {
    const paramsObserved: PhysicsParams = { wavelengthNm: 532, whichPath: true };

    it("destroys interference fringes, yielding a central valley at z = 0", () => {
      const centerIntensity = computeIntensity(0, paramsObserved);
      // In observed mode: I(0) = exp(-(0.55 / 0.36)^2) ≈ exp(-2.334) ≈ 0.0969 < 0.15
      expect(centerIntensity).toBeLessThan(0.15);
      expect(centerIntensity).toBeGreaterThan(0.05);
    });

    it("forms two classical particle peaks centered behind each slit aperture", () => {
      const peakLeft = computeIntensity(-APPARATUS_GEOMETRY.slitOffset, paramsObserved);
      const peakRight = computeIntensity(APPARATUS_GEOMETRY.slitOffset, paramsObserved);

      // At z = ±0.55m: I = 0.5 * (1 + exp(-(1.1/0.36)^2)) ≈ 0.500
      expect(peakLeft).toBeCloseTo(0.5, 2);
      expect(peakRight).toBeCloseTo(0.5, 2);

      // Peaks must be substantially brighter than the center valley (two separate piles)
      const center = computeIntensity(0, paramsObserved);
      expect(peakLeft).toBeGreaterThan(center * 4.5);
      expect(peakRight).toBeGreaterThan(center * 4.5);
    });

    it("satisfies even spatial symmetry I(-z) == I(z)", () => {
      for (let z = 0.1; z <= 1.8; z += 0.1) {
        expect(computeIntensity(-z, paramsObserved)).toBeCloseTo(computeIntensity(z, paramsObserved), 8);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. Monte Carlo Single-Photon Stochastic Sampling
  // --------------------------------------------------------------------------
  describe("Single-Photon Monte Carlo Sampler", () => {
    it("stochastically chooses Slit A and Slit B with equal 50% probability in observed mode", () => {
      const params: PhysicsParams = { wavelengthNm: 532, whichPath: true };
      let slitACount = 0;
      let slitBCount = 0;
      const N = 2000;

      for (let i = 0; i < N; i++) {
        const hit = samplePhotonImpact(params);
        if (hit.slitChoice === -1) slitACount++;
        else slitBCount++;
      }

      // 50% +/- 4% at N = 2000
      expect(slitACount / N).toBeGreaterThan(0.46);
      expect(slitACount / N).toBeLessThan(0.54);
    });

    it("clusters impacts around the respective slit centers in observed mode", () => {
      const params: PhysicsParams = { wavelengthNm: 532, whichPath: true };
      let sumZA = 0;
      let countA = 0;
      let sumZB = 0;
      let countB = 0;
      const N = 3000;

      for (let i = 0; i < N; i++) {
        const hit = samplePhotonImpact(params);
        if (hit.slitChoice === -1) {
          sumZA += hit.z;
          countA++;
        } else {
          sumZB += hit.z;
          countB++;
        }
      }

      const meanZA = sumZA / countA;
      const meanZB = sumZB / countB;

      // Centered at z = -0.55m and z = +0.55m within statistical margin
      expect(meanZA).toBeCloseTo(-APPARATUS_GEOMETRY.slitOffset, 1);
      expect(meanZB).toBeCloseTo(APPARATUS_GEOMETRY.slitOffset, 1);
    });

    it("samples symmetrically around optical center in wave superposition mode", () => {
      const params: PhysicsParams = { wavelengthNm: 532, whichPath: false };
      let sumZ = 0;
      const N = 3000;

      for (let i = 0; i < N; i++) {
        const hit = samplePhotonImpact(params);
        sumZ += hit.z;
      }

      const meanZ = sumZ / N;
      // Expect mean position close to 0
      expect(Math.abs(meanZ)).toBeLessThan(0.06);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Spectral Physics Wavelength-to-Color Conversion
  // --------------------------------------------------------------------------
  describe("wavelengthToColor spectral mapping", () => {
    it("returns valid normalized RGB coordinates and valid hex strings across the spectrum", () => {
      for (let wl = 390; wl <= 700; wl += 10) {
        const col = wavelengthToColor(wl);
        expect(col.r).toBeGreaterThanOrEqual(0);
        expect(col.r).toBeLessThanOrEqual(1);
        expect(col.g).toBeGreaterThanOrEqual(0);
        expect(col.g).toBeLessThanOrEqual(1);
        expect(col.b).toBeGreaterThanOrEqual(0);
        expect(col.b).toBeLessThanOrEqual(1);
        expect(col.hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it("correctly identifies dominant chromatic spectral channels", () => {
      // Violet (405nm): high blue
      const violet = wavelengthToColor(405);
      expect(violet.b).toBeGreaterThan(violet.g);

      // Green (532nm): dominant green
      const green = wavelengthToColor(532);
      expect(green.g).toBeGreaterThan(green.r);
      expect(green.g).toBeGreaterThan(green.b);

      // Red (650nm): dominant red
      const red = wavelengthToColor(650);
      expect(red.r).toBeGreaterThan(red.g);
      expect(red.r).toBeGreaterThan(red.b);
      expect(red.g).toBe(0);
    });
  });
});
