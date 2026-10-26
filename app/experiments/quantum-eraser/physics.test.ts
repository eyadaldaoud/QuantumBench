import { describe, expect, it } from "vitest";
import {
  computeFringeSpacing,
  computeVisibility,
  createRNG,
  DEFAULT_CONFIG,
  QuantumEraserConfig,
  QuantumEraserModel,
} from "./physics";

/**
 * Standard regularized upper incomplete gamma function Q(s, x) = 1 - P(s, x)
 * used to compute chi-square p-values: p = Q(df / 2, chi2 / 2).
 */
function logGamma(x: number): number {
  const p = [
    676.5203681287691,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109583152912,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) a += p[i] / (x + i + 1);
  const t = x + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function gammaP(s: number, z: number): number {
  if (z <= 0) return 0.0;
  if (z < s + 1.0) {
    let sum = 1.0 / s;
    let term = 1.0 / s;
    for (let k = 1; k < 120; k++) {
      term *= z / (s + k);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-z + s * Math.log(z) - logGamma(s));
  } else {
    const tiny = 1e-30;
    let b = z + 1.0 - s;
    let c = 1.0 / tiny;
    let d = 1.0 / b;
    let f = d;
    for (let i = 1; i < 150; i++) {
      const an = -i * (i - s);
      b += 2.0;
      d = an * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1.0 / d;
      const delta = d * c;
      f *= delta;
      if (Math.abs(delta - 1.0) < 1e-15) break;
    }
    const q = Math.exp(-z + s * Math.log(z) - logGamma(s)) * f;
    return 1.0 - q;
  }
}

export function chiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0 || df <= 0) return 1.0;
  const p = 1.0 - gammaP(df / 2, chi2 / 2);
  return Math.max(0.0, Math.min(1.0, p));
}

