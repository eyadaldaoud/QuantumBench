<div align="center">

# ⚛️ QuantaLab
### Virtual 3D Quantum & Modern Physics Laboratory

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

An open-source, interactive 3D laboratory platform designed for students, educators, and researchers to visualize, manipulate, and explore foundational quantum mechanical and modern physics phenomena directly in the browser.

[**Explore Experiments Hub**](http://localhost:3000) • [**Launch Double-Slit Lab**](http://localhost:3000/experiments/double-slit) • [**Developer Guide**](./docs/ADDING_AN_EXPERIMENT.md)

</div>

---

## 🌌 Overview

Modern physics often deals with phenomena that defy everyday classical intuition: wave-particle duality, quantum superposition, measurement collapse, and spin quantization. **QuantaLab** provides high-fidelity, real-time 3D apparatuses where users can control optical benches, adjust physical parameters, trigger quantum detectors, and observe the resulting quantum states firsthand.

The platform is designed with an **extensible multi-experiment architecture**, serving as a launchpad for a suite of interactive quantum simulations.

---

## 🧪 Available Simulations

| Experiment | Category | Status | Key Physics Concepts | Primary Formula |
| :--- | :--- | :---: | :--- | :--- |
| **[The Double-Slit Experiment](./app/experiments/double-slit/)** | Quantum Mechanics | **LIVE NOW** | Wave-particle duality, superposition, observer effect collapse | $y_m = \frac{m \lambda L}{d}$ |

> **Note on Platform Expansion**: QuantaLab is designed from the ground up to support multiple quantum and modern physics simulations. The underlying experiment registry (`lib/experiments.ts`) and modular routing system (`app/experiments/[slug]`) allow additional interactive experiments to be added seamlessly.

---

## 🌊 Featured Simulation: The Double-Slit Experiment

The Double-Slit Experiment demonstrates the central paradox of quantum mechanics: matter and light exhibit both wave-like and particle-like properties.

```
       [Laser Source]
             |
             v
       [===  |  ===]  Double Slits (Width: a, Separation: d)
             |
             +-----> Without Detector: Wave Superposition ===> 5+ Interference Fringes
             |
             +-----> With Detector: Particle Collapse ====> 2 Classical Bands
             v
       [Phosphor Screen]  Detector Screen (Distance: L)
```

### Key Interactive Features

- **In-Viewport Flight HUD**: All primary controls (Observer Toggle, Camera Angles, Sound, Wave Overlay, Clear Hits, Fullscreen) are seamlessly docked inside the 3D viewport canvas.
- **Wave Superposition Mode**: Photons propagate as continuous spherical wavelets through both apertures simultaneously, producing alternating constructive and destructive interference fringes.
- **Physical Observer Collapse**: Engaging slit detectors reveals "which-path" information, destroying superposition and collapsing the hit pattern into two classical particle bands.
- **Continuous Spectral Tuning**: Dynamic laser wavelength calibration from **390 nm** (Violet) to **700 nm** (Red) with accurate physical RGB rendering.
- **Playback & Speed Controls**: Adjust simulation speed from **0.1x ultra slow-motion** (to inspect wavepacket splitting) up to **4x speed** for rapid statistical accumulation.
- **Analytical Probability Distribution**: Real-time closed-form intensity plot overlaid with live Monte Carlo histogram bins.
- **Web Audio Particle Sonification**: High-frequency synthesizer chimes triggered on each phosphor impact, with pitch mapped to photon energy ($E = h\nu$).
- **Integrated Video Companion**: Built-in YouTube player with timestamp jumps to key experimental stages:
  - `0:00` — Classical Particles (2 Bands)
  - `1:20` — Wave Interference (Fringes)
  - `2:30` — Single Photons Creating Fringes
  - `3:50` — The Observer Effect (Decoherence)

---

## 📐 Mathematical Foundations

### 1. Dual-Slit Interference & Diffraction Envelope
The continuous probability density on the phosphor screen combines two-slit interference with single-slit diffraction:

$$I(\theta) = I_0 \cos^2\left(\frac{\pi d \sin\theta}{\lambda}\right) \operatorname{sinc}^2\left(\frac{\pi a \sin\theta}{\lambda}\right)$$

Where:
- $d$ = slit separation center-to-center
- $a$ = individual slit aperture width
- $\lambda$ = monochromatic photon wavelength
- $\theta \approx \frac{z}{L}$ in the paraxial approximation

### 2. Fringe Spacing
Constructive interference maxima appear at positions:

$$y_m = \frac{m \lambda L}{d}, \quad m \in \{0, \pm 1, \pm 2, \dots\}$$

### 3. Observer Decoherence & State Collapse
In the absence of observation, the state vector is in a pure superposition:

$$|\psi\rangle = \frac{1}{\sqrt{2}} (|\text{slit}_A\rangle + |\text{slit}_B\rangle)$$

When a physical detector measures which slit the photon traversed, environmental entanglement induces decoherence, diagonalizing the density matrix into a classical statistical mixture:

$$\hat{\rho} = \frac{1}{2} |\text{slit}_A\rangle\langle\text{slit}_A| + \frac{1}{2} |\text{slit}_B\rangle\langle\text{slit}_B|$$

---

## 🛠️ Architecture & Extensibility

QuantaLab is organized around a unified, typed experiment registry that decouples simulation logic from catalog presentation:

```
double-slit-experiment/
├── app/
│   ├── layout.tsx                   # Global RootLayout (typography, SEO metadata)
│   ├── page.tsx                     # QuantaLab Platform Hub & Interactive Catalog
│   ├── globals.css                  # Core CSS design system, flight HUDs, glassmorphism
│   ├── double-slit-lab.tsx          # 3D Double-Slit Laboratory Apparatus Component
│   ├── quantum-audio.ts             # Web Audio API quantum particle synthesizer
│   ├── quantum-physics.ts           # Analytical wave/photon math & Monte Carlo sampler
│   ├── components/
│   │   ├── Navbar.tsx               # Top navigation with experiment switcher & quick launch
│   │   ├── Footer.tsx               # Platform footer with principles and MIT license
│   │   ├── ExperimentCard.tsx       # Reusable catalog card component
│   │   └── ExperimentModal.tsx      # Rich scientific equation & roadmap modal
│   └── experiments/
│       ├── page.tsx                 # Catalog redirect
│       └── double-slit/
│           └── page.tsx             # Dedicated /experiments/double-slit route
├── lib/
│   └── experiments.ts               # Single source of truth typed experiment registry
├── docs/
│   └── ADDING_AN_EXPERIMENT.md      # Step-by-step contributor guide
└── package.json
```

### Adding a New Experiment in 3 Steps
1. Add experiment metadata in [`lib/experiments.ts`](./lib/experiments.ts).
2. Create the experiment page in `app/experiments/[slug]/page.tsx`.
3. Implement the physics calculations and Three.js apparatus.

*For full instructions, read the [Developer Guide: Adding an Experiment](./docs/ADDING_AN_EXPERIMENT.md).*

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eyadaldaoud/double-slit-experiment.git
   cd double-slit-experiment
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm run start
```

---

## 💻 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Partial Prerendering)
- **UI Library**: [React 19](https://react.dev/)
- **3D Graphics**: [Three.js](https://threejs.org/) (WebGL rendering, custom shaders, instanced particle sprites)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS custom design system
- **Sound**: Web Audio API (real-time audio synthesis without external media files)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict mode)

---

## 🤝 Contributing

Contributions from physicists, educators, and developers are warmly welcomed! You can contribute by:
- Adding a new physics experiment (e.g., Stern-Gerlach, Photoelectric Effect).
- Improving physics numerical solvers and equations.
- Enhancing 3D models and lighting.
- Translating theoretical explanations into multiple languages.

Please read [`docs/ADDING_AN_EXPERIMENT.md`](./docs/ADDING_AN_EXPERIMENT.md) before submitting a pull request.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
