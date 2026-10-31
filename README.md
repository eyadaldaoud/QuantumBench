# QuantaLab (QuantumBench)
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

[**Explore Experiments Hub**](https://thequantumbench.vercel.app/) • [**Double-Slit Lab**](https://thequantumbench.vercel.app/experiments/double-slit) • [**Quantum Eraser Lab**](https://thequantumbench.vercel.app/experiments/quantum-eraser) • [**Developer Guide**](https://github.com/eyadaldaoud/QuantumBench/blob/master/docs/ADDING_AN_EXPERIMENT.md)

</div>

---

## 🌌 Overview

Modern physics often deals with phenomena that defy everyday classical intuition: wave-particle duality, quantum superposition, measurement collapse, which-path tagging, and state erasure. **QuantaLab** provides high-fidelity, real-time 3D apparatuses where users can control optical benches, adjust physical parameters, trigger quantum detectors, and observe the resulting quantum states firsthand.

The platform is designed with an **extensible multi-experiment architecture**, featuring physically validated analytical mathematics, Monte Carlo single-particle stochastic samplers, and interactive 3D WebGL optical hardware.

---

## 🧪 Available Simulations

| Experiment | Category | Status | Key Physics Concepts | Primary Formula |
| :--- | :--- | :---: | :--- | :--- |
| **[The Double-Slit Experiment](./app/experiments/double-slit/)** | Quantum Mechanics | **LIVE NOW** | Wave-particle duality, spatial superposition, measurement-induced decoherence | $I(\theta) = I_0 \cos^2(\alpha) \operatorname{sinc}^2(\beta)$ |
| **[The Quantum Eraser](./app/experiments/quantum-eraser/)** | Quantum Information | **LIVE NOW** | Polarization which-path tagging, state erasure, complementary fringe sub-ensembles | $V = \|\sin(2\theta)\|, \quad p_A + p_B = g(x)$ |

---

## 🌊 Lab 01: The Double-Slit Experiment

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

### Key Features
- **Unified In-Viewport Flight HUD**: Sleek frosted-glass control bar with observation mode toggles, 5 camera presets, sound, wave overlay, 3D object labels, and speed controls.
- **Wave Superposition Mode**: Multi-fringe interference with bright central peak: $I(z) = I_0 \cos^2(\alpha) \operatorname{sinc}^2(\beta)$.
- **Physical Observer Decoherence**: Physical measurement collapses phase coherence into two classical particle bands centered directly behind each slit ($z = \pm 0.55\text{ m}$) with visibility $V = 0\%$.
- **Precision Hardware 3D Models**: Cylindrical laser head with heatsink cooling fins, dovetail optical carriers with thumbscrews, and avalanche photodiode (APD) probe sensors.
- **3D Object Identity Labels**: Floating callout tags identifying the laser, optical rail, slits, detectors, and screen.
- **Monte Carlo Stochastic Rejection Sampling**: Real-time Born probability density single-photon simulator.

---

## 🪞 Lab 02: The Quantum Eraser

Based on the landmark optical experiment by **Walborn et al. (2002)** (*Phys. Rev. A* 65, 033818), this simulation demonstrates which-path information, polarization tagging, and state erasure.

```
       [UV Pump Laser]
             |
             v
       [SPDC BBO Crystal] ===> Entangled Photon Pair Generation
             |
             v
       [=== QWP-H | QWP-V ===]  Slits Tagged with Orthogonal Polarizations (H / V)
             |
             +-----> Tagged Mode: <H|V> = 0 ===> Fringes vanish without momentum disturbance
             |
             v
       [Rotatable PBS Analyzer θ]  Polarizing Beam Splitter at Angle θ
             |
             +-----> Channel A (Transmitted): p_A(x) = 0.5·g(x)·[1 + sin(2θ)·cos(2φ)] (Fringes)
             |
             +-----> Channel B (Reflected):   p_B(x) = 0.5·g(x)·[1 - sin(2θ)·cos(2φ)] (Anti-fringe)
             |
             +-----> Total Unsorted (A + B):  p_A(x) + p_B(x) = g(x)  (Flat Envelope for ALL θ)
```

### Key Features
- **SPDC BBO Crystal 3D Stage**: Real-time 3D model of a Beta-Barium Borate nonlinear crystal on a gimbal mount generating entangled pairs.
- **Quarter-Wave Plates (QWPs)**: Physical optical plates with horizontal ($H$) and vertical ($V$) polarization grating lines.
- **Polarizing Beam Splitter (PBS) Cube**: Rotatable analyzer cube with internal $45^\circ$ dielectric beam-splitting film and needle gauge indicating orientation $\theta \in [0^\circ, 90^\circ]$.
- **Dual Detection Channels**: Channel A transmitted straight to the primary detector, Channel B reflected perpendicular to a secondary detector.
- **Visibility Relation**: Live theoretical readout of $V = |\sin(2\theta)|$ (0% at $\theta=0^\circ, 90^\circ$; 100% at $\theta=45^\circ$).
- **Complementarity & No-Signaling**: Strictly verifies $p_A(x) + p_B(x) = g(x)$ — demonstrating that the all-hits distribution is always flat and fringes emerge only within correlated sub-ensembles.
- **Scientific Demystification**: Prominently clarifies why popular claims of "retrocausality" or "the future changing the past" were debunked — standard quantum mechanics and causality are fully preserved.

---

## 📐 Mathematical Foundations

### 1. Fraunhofer Dual-Slit Diffraction
$$I(\theta) = I_0 \cos^2\left(\frac{\pi d \sin\theta}{\lambda}\right) \operatorname{sinc}^2\left(\frac{\pi a \sin\theta}{\lambda}\right)$$

### 2. Quantum Eraser Channel Probabilities
$$p_A(x) = \frac{1}{2} g(x) \left[ 1 + \sin(2\theta) \cos(2\phi) \right]$$
$$p_B(x) = \frac{1}{2} g(x) \left[ 1 - \sin(2\theta) \cos(2\phi) \right]$$

Sum of complementary channels:
$$p_A(x) + p_B(x) = g(x) = \operatorname{sinc}^2\left(\frac{\pi a x}{\lambda L}\right) \quad (\forall \theta)$$

---

## 🛠️ Architecture

```
QuantumBench/
├── app/
│   ├── layout.tsx                               # Global layout, viewport & quantum icon metadata
│   ├── page.tsx                                 # QuantaLab platform catalog hub
│   ├── globals.css                              # Design system, glass HUDs, responsive breakpoints
│   ├── double-slit-lab.tsx                      # 3D Double-Slit laboratory simulation
│   ├── quantum-physics.ts                       # Double-slit Fraunhofer math & sampler
│   ├── quantum-physics.test.ts                  # Vitest suite for double-slit physics (16 tests)
│   ├── quantum-audio.ts                         # Web Audio API synthesizer
│   ├── icon.svg                                 # Quantum Wavefunction (Ψ) vector icon
│   ├── favicon.ico                              # 32x32 RGBA custom quantum favicon
│   └── experiments/
│       ├── double-slit/page.tsx                 # Route: /experiments/double-slit
│       └── quantum-eraser/
│           ├── page.tsx                         # Route: /experiments/quantum-eraser
│           ├── quantum-eraser-lab.tsx           # 3D Quantum Eraser laboratory simulation
│           ├── physics.ts                       # Pure TypeScript Quantum Eraser physics module
│           ├── physics.test.ts                  # Vitest suite for eraser physics (7 tests)
│           └── strings.ts                       # Scientifically validated copy & citations
├── lib/
│   └── experiments.ts                           # Typed experiment registry & metadata
└── docs/
    └── ADDING_AN_EXPERIMENT.md                  # Contributor guide
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eyadaldaoud/QuantumBench.git
   cd QuantumBench
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run automated physics test suites:
   ```bash
   npm test
   ```

4. Launch the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 💻 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Static Generation)
- **UI Library**: [React 19](https://react.dev/)
- **3D Graphics**: [Three.js](https://threejs.org/) (WebGL, custom physical shaders, instanced particle meshes)
- **Testing**: [Vitest](https://vitest.dev/) (23 automated physics & Monte Carlo tests)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & custom CSS glassmorphism
- **Audio**: Web Audio API (real-time synthesized particle chimes)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict mode)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
