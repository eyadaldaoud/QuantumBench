export type ExperimentCategory =
  | "Quantum Mechanics"
  | "Wave Optics"
  | "Modern Physics"
  | "Quantum Optics"
  | "Quantum Information";

export type ExperimentStatus = "active" | "in-development" | "planned";

export type ExperimentDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface PhysicsFormula {
  label: string;
  math: string;
  description: string;
}

export interface ExperimentMetadata {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ExperimentCategory;
  status: ExperimentStatus;
  difficulty: ExperimentDifficulty;
  route: string;
  icon: string;
  accentColor: string;
  accentGlow: string;
  summary: string;
  historicalContext: {
    year: string;
    discoverers: string;
    significance: string;
  };
  keyFormulas: PhysicsFormula[];
  learningOutcomes: string[];
  tags: string[];
  features: string[];
  roadmapMilestone?: string;
}

export const EXPERIMENTS: ExperimentMetadata[] = [
  {
    id: "double-slit",
    slug: "double-slit",
    title: "The Double-Slit Experiment",
    subtitle: "Wave-Particle Duality & The Quantum Observer Effect",
    category: "Quantum Mechanics",
    status: "active",
    difficulty: "Beginner",
    route: "/experiments/double-slit",
    icon: "🌊",
    accentColor: "#38e1ff",
    accentGlow: "rgba(56, 225, 255, 0.25)",
    summary:
      "Witness photons travel as wave superpositions through dual apertures to produce interference fringes, and watch the wave collapse into classical particle bands when an observer detector is engaged.",
    historicalContext: {
      year: "1801 / 1927 / 1989",
      discoverers: "Thomas Young (light), Davisson & Germer (electrons), Tonomura (single electrons)",
      significance:
        "Feynman called it 'a phenomenon which is impossible to explain in any classical way, and which has in it the heart of quantum mechanics.'",
    },
    keyFormulas: [
      {
        label: "Fringe Spacing",
        math: "y_m = (m · λ · L) / d",
        description: "Distance between interference maxima on the detector screen",
      },
      {
        label: "Total Intensity",
        math: "I(θ) = I₀ · cos²(π·d·sinθ / λ) · sinc²(π·a·sinθ / λ)",
        description: "Combined dual-slit interference and single-slit diffraction envelope",
      },
      {
        label: "de Broglie Wavelength",
        math: "λ = h / p",
        description: "Matter-wave relation connecting momentum to wavelength",
      },
      {
        label: "Heisenberg Uncertainty",
        math: "Δx · Δp ≥ ℏ / 2",
        description: "Fundamental limit on knowing which slit a photon traverses",
      },
    ],
    learningOutcomes: [
      "Observe constructive and destructive wave interference from dual slit apertures.",
      "Understand how single-photon accumulation forms interference over time.",
      "Experience the quantum observer effect and measurement-induced decoherence.",
      "Analyze the impact of wavelength (color) on fringe spatial frequency.",
    ],
    tags: ["Wave-Particle Duality", "Interference", "Observer Effect", "Decoherence", "Photons"],
    features: [
      "Real-time Three.js 3D apparatus with dual slits, laser, and phosphor screen",
      "Interactive Observer Toggle: Wave Superposition vs Classical Collapse",
      "Dynamic Wavelength Tuning (390nm - 700nm) with true spectral physics colors",
      "Monte Carlo single-photon stochastic sampling algorithm",
      "Analytical live probability distribution plot with histogram overlay",
      "Web Audio particle-detection synthesizer chimes",
      "5 camera presets (Perspective, Beam Axis, Detector, Slits, Overhead)",
      "Speed controls (0.1x ultra slow-mo to 4x high speed)",
      "Integrated YouTube video guide with key timestamp chapter jumps",
    ],
  },
];

export function getAllExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS;
}

export function getActiveExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS.filter((exp) => exp.status === "active");
}

export function getPlannedExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS.filter((exp) => exp.status !== "active");
}

export function getExperimentBySlug(slug: string): ExperimentMetadata | undefined {
  return EXPERIMENTS.find((exp) => exp.slug === slug);
}
