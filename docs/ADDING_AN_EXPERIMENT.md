# Developer Guide: Adding a New Experiment to QuantaLab

Welcome to the **QuantaLab** developer guide! QuantaLab is architected to make adding new quantum and modern physics simulations straightforward, modular, and consistent.

---

## Architecture Overview

```
double-slit-experiment/
├── lib/
│   └── experiments.ts                # Central metadata registry for all experiments
├── app/
│   ├── page.tsx                      # Platform hub & experiment catalog
│   ├── components/                   # Shared UI (Navbar, Footer, ExperimentCard, Modals)
│   └── experiments/
│       ├── double-slit/              # Active: The Double-Slit Experiment
│       │   └── page.tsx
│       └── [your-experiment-slug]/   # Your new experiment
│           └── page.tsx
```

---

## Step-by-Step Implementation Guide

### Step 1: Register Your Experiment in `lib/experiments.ts`

Open [`lib/experiments.ts`](file:///Users/eyad/Downloads/double-slit-experiment/lib/experiments.ts) and add your experiment object to the `EXPERIMENTS` array:

```typescript
{
  id: "stern-gerlach",
  slug: "stern-gerlach",
  title: "The Stern-Gerlach Experiment",
  subtitle: "Space Quantization & Electron Spin-1/2 Measurement",
  category: "Quantum Mechanics",
  status: "active", // Set to "active" once your route is ready
  difficulty: "Intermediate",
  route: "/experiments/stern-gerlach",
  icon: "🧭",
  accentColor: "#ffaa3b",
  accentGlow: "rgba(255, 170, 59, 0.25)",
  summary: "Send neutral silver atoms through an inhomogeneous magnetic field...",
  historicalContext: {
    year: "1922",
    discoverers: "Otto Stern & Walther Gerlach (Frankfurt)",
    significance: "Direct experimental proof that magnetic moments in atoms take discrete orientations in space.",
  },
  keyFormulas: [
    {
      label: "Deflection Force",
      math: "F_z = μ_z · (∂B_z / ∂z)",
      description: "Force exerted by inhomogeneous gradient magnetic field on magnetic dipole",
    },
  ],
  learningOutcomes: [
    "Contrast classical continuous deflection with discrete quantum splitting.",
    "Investigate sequential Stern-Gerlach filters.",
  ],
  tags: ["Spin-1/2", "Space Quantization", "Inhomogeneous B-field"],
  features: [
    "Interactive 3D magnet geometry with pole profiles",
    "Sequential filter chaining (Z → X → Z)",
  ],
}
```

---

### Step 2: Implement the Physics Calculations

Create a dedicated physics module (e.g., `app/experiments/stern-gerlach/physics.ts` or in `lib/`):

1. **Closed-Form / Analytical Equations**: Whenever possible, compute exact wavefunctions, deflection angles, or energy eigenvalues.
2. **Monte Carlo Sampling**: When simulating single particle detections, compute the probability density $P(x) = |\psi(x)|^2$ and draw stochastic random arrivals to recreate quantum indeterminacy.
3. **State Vectors**: For spin or polarization experiments, track state vectors in Hilbert space:
   $$|\psi\rangle = c_1 |+\rangle + c_2 |-\rangle, \quad |c_1|^2 + |c_2|^2 = 1$$

---

### Step 3: Build the 3D Scene / Apparatus

Create `app/experiments/[slug]/page.tsx` with a Three.js canvas or interactive SVG/canvas renderer:

```tsx
"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import * as THREE from "three";

export default function MyExperimentLab() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Scene, Camera, Renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // 2. Add laboratory apparatus meshes, lighting, and particles
    // 3. Animation loop & cleanup
    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="quantum-studio-root">
      {/* Studio Topbar */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <Link href="/" className="back-hub-btn">
            ← CATALOG
          </Link>
          <div className="topbar-divider-v" />
          <h1 className="studio-title">STERN-GERLACH APPARATUS</h1>
        </div>
      </header>

      {/* 3D Viewport */}
      <div ref={mountRef} className="grand-viewport-section" />
    </div>
  );
}
```

---

### Step 4: Integrate Shared UI Conventions

To ensure a seamless user experience across QuantaLab:
- **Header Breadcrumb**: Always include the `<Link href="/" className="back-hub-btn">← CATALOG</Link>` button.
- **Floating In-Viewport HUD**: Place primary experiment controls (observer toggle, speed, camera presets) directly inside the 3D viewport canvas wrapper so users can interact without scrolling.
- **Audio Sonification**: Import and invoke `quantumAudio.playClick(frequency)` from `@/app/quantum-audio` on detection hits.
- **Analytical Graph**: Display a live probability distribution or telemetry histogram alongside the apparatus.

---

### Step 5: Test and Validate

1. Run the local development server:
   ```bash
   npm run dev
   ```
2. Run the type-checker and production build:
   ```bash
   npm run build
   ```
3. Verify that your new experiment displays on the home page catalog (`/`) and navigates properly to `/experiments/[slug]`.