describe("Quantum Eraser Physics Module", () => {
  const thetaDegs = [0, 15, 30, 45, 60, 90];

  // --------------------------------------------------------------------------
  // STEP 7a: p_A + p_B equals g to within 1e-9 at every grid point for several theta
  // --------------------------------------------------------------------------
  it("STEP 7a: verifies p_A(x) + p_B(x) == g(x) within 1e-9 at every grid point", () => {
    for (const deg of thetaDegs) {
      const thetaRad = (deg * Math.PI) / 180;
      const model = new QuantumEraserModel({ ...DEFAULT_CONFIG, theta: thetaRad });

      for (let i = 0; i < model.nPoints; i++) {
        const sum = model.pA[i] + model.pB[i];
        const gVal = model.g[i];
        const diff = Math.abs(sum - gVal);
        expect(diff).toBeLessThan(1e-9);
      }
    }
  });

  // --------------------------------------------------------------------------
  // STEP 7b: Measured visibility of p_A/g equals |sin(2*theta)| within 0.02
  // --------------------------------------------------------------------------
  it("STEP 7b: verifies measured visibility of p_A/g equals |sin(2*theta)| within 0.02", () => {
    for (const deg of thetaDegs) {
      const thetaRad = (deg * Math.PI) / 180;
      const expectedV = computeVisibility(thetaRad);

      const model = new QuantumEraserModel({ ...DEFAULT_CONFIG, theta: thetaRad });

      // Measure visibility directly from the ratio function p_A(x) / g(x) across the grid
      let maxRatio = -Infinity;
      let minRatio = Infinity;
      for (let i = 0; i < model.nPoints; i++) {
        if (model.g[i] > 1e-4) {
          const ratio = model.pA[i] / model.g[i];
          if (ratio > maxRatio) maxRatio = ratio;
          if (ratio < minRatio) minRatio = ratio;
        }
      }

      const measuredV = (maxRatio - minRatio) / (maxRatio + minRatio);
      expect(Math.abs(measuredV - expectedV)).toBeLessThan(0.02);
    }
  });

  // --------------------------------------------------------------------------
  // STEP 7c: Fringe spacing equals lambda * L / d within 2%
  // --------------------------------------------------------------------------
  it("STEP 7c: verifies fringe spacing equals lambda*L/d within 2%", () => {
    const config: QuantumEraserConfig = {
      ...DEFAULT_CONFIG,
      theta: Math.PI / 4,
    };
    const model = new QuantumEraserModel(config);
    const expectedSpacing = computeFringeSpacing(config);

    // Find local peaks of pA near the center
    const peaks: number[] = [];
    for (let i = 1; i < model.nPoints - 1; i++) {
      if (model.pA[i] > model.pA[i - 1] && model.pA[i] > model.pA[i + 1]) {
        peaks.push(model.xGrid[i]);
      }
    }

    expect(peaks.length).toBeGreaterThan(4);

    // Central peak index
    let centerPeakIdx = 0;
    let minAbs = Infinity;
    for (let k = 0; k < peaks.length; k++) {
      if (Math.abs(peaks[k]) < minAbs) {
        minAbs = Math.abs(peaks[k]);
        centerPeakIdx = k;
      }
    }

    const nextPeak = peaks[centerPeakIdx + 1];
    const centerPeak = peaks[centerPeakIdx];
    const measuredSpacing = nextPeak - centerPeak;

    const relError = Math.abs(measuredSpacing - expectedSpacing) / expectedSpacing;
    expect(relError).toBeLessThan(0.02);
  });

  // --------------------------------------------------------------------------
  // STEP 7d: Peaks of A and B are offset by half a fringe spacing within 5%
  // --------------------------------------------------------------------------
  it("STEP 7d: verifies peaks of A and B are offset by half a fringe spacing within 5%", () => {
    const config: QuantumEraserConfig = {
      ...DEFAULT_CONFIG,
      theta: Math.PI / 4,
    };
    const model = new QuantumEraserModel(config);
    const halfFringe = computeFringeSpacing(config) / 2.0;

    // Find peaks of pA
    const peaksA: number[] = [];
    for (let i = 1; i < model.nPoints - 1; i++) {
      if (model.pA[i] > model.pA[i - 1] && model.pA[i] > model.pA[i + 1]) {
        peaksA.push(model.xGrid[i]);
      }
    }

    // Find peaks of pB
    const peaksB: number[] = [];
    for (let i = 1; i < model.nPoints - 1; i++) {
      if (model.pB[i] > model.pB[i - 1] && model.pB[i] > model.pB[i + 1]) {
        peaksB.push(model.xGrid[i]);
      }
    }

    // Central peak of A is at x = 0
    let peakA0 = 0;
    let minAbsA = Infinity;
    for (const p of peaksA) {
      if (Math.abs(p) < minAbsA) {
        minAbsA = Math.abs(p);
        peakA0 = p;
      }
    }

    // Nearest positive peak of B
    let nearestPeakB = Infinity;
    for (const p of peaksB) {
      if (p > peakA0 && p < nearestPeakB) {
        nearestPeakB = p;
      }
    }

    const measuredOffset = nearestPeakB - peakA0;
    const relError = Math.abs(measuredOffset - halfFringe) / halfFringe;
    expect(relError).toBeLessThan(0.05);
  });

  // --------------------------------------------------------------------------
  // STEP 7e: The all-hits histogram in mode 3 matches mode 2 for every theta (p > 0.01)
  // --------------------------------------------------------------------------
  it("STEP 7e: verifies all-hits histogram in mode 3 matches mode 2 for every theta (chi-square p > 0.01)", () => {
    const nSamples = 200_000;
    const nBins = 50;
    const binW = (DEFAULT_CONFIG.xMax - DEFAULT_CONFIG.xMin) / nBins;

    // Sample Mode 2 baseline hits
    const rng2 = createRNG(1001);
    const modelMode2 = new QuantumEraserModel(DEFAULT_CONFIG);
    const binsMode2 = new Float64Array(nBins);

    for (let s = 0; s < nSamples; s++) {
      const sample = modelMode2.sample("tagged", rng2);
      const binIdx = Math.floor((sample.x - DEFAULT_CONFIG.xMin) / binW);
      if (binIdx >= 0 && binIdx < nBins) {
        binsMode2[binIdx]++;
      }
    }

    // Compare with Mode 3 for each theta
    for (let degIdx = 0; degIdx < thetaDegs.length; degIdx++) {
      const deg = thetaDegs[degIdx];
      const thetaRad = (deg * Math.PI) / 180;
      const modelMode3 = new QuantumEraserModel({ ...DEFAULT_CONFIG, theta: thetaRad });

      const rng3 = createRNG(2000 + degIdx * 100);
      const binsMode3 = new Float64Array(nBins);

      for (let s = 0; s < nSamples; s++) {
        const sample = modelMode3.sample("analyzer", rng3);
        const binIdx = Math.floor((sample.x - DEFAULT_CONFIG.xMin) / binW);
        if (binIdx >= 0 && binIdx < nBins) {
          binsMode3[binIdx]++;
        }
      }

      // Two-sample Chi-Square test across bins
      let chi2 = 0;
      let validBins = 0;
      for (let b = 0; b < nBins; b++) {
        const o2 = binsMode2[b];
        const o3 = binsMode3[b];
        const pooled = o2 + o3;
        if (pooled > 20) {
          const e = pooled / 2.0;
          chi2 += Math.pow(o2 - e, 2) / e + Math.pow(o3 - e, 2) / e;
          validBins++;
        }
      }

      const df = validBins - 1;
      const pVal = chiSquarePValue(chi2, df);
      expect(pVal).toBeGreaterThan(0.01);
    }
  });

  // --------------------------------------------------------------------------
  // STEP 7f: Each sampled histogram matches its analytic density (chi-square p > 0.01)
  // --------------------------------------------------------------------------
  it("STEP 7f: verifies sampled histograms match analytic densities (chi-square p > 0.01)", () => {
    const nSamples = 200_000;
    const nBins = 50;
    const binW = (DEFAULT_CONFIG.xMax - DEFAULT_CONFIG.xMin) / nBins;

    function getExpectedCounts(cdf: Float64Array, totalCount: number, model: QuantumEraserModel): Float64Array {
      const expected = new Float64Array(nBins);
      const step = (model.nPoints - 1) / nBins;
      for (let b = 0; b < nBins; b++) {
        const idx0 = Math.round(b * step);
        const idx1 = Math.round((b + 1) * step);
        const prob = cdf[idx1] - cdf[idx0];
        expected[b] = prob * totalCount;
      }
      return expected;
    }

    // 1. Mode 1 (Plain double slit)
    {
      const model1 = new QuantumEraserModel(DEFAULT_CONFIG);
      const rng1 = createRNG(7771);
      const obs1 = new Float64Array(nBins);

      for (let s = 0; s < nSamples; s++) {
        const sample = model1.sample("plain", rng1);
        const b = Math.floor((sample.x - DEFAULT_CONFIG.xMin) / binW);
        if (b >= 0 && b < nBins) obs1[b]++;
      }

      const exp1 = getExpectedCounts(model1.cdfP1, nSamples, model1);
      let chi2 = 0;
      let valid = 0;
      for (let b = 0; b < nBins; b++) {
        if (exp1[b] >= 25) {
          chi2 += Math.pow(obs1[b] - exp1[b], 2) / exp1[b];
          valid++;
        }
      }
      const pVal = chiSquarePValue(chi2, valid - 1);
      expect(pVal).toBeGreaterThan(0.01);
    }

    // 2. Mode 2 (Which-path tagged)
    {
      const model2 = new QuantumEraserModel(DEFAULT_CONFIG);
      const rng2 = createRNG(7772);
      const obs2 = new Float64Array(nBins);

      for (let s = 0; s < nSamples; s++) {
        const sample = model2.sample("tagged", rng2);
        const b = Math.floor((sample.x - DEFAULT_CONFIG.xMin) / binW);
        if (b >= 0 && b < nBins) obs2[b]++;
      }

      const exp2 = getExpectedCounts(model2.cdfG, nSamples, model2);
      let chi2 = 0;
      let valid = 0;
      for (let b = 0; b < nBins; b++) {
        if (exp2[b] >= 25) {
          chi2 += Math.pow(obs2[b] - exp2[b], 2) / exp2[b];
          valid++;
        }
      }
      const pVal = chiSquarePValue(chi2, valid - 1);
      expect(pVal).toBeGreaterThan(0.01);
    }

    // 3. Mode 3 (Analyzer: Channel A and Channel B)
    {
      const model3 = new QuantumEraserModel({ ...DEFAULT_CONFIG, theta: Math.PI / 4 });
      const rng3 = createRNG(7773);
      const obsA = new Float64Array(nBins);
      const obsB = new Float64Array(nBins);

      for (let s = 0; s < nSamples; s++) {
        const sample = model3.sample("analyzer", rng3);
        const b = Math.floor((sample.x - DEFAULT_CONFIG.xMin) / binW);
        if (b >= 0 && b < nBins) {
          if (sample.channel === "A") obsA[b]++;
          else if (sample.channel === "B") obsB[b]++;
        }
      }

      // Channel A test
      const expA = getExpectedCounts(model3.cdfPA, nSamples, model3);
      let chi2A = 0;
      let validA = 0;
      for (let b = 0; b < nBins; b++) {
        if (expA[b] >= 25) {
          chi2A += Math.pow(obsA[b] - expA[b], 2) / expA[b];
          validA++;
        }
      }
      const pValA = chiSquarePValue(chi2A, validA - 1);
      expect(pValA).toBeGreaterThan(0.01);

      // Channel B test
      const expB = getExpectedCounts(model3.cdfPB, nSamples, model3);
      let chi2B = 0;
      let validB = 0;
      for (let b = 0; b < nBins; b++) {
        if (expB[b] >= 25) {
          chi2B += Math.pow(obsB[b] - expB[b], 2) / expB[b];
          validB++;
        }
      }
      const pValB = chiSquarePValue(chi2B, validB - 1);
      expect(pValB).toBeGreaterThan(0.01);
    }
  });

  // --------------------------------------------------------------------------
  // STEP 7g: Each channel receives about 50% of hits (within 2%)
  // --------------------------------------------------------------------------
  it("STEP 7g: verifies each channel receives about 50% of hits (within 2%)", () => {
    const nSamples = 200_000;

    for (const deg of thetaDegs) {
      const thetaRad = (deg * Math.PI) / 180;
      const model = new QuantumEraserModel({ ...DEFAULT_CONFIG, theta: thetaRad });
      const rng = createRNG(9999 + deg);

      let countA = 0;
      let countB = 0;

      for (let s = 0; s < nSamples; s++) {
        const sample = model.sample("analyzer", rng);
        if (sample.channel === "A") countA++;
        else if (sample.channel === "B") countB++;
      }

      const fracA = countA / nSamples;
      const fracB = countB / nSamples;

      expect(fracA).toBeGreaterThanOrEqual(0.48);
      expect(fracA).toBeLessThanOrEqual(0.52);

      expect(fracB).toBeGreaterThanOrEqual(0.48);
      expect(fracB).toBeLessThanOrEqual(0.52);
    }
  });
});
