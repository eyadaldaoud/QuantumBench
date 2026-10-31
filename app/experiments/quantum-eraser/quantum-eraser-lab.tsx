"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { quantumAudio } from "@/app/quantum-audio";
import { wavelengthToColor } from "@/app/quantum-physics";
import {
  computeFringeSpacing,
  computeVisibility,
  DEFAULT_CONFIG,
  EraserChannel,
  EraserMode,
  QuantumEraserConfig,
  QuantumEraserModel,
} from "./physics";
import { STRINGS } from "./strings";

interface RecordedEraserHit {
  x: number; // in meters [-0.02, 0.02]
  y: number; // in meters [-0.015, 0.015]
  channel: EraserChannel;
  slitTag?: "H" | "V";
}

interface CameraPreset {
  name: string;
  id: "cinematic" | "barrel" | "detector" | "analyzer" | "overhead";
  position: THREE.Vector3;
  target: THREE.Vector3;
  description: string;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: "Overview",
    id: "cinematic",
    position: new THREE.Vector3(-4.2, 2.2, 5.0),
    target: new THREE.Vector3(0.1, 0.0, 0),
    description: "45° Optical bench overview: emitter, dual-polarizer slit stage, rotatable analyzer, and detector screen",
  },
  {
    name: "Axis",
    id: "barrel",
    position: new THREE.Vector3(-6.8, 1.25, 0.0),
    target: new THREE.Vector3(1.2, 0.15, 0.0),
    description: "Look down the optical axis through slits and polarizing beam splitter directly to the detector",
  },
  {
    name: "Screen",
    id: "detector",
    position: new THREE.Vector3(2.4, 0.35, 2.4),
    target: new THREE.Vector3(5.18, 0.1, 0),
    description: "Close-up perpendicular view of the phosphor screen and sorted interference fringes",
  },
  {
    name: "Analyzer",
    id: "analyzer",
    position: new THREE.Vector3(0.5, 0.75, 2.0),
    target: new THREE.Vector3(1.6, 0.15, 0),
    description: "Close-up of the rotating polarization analyzer and beam splitter prism",
  },
  {
    name: "Top",
    id: "overhead",
    position: new THREE.Vector3(0.0, 9.2, 0.01),
    target: new THREE.Vector3(0.0, 0.0, 0),
    description: "Top-down view of wave propagation, polarization tagging, and analyzer splitting",
  },
];

export default function QuantumEraserLab() {
  // --- Simulation State ---
  const [mode, setMode] = useState<EraserMode>("analyzer");
  const [thetaDeg, setThetaDeg] = useState<number>(45); // 0 to 90 degrees
  const [wavelengthNm, setWavelengthNm] = useState<number>(532); // 390 - 700 nm
  const [slitSeparationMm, setSlitSeparationMm] = useState<number>(0.2); // d in mm
  const [slitWidthMm, setSlitWidthMm] = useState<number>(0.04); // a in mm
  const [emissionRate, setEmissionRate] = useState<number>(18); // photons/sec
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPreset["id"]>("cinematic");
  const [activeView, setActiveView] = useState<"ALL" | "A" | "B" | "OVERLAY">("ALL");
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [singleShotTrigger, setSingleShotTrigger] = useState<number>(0);
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(false);
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(1);
  const [hits, setHits] = useState<RecordedEraserHit[]>([]);
  const hitsRef = useRef<RecordedEraserHit[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [countA, setCountA] = useState<number>(0);
  const [countB, setCountB] = useState<number>(0);

  const thetaRad = useMemo(() => (thetaDeg * Math.PI) / 180, [thetaDeg]);
  const visibility = useMemo(() => computeVisibility(thetaRad), [thetaRad]);
  const fringeSpacingMm = useMemo(
    () =>
      computeFringeSpacing({
        ...DEFAULT_CONFIG,
        wavelength: wavelengthNm * 1e-9,
        slitSeparation: slitSeparationMm * 1e-3,
        distanceToScreen: 1.0,
      }) * 1000,
    [wavelengthNm, slitSeparationMm]
  );

  const physicsConfig = useMemo<QuantumEraserConfig>(() => {
    return {
      wavelength: wavelengthNm * 1e-9,
      slitSeparation: slitSeparationMm * 1e-3,
      slitWidth: slitWidthMm * 1e-3,
      distanceToScreen: 1.0,
      theta: thetaRad,
      xMin: DEFAULT_CONFIG.xMin,
      xMax: DEFAULT_CONFIG.xMax,
      gridPoints: 2001,
    };
  }, [wavelengthNm, slitSeparationMm, slitWidthMm, thetaRad]);

  const physicsModel = useMemo(() => {
    return new QuantumEraserModel(physicsConfig);
  }, [physicsConfig]);

  const currentColor = useMemo(() => wavelengthToColor(wavelengthNm), [wavelengthNm]);

  // Keyboard shortcut listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showWalkthrough) setShowWalkthrough(false);
        else if (showTheoryModal) setShowTheoryModal(false);
        else if (isMaximized) setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMaximized, showTheoryModal, showWalkthrough]);

  const handleHit = useCallback((hit: RecordedEraserHit) => {
    setHits((prev) => {
      const next = [...prev, hit];
      const capped = next.length > 2500 ? next.slice(-2500) : next;
      hitsRef.current = capped;
      return capped;
    });
    setTotalCount((c) => c + 1);
    if (hit.channel === "A") setCountA((c) => c + 1);
    else if (hit.channel === "B") setCountB((c) => c + 1);
  }, []);

  const handleReset = useCallback(() => {
    setHits([]);
    hitsRef.current = [];
    setTotalCount(0);
    setCountA(0);
    setCountB(0);
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    quantumAudio.setEnabled(nextState);
    setSoundEnabled(nextState);
  };

  const handleSelectWalkthroughStep = (stepNumber: number) => {
    setWalkthroughStep(stepNumber);
    handleReset();
    if (stepNumber === 1) {
      setMode("plain");
      setActiveView("ALL");
      setEmissionRate(15);
      setActivePreset("detector");
    } else if (stepNumber === 2) {
      setMode("tagged");
      setActiveView("ALL");
      setEmissionRate(15);
      setActivePreset("analyzer");
    } else if (stepNumber === 3) {
      setMode("analyzer");
      setThetaDeg(45);
      setActiveView("OVERLAY");
      setEmissionRate(18);
      setActivePreset("detector");
    }
  };

  return (
    <div className="quantum-studio-root">
      {/* Topbar Header */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <Link href="/" className="back-hub-btn" title="Back to QuantaLab Experiments Catalog">
            <span className="back-arrow">←</span>
            <span>{STRINGS.experiment.breadcrumbCatalog}</span>
          </Link>
          <div className="topbar-divider-v" />
          <div className="studio-logo" aria-hidden="true">🪞</div>
          <div className="topbar-branding">
            <div className="topbar-title-row">
              <h1 className="studio-title">{STRINGS.experiment.title}</h1>
              <span className="studio-status-pill">
                <span className="status-dot-live" />
                {STRINGS.experiment.badge}
              </span>
            </div>
            <span className="studio-subtitle">{STRINGS.experiment.subtitle}</span>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="topbar-actions">
          <button
            onClick={() => setShowWalkthrough(true)}
            className="topbar-btn video-guide-btn"
            title="Open the step-by-step guided discovery walkthrough"
          >
            <span>🧭 GUIDED WALKTHROUGH</span>
          </button>

          <button
            onClick={() => setShowTheoryModal(true)}
            className="topbar-btn theory-btn"
            title="Read physical explanation of which-path tagging and state erasure"
          >
            <span>📖 THEORY &amp; MATH</span>
          </button>
        </div>
      </header>

      {/* 3D Viewport Section */}
      <section className={`grand-viewport-section ${isMaximized ? "is-maximized" : ""}`}>
        <div className="canvas-wrapper">
          <QuantumEraserScene
            mode={mode}
            thetaRad={thetaRad}
            wavelengthNm={wavelengthNm}
            slitSeparationMm={slitSeparationMm}
            slitWidthMm={slitWidthMm}
            emissionRate={emissionRate}
            speedMultiplier={speedMultiplier}
            isRunning={isRunning}
            activePreset={activePreset}
            activeView={activeView}
            showLabels={showLabels}
            onHit={handleHit}
            triggerSinglePhoton={singleShotTrigger}
            physicsModel={physicsModel}
            hitsRef={hitsRef}
          />

          {/* TOP HUD DECK: Unified Glass Control Bar */}
          <div className="viewport-top-hud">
            {/* Left: Mode Switcher */}
            <div className="hud-section">
              <div className="hud-observer-switcher">
                <div className="hud-mode-pill-group" role="group" aria-label="Quantum Eraser Mode">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("plain");
                      handleReset();
                    }}
                    className={`hud-mode-btn wave-mode ${mode === "plain" ? "active" : ""}`}
                    title={STRINGS.modes.plain.description}
                    aria-pressed={mode === "plain"}
                  >
                    <span className="hud-mode-icon">🌊</span>
                    <div className="hud-mode-content">
                      <span className="hud-mode-title">PLAIN</span>
                      <span className="hud-mode-status">WAVE INTERFERENCE</span>
                    </div>
                    {mode === "plain" && <span className="hud-pulse-dot dot-cyan" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("tagged");
                      handleReset();
                    }}
                    className={`hud-mode-btn observer-mode ${mode === "tagged" ? "active" : ""}`}
                    title={STRINGS.modes.tagged.description}
                    aria-pressed={mode === "tagged"}
                  >
                    <span className="hud-mode-icon">🏷️</span>
                    <div className="hud-mode-content">
                      <span className="hud-mode-title">TAGGED (H/V)</span>
                      <span className="hud-mode-status">WHICH-PATH (H/V)</span>
                    </div>
                    {mode === "tagged" && <span className="hud-pulse-dot dot-amber" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("analyzer");
                      handleReset();
                    }}
                    className={`hud-mode-btn analyzer-mode ${mode === "analyzer" ? "active" : ""}`}
                    title={STRINGS.modes.analyzer.description}
                    aria-pressed={mode === "analyzer"}
                  >
                    <span className="hud-mode-icon">🪞</span>
                    <div className="hud-mode-content">
                      <span className="hud-mode-title">ANALYZER ({thetaDeg}°)</span>
                      <span className="hud-mode-status">POLARIZER θ = {thetaDeg}°</span>
                    </div>
                    {mode === "analyzer" && <span className="hud-pulse-dot dot-cyan" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Center: Camera Presets */}
            <div className="hud-section hud-center-section">
              <div className="hud-camera-toolbar" role="toolbar" aria-label="Camera Presets">
                <span className="hud-deck-label">📷 CAMERA:</span>
                <div className="hud-cam-btn-group">
                  {CAMERA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setActivePreset(preset.id)}
                      className={`hud-cam-btn ${activePreset === preset.id ? "active" : ""}`}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Right: Utility Dock */}
            <div className="hud-section hud-right-section">
              <div className="hud-utility-dock">
                <button
                  onClick={toggleSound}
                  className={`hud-tool-btn ${soundEnabled ? "tool-active" : ""}`}
                  title={soundEnabled ? "Audio chimes active" : "Audio muted"}
                  aria-pressed={soundEnabled}
                >
                  <span>{soundEnabled ? "🔊 AUDIO" : "🔇 MUTED"}</span>
                </button>
                <button
                  onClick={() => setShowLabels((v) => !v)}
                  className={`hud-tool-btn ${showLabels ? "tool-active" : ""}`}
                  title="Toggle 3D object identity callouts & component labels"
                >
                  <span>🏷️ {showLabels ? "LABELS ON" : "LABELS"}</span>
                </button>


                <button
                  onClick={handleReset}
                  className="hud-tool-btn clear-btn"
                  title="Clear accumulated hits on detector screen"
                >
                  <span>↺ CLEAR</span>
                </button>

                <button
                  onClick={() => setIsMaximized((m) => !m)}
                  className={`hud-tool-btn ${isMaximized ? "tool-active" : ""}`}
                  title={isMaximized ? "Exit theater view (Esc)" : "Expand to theater view"}
                >
                  <span>{isMaximized ? "❐ EXIT" : "⛶ EXPAND"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Hint */}
          <div className="viewport-orbit-hint" aria-hidden="true">
            <span>Left-Click Drag: Rotate Apparatus • Scroll: Zoom • Right-Click: Pan</span>
          </div>

          {/* BOTTOM HUD DECK: Unified Glass Telemetry & Playback Bar */}
          <div className="viewport-bottom-hud">
            {/* Telemetry Cluster */}
            <div className="hud-section">
              <div className="hud-telemetry-cluster">
                <div className="hud-metric">
                  <span className="hud-metric-kicker">ALL HITS</span>
                  <span className="hud-metric-val">{String(totalCount).padStart(5, "0")}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">CHANNEL A (●)</span>
                  <span className="hud-metric-val val-cyan">{String(countA).padStart(5, "0")}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">CHANNEL B (▲)</span>
                  <span className="hud-metric-val val-amber">{String(countB).padStart(5, "0")}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">VISIBILITY |sin(2θ)|</span>
                  <span className="hud-metric-val val-cyan">{(visibility * 100).toFixed(1)}%</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">FRINGE Δx</span>
                  <span className="hud-metric-val">{fringeSpacingMm.toFixed(2)} mm</span>
                </div>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Playback Controls */}
            <div className="hud-section hud-center-section">
              <div className="hud-playback-cluster">
                <button
                  onClick={() => setIsRunning((r) => !r)}
                  className={`hud-stream-btn ${isRunning ? "stream-pause" : "stream-play"}`}
                  title={isRunning ? "Pause continuous photon stream" : "Resume photon stream"}
                >
                  {isRunning ? "❚❚ PAUSE" : "▶ RESUME"}
                </button>

                <button
                  onClick={() => setSingleShotTrigger((s) => s + 1)}
                  className="hud-single-btn"
                  title="Fire exactly 1 photon in slow motion"
                >
                  ⚡ FIRE 1 PHOTON
                </button>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Speed Pills */}
            <div className="hud-section hud-right-section">
              <div className="hud-speed-cluster" role="radiogroup" aria-label="Simulation Speed">
                <span className="hud-deck-label">⏱ SPEED:</span>
                <div className="hud-speed-pills">
                  {[
                    { value: 0.1, label: "0.1x" },
                    { value: 0.25, label: "0.25x" },
                    { value: 0.5, label: "0.5x" },
                    { value: 1.0, label: "1x" },
                    { value: 2.0, label: "2x" },
                    { value: 4.0, label: "4x" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSpeedMultiplier(s.value)}
                      className={`hud-speed-btn ${speedMultiplier === s.value ? "active" : ""}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Analytical Console & Control Deck */}
      <section className="dashboard-console-grid">
        {/* Left Column: Live Histogram & Analytic Intensity Plot */}
        <EraserDistributionPlot
          mode={mode}
          thetaDeg={thetaDeg}
          visibility={visibility}
          activeView={activeView}
          onSelectView={setActiveView}
          hits={hits}
          physicsModel={physicsModel}
          wavelengthColor={currentColor.hex}
        />

        {/* Right Column: Complete Interactive Control Deck */}
        <div className="controls-deck">
          {/* Card 1: Analyzer Angle θ (enabled in Analyzer mode) */}
          <div className={`control-card ${mode !== "analyzer" ? "card-dimmed" : ""}`}>
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 01 // POLARIZATION ANALYZER</span>
                <h4 className="card-subheading">{STRINGS.controls.analyzerAngle}</h4>
              </div>
              <span className="wl-spec-badge" style={{ color: "#00d4ff", borderColor: "rgba(0, 212, 255, 0.4)", backgroundColor: "rgba(0, 212, 255, 0.1)" }}>
                θ = {thetaDeg}° · V = {(visibility * 100).toFixed(1)}%
              </span>
            </div>

            <p className="card-info-note">
              {mode === "analyzer"
                ? STRINGS.controls.analyzerHelp
                : "Switch to 'Eraser Analyzer' mode above to rotate the polarizing analyzer."}
            </p>

            <div className="slider-row">
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                disabled={mode !== "analyzer"}
                value={thetaDeg}
                onChange={(e) => setThetaDeg(Number(e.target.value))}
                className="quantum-slider"
                aria-label="Analyzer orientation angle theta in degrees"
                style={
                  {
                    "--slider-color": "#00d4ff",
                    "--slider-percent": `${(thetaDeg / 90) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>

            {/* Quick Angle Shortcuts */}
            <div className="spectral-shortcuts-row">
              <span className="spectral-label">ANGLE PRESETS:</span>
              <div className="spectral-pills">
                {[
                  { deg: 0, label: "0° (H Basis)", note: "Visibility 0%" },
                  { deg: 30, label: "30°", note: "Visibility 86.6%" },
                  { deg: 45, label: "45° (Max Erasure)", note: "Visibility 100%" },
                  { deg: 60, label: "60°", note: "Visibility 86.6%" },
                  { deg: 90, label: "90° (V Basis)", note: "Visibility 0%" },
                ].map((item) => (
                  <button
                    key={item.deg}
                    type="button"
                    disabled={mode !== "analyzer"}
                    onClick={() => setThetaDeg(item.deg)}
                    className={`spectral-pill ${thetaDeg === item.deg && mode === "analyzer" ? "active" : ""}`}
                    title={`${item.label} (${item.note})`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Monochromatic Laser Wavelength */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 02 // COHERENT LIGHT SOURCE</span>
                <h4 className="card-subheading">{STRINGS.controls.wavelength}</h4>
              </div>
              <span className="wl-spec-badge" style={{ color: currentColor.hex, borderColor: `${currentColor.hex}44`, backgroundColor: `${currentColor.hex}15` }}>
                {wavelengthNm} nm · {currentColor.name}
              </span>
            </div>

            <div className="slider-row">
              <div
                className="swatch-indicator"
                style={{
                  backgroundColor: currentColor.hex,
                  boxShadow: `0 0 16px ${currentColor.hex}`,
                }}
              />
              <input
                type="range"
                min="390"
                max="700"
                step="5"
                value={wavelengthNm}
                onChange={(e) => setWavelengthNm(Number(e.target.value))}
                className="quantum-slider"
                aria-label="Laser wavelength in nanometers"
                style={
                  {
                    "--slider-color": currentColor.hex,
                    "--slider-percent": `${((wavelengthNm - 390) / (700 - 390)) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>

          {/* Card 3: Dual Aperture Geometry (d and a) */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 03 // APERTURE CALIBRATION</span>
                <h4 className="card-subheading">Aperture Spacing (d) &amp; Slit Width (a)</h4>
              </div>
              <span className="card-dim-spec">
                d = {slitSeparationMm.toFixed(2)} mm · a = {slitWidthMm.toFixed(2)} mm
              </span>
            </div>

            <div className="dual-slider-grid">
              <div className="param-slider-col">
                <div className="param-header-mini">
                  <span className="param-name">{STRINGS.controls.slitSeparation}</span>
                  <span className="param-value">{slitSeparationMm.toFixed(2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.40"
                  step="0.01"
                  value={slitSeparationMm}
                  onChange={(e) => {
                    const newD = Number(e.target.value);
                    if (newD > slitWidthMm + 0.02) setSlitSeparationMm(newD);
                  }}
                  className="quantum-slider slider-cyan"
                  aria-label="Slit separation d in millimeters"
                />
              </div>

              <div className="param-slider-col">
                <div className="param-header-mini">
                  <span className="param-name">{STRINGS.controls.slitWidth}</span>
                  <span className="param-value">{slitWidthMm.toFixed(2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.08"
                  step="0.005"
                  value={slitWidthMm}
                  onChange={(e) => {
                    const newA = Number(e.target.value);
                    if (newA < slitSeparationMm - 0.02) setSlitWidthMm(newA);
                  }}
                  className="quantum-slider slider-amber"
                  aria-label="Slit width a in millimeters"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Photon Emission Rate */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 04 // EMISSION RATE</span>
                <h4 className="card-subheading">{STRINGS.controls.particleRate}</h4>
              </div>
              <span className="rate-readout-pill">{emissionRate} photons / sec</span>
            </div>

            <div className="slider-row">
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={emissionRate}
                onChange={(e) => setEmissionRate(Number(e.target.value))}
                className="quantum-slider"
                aria-label="Photon emission rate in counts per second"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Guided Walkthrough Modal */}
      {showWalkthrough && (
        <div className="modal-backdrop" onClick={() => setShowWalkthrough(false)}>
          <div className="modal-content experiment-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="exp-modal-title-group">
                <span className="card-tag">{STRINGS.walkthrough.kicker}</span>
                <h3 className="exp-modal-title">{STRINGS.walkthrough.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkthrough(false)}
                className="modal-close-btn"
                aria-label="Close walkthrough"
              >
                ✕
              </button>
            </div>

            <div className="exp-modal-body">
              {/* Stepper Tabs */}
              <div className="walkthrough-step-tabs">
                {STRINGS.walkthrough.steps.map((st) => (
                  <button
                    key={st.stepNumber}
                    type="button"
                    onClick={() => handleSelectWalkthroughStep(st.stepNumber)}
                    className={`walkthrough-step-btn ${walkthroughStep === st.stepNumber ? "active" : ""}`}
                  >
                    <span>{st.title}</span>
                  </button>
                ))}
              </div>

              {/* Current Step Content */}
              {(() => {
                const step = STRINGS.walkthrough.steps.find((s) => s.stepNumber === walkthroughStep)!;
                return (
                  <div className="walkthrough-step-content">
                    <h4 className="step-content-title">{step.summary}</h4>
                    <p className="exp-modal-text">{step.detail}</p>

                    <div className="walkthrough-action-box">
                      <span>Applied configuration: <strong>{step.title}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectWalkthroughStep(step.stepNumber);
                          setShowWalkthrough(false);
                        }}
                        className="btn-primary-action"
                      >
                        Try This Step in Apparatus →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Key Takeaway Banner */}
              <div className="history-box takeaway-callout">
                <h4 className="exp-modal-section-title">{STRINGS.walkthrough.takeawayHeading}</h4>
                <p className="history-quote">&ldquo;{STRINGS.walkthrough.takeawayText}&rdquo;</p>
              </div>

              <div className="model-note-text">
                <em>{STRINGS.theory.modelNote}</em>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theory & Math Modal */}
      {showTheoryModal && (
        <div className="modal-backdrop" onClick={() => setShowTheoryModal(false)}>
          <div className="modal-content experiment-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="exp-modal-title-group">
                <span className="card-tag">MATHEMATICAL PHYSICS</span>
                <h3 className="exp-modal-title">{STRINGS.theory.title}</h3>
                <p className="exp-modal-sub">{STRINGS.theory.modelNote}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTheoryModal(false)}
                className="modal-close-btn"
                aria-label="Close theory modal"
              >
                ✕
              </button>
            </div>

            <div className="exp-modal-body">
              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">1. Fraunhofer Far-Field Formulation</h4>
                <p className="exp-modal-text">{STRINGS.theory.farFieldExplanation}</p>
                <div className="formula-math-code">
                  g(x) = sinc²(π·a·x / (λ·L)), &emsp; 2φ(x) = 2π·d·x / (λ·L)
                </div>
              </div>

              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">2. Orthogonal Which-Path Tagging</h4>
                <p className="exp-modal-text">{STRINGS.theory.orthogonalityExplanation}</p>
                <div className="formula-math-code">
                  |Ψ⟩ = (|1, H⟩ + |2, V⟩) / √2 &emsp;⇒&emsp; ⟨H|V⟩ = 0 &emsp;⇒&emsp; p(x) = g(x)
                </div>
              </div>

              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">3. Polarization Sorting via Analyzer at Angle θ</h4>
                <p className="exp-modal-text">{STRINGS.theory.analyzerExplanation}</p>
                <div className="formula-math-code">
                  p_A(x) = 0.5·g(x)·[1 + sin(2θ)·cos(2φ)] <br />
                  p_B(x) = 0.5·g(x)·[1 - sin(2θ)·cos(2φ)] <br />
                  p_A(x) + p_B(x) = g(x) &emsp; (for all θ)
                </div>
              </div>

              <div className="exp-modal-section history-box">
                <h4 className="exp-modal-section-title">{STRINGS.theory.learnMoreHeading}</h4>
                <p className="exp-modal-text">{STRINGS.theory.learnMoreText}</p>
              </div>

              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">{STRINGS.theory.citationsHeading}</h4>
                <ul className="citations-list">
                  {STRINGS.theory.citations.map((c, i) => (
                    <li key={i} className="citation-item">
                      <strong>{c.authors}</strong>, &ldquo;{c.title}&rdquo;, <em>{c.journal}</em> <strong>{c.volume}</strong>, {c.page} ({c.year}).
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Three.js 3D Apparatus Scene Component
// ============================================================================


function createLabelSprite(text: string, subtitle?: string, accentColor = "#a855f7"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 512, 160);

  const r = 24;
  const x = 16;
  const y = 16;
  const w = 480;
  const h = 128;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = "rgba(4, 9, 16, 0.92)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 40, y + 6, w - 80, 4);

  ctx.font = "bold 32px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, subtitle ? y + 48 : y + 64);

  if (subtitle) {
    ctx.font = "600 20px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillStyle = accentColor;
    ctx.fillText(subtitle, 256, y + 90);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.9, 0.6, 1);
  return sprite;
}

interface SceneProps {
  mode: EraserMode;
  thetaRad: number;
  wavelengthNm: number;
  slitSeparationMm: number;
  slitWidthMm: number;
  emissionRate: number;
  speedMultiplier: number;
  isRunning: boolean;
  activePreset: CameraPreset["id"];
  activeView: "ALL" | "A" | "B" | "OVERLAY";
  showLabels: boolean;
  onHit: (hit: RecordedEraserHit) => void;
  triggerSinglePhoton: number;
  physicsModel: QuantumEraserModel;
  hitsRef: React.RefObject<RecordedEraserHit[]>;
}

function QuantumEraserScene({
  mode,
  thetaRad,
  wavelengthNm,
  slitSeparationMm,
  slitWidthMm,
  emissionRate,
  speedMultiplier,
  isRunning,
  activePreset,
  activeView,
  showLabels,
  onHit,
  triggerSinglePhoton,
  physicsModel,
  hitsRef,
}: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    mode,
    thetaRad,
    wavelengthNm,
    slitSeparationMm,
    slitWidthMm,
    emissionRate,
    speedMultiplier,
    isRunning,
    activeView,
    showLabels,
    onHit,
    physicsModel,
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      thetaRad,
      wavelengthNm,
      slitSeparationMm,
      slitWidthMm,
      emissionRate,
      speedMultiplier,
      isRunning,
      activeView,
      showLabels,
      onHit,
      physicsModel,
    };
  }, [
    mode,
    thetaRad,
    wavelengthNm,
    slitSeparationMm,
    slitWidthMm,
    emissionRate,
    speedMultiplier,
    isRunning,
    activeView,
    showLabels,
    onHit,
    physicsModel,
  ]);

  const targetCamPos = useRef(CAMERA_PRESETS[0].position.clone());
  const targetCamLook = useRef(CAMERA_PRESETS[0].target.clone());
  const currentLookAt = useRef(CAMERA_PRESETS[0].target.clone());

  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === activePreset) || CAMERA_PRESETS[0];
    targetCamPos.current.copy(preset.position);
    targetCamLook.current.copy(preset.target);
  }, [activePreset]);

  const manualTriggerRef = useRef(triggerSinglePhoton);
  useEffect(() => {
    manualTriggerRef.current = triggerSinglePhoton;
  }, [triggerSinglePhoton]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let isDisposed = false;
    let isTabVisible = true;

    // Detect mobile for capping particles
    const isMobile = window.innerWidth <= 768;
    const maxParticles = isMobile ? 1200 : 2000;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05080e");
    scene.fog = new THREE.FogExp2(0x05080e, 0.02);

    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.copy(targetCamPos.current);
    camera.lookAt(targetCamLook.current);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    host.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";

    // Visibility listener
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x131f2d, 1.25);
    scene.add(ambientLight);

    const keyDirectional = new THREE.DirectionalLight(0xdcf3ff, 2.0);
    keyDirectional.position.set(-3, 8, 6);
    scene.add(keyDirectional);

    const rimLight = new THREE.DirectionalLight(0x75bdf4, 1.5);
    rimLight.position.set(4, 5, -6);
    scene.add(rimLight);

    // --- Optical Bench & Floor ---
    const floorGeo = new THREE.PlaneGeometry(36, 24);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x090e17, metalness: 0.65, roughness: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(30, 40, 0x1c3548, 0x0f1c28);
    gridHelper.position.y = -2.08;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    scene.add(gridHelper);

    const benchGroup = new THREE.Group();
    benchGroup.position.set(0, -1.82, 0);
    scene.add(benchGroup);

    const benchBodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2836, metalness: 0.85, roughness: 0.28 });
    const benchBody = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.18, 1.3), benchBodyMat);
    benchGroup.add(benchBody);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x8ab2cf, metalness: 0.98, roughness: 0.12 });
    [-0.45, 0.45].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 13.8, 24), railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0.11, z);
      benchGroup.add(rail);
    });

    // Precision Optical Carrier Stages (Thorlabs style dovetail base & stainless post)
    function createCarrierStage(xPos: number) {
      const stage = new THREE.Group();
      stage.position.set(xPos, -1.68, 0);

      // Heavy dovetail base clamp
      const clampBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.18, 1.28),
        new THREE.MeshStandardMaterial({ color: 0x182430, metalness: 0.88, roughness: 0.22 })
      );
      stage.add(clampBlock);

      // Knurled thumbscrew
      const thumbMat = new THREE.MeshStandardMaterial({ color: 0x7b99b0, metalness: 0.94, roughness: 0.18 });
      const lockScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 16), thumbMat);
      lockScrew.rotation.x = Math.PI / 2;
      lockScrew.position.set(0, 0, 0.68);
      stage.add(lockScrew);

      // Optical post holder collar
      const postHolder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.85, 24),
        new THREE.MeshStandardMaterial({ color: 0x1f2e3d, metalness: 0.86, roughness: 0.28 })
      );
      postHolder.position.set(0, 0.48, 0);
      stage.add(postHolder);

      // Stainless steel mounting post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 1.15, 24),
        new THREE.MeshStandardMaterial({ color: 0xc4d8e8, metalness: 0.96, roughness: 0.08 })
      );
      post.position.set(0, 1.18, 0);
      stage.add(post);

      return stage;
    }

    // 1. Coherent Laser Pump Head (-5.8)
    const emitterStage = createCarrierStage(-5.8);
    scene.add(emitterStage);

    const emitterHousing = new THREE.Group();
    emitterHousing.position.set(-5.8, 0.15, 0);
    scene.add(emitterHousing);

    // Cylindrical laser head with heatsink fins
    const laserHeadMat = new THREE.MeshPhysicalMaterial({
      color: 0x16222f,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 0.9,
    });
    const laserTube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 36), laserHeadMat);
    laserTube.rotation.z = Math.PI / 2;
    laserTube.position.set(-0.35, 0, 0);
    emitterHousing.add(laserTube);

    // Heatsink fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x223648, metalness: 0.85, roughness: 0.3 });
    [-1.0, -0.75, -0.5, -0.25, 0.0, 0.25].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 32), finMat);
      fin.rotation.z = Math.PI / 2;
      fin.position.set(fx, 0, 0);
      emitterHousing.add(fin);
    });

    // Optical output snout
    const snout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.36, 0.55, 32),
      new THREE.MeshStandardMaterial({ color: 0x48647e, metalness: 0.95, roughness: 0.14 })
    );
    snout.rotation.z = -Math.PI / 2;
    snout.position.set(0.95, 0, 0);
    emitterHousing.add(snout);

    // SPDC Type-I BBO Nonlinear Optical Crystal Stage with Gimbal Mount (-2.6)
    // Generates polarization-entangled photon pairs (Walborn et al. 2002)
    const spdcStage = createCarrierStage(-2.6);
    scene.add(spdcStage);

    const spdcGroup = new THREE.Group();
    spdcGroup.position.set(-2.6, 0.15, 0);
    scene.add(spdcGroup);

    // Precision gimbal mount ring
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x283b4c, metalness: 0.9, roughness: 0.2 });
    const gimbalRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 16, 36), gimbalMat);
    gimbalRing.rotation.y = Math.PI / 2;
    spdcGroup.add(gimbalRing);

    // Crystal oven / holder cell
    const cellMat = new THREE.MeshStandardMaterial({ color: 0x1d2c38, metalness: 0.85, roughness: 0.3 });
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.82, 0.62), cellMat);
    spdcGroup.add(cell);

    // Beta-Barium Borate (BBO) cut crystal prism with optical birefringence transmission
    const spdcBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x8a62cc,
      metalness: 0.05,
      roughness: 0.04,
      transmission: 0.85,
      thickness: 0.45,
      transparent: true,
      opacity: 0.92,
      emissive: 0x3b126a,
      emissiveIntensity: 0.65,
    });
    const spdcBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.68, 0.48), spdcBodyMat);
    spdcBody.rotation.y = Math.PI / 8; // Phase-matching angle cut
    spdcGroup.add(spdcBody);

    // Phase-matching emission luminescence halo
    const spdcHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.025, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65 })
    );
    spdcHalo.rotation.y = Math.PI / 2;
    spdcGroup.add(spdcHalo);

    // UV pump beam: laser -> SPDC crystal
    const pumpTubeMat = new THREE.MeshBasicMaterial({
      color: 0x6600ff,
      transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pumpTube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 2.82, 10), pumpTubeMat);
    pumpTube.rotation.z = Math.PI / 2;
    pumpTube.position.set(-4.21, 0.15, 0);
    scene.add(pumpTube);

    // Signal photon beam: SPDC crystal -> slit barrier (bright teal)
    const sigTubeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sigTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.44, 10), sigTubeMat);
    sigTube.rotation.z = Math.PI / 2;
    sigTube.position.set(-1.88, 0.15, 0);
    scene.add(sigTube);

    // 2. Dual-Slit Barrier Stage (-1.2) with Polarization Taggers
    const slitStage = createCarrierStage(-1.2);
    scene.add(slitStage);

    const barrierGroup = new THREE.Group();
    barrierGroup.position.set(-1.2, 0.15, 0);
    scene.add(barrierGroup);

    // Slit frame plate
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x141f2c, metalness: 0.85, roughness: 0.35 });
    const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.0), plateMat);
    leftPlate.position.set(0, 0, -0.95);
    barrierGroup.add(leftPlate);

    const rightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.0), plateMat);
    rightPlate.position.set(0, 0, 0.95);
    barrierGroup.add(rightPlate);

    const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.55), plateMat);
    centerDivider.position.set(0, 0, 0);
    barrierGroup.add(centerDivider);

    // Quarter-Wave Plate (QWP) at Slit 1: converts to H linear polarization
    const tagHMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d4ff, metalness: 0.0, roughness: 0.04,
      transmission: 0.6, thickness: 0.04, transparent: true, opacity: 0.75,
      emissive: 0x004466, emissiveIntensity: 0.55,
    });
    const tagHMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.65, 0.32), tagHMat);
    tagHMesh.position.set(0.02, 0, -0.55);
    barrierGroup.add(tagHMesh);

    // Horizontal polarization grating lines on QWP-1
    const hLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.85 });
    for (let ly = -0.24; ly <= 0.24; ly += 0.10) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.07, ly, -0.70),
        new THREE.Vector3(0.07, ly, -0.40),
      ]);
      barrierGroup.add(new THREE.Line(geo, hLineMat));
    }

    // Quarter-Wave Plate (QWP) at Slit 2: converts to V linear polarization
    const tagVMat = new THREE.MeshPhysicalMaterial({
      color: 0xffaa3b, metalness: 0.0, roughness: 0.04,
      transmission: 0.6, thickness: 0.04, transparent: true, opacity: 0.75,
      emissive: 0x442200, emissiveIntensity: 0.55,
    });
    const tagVMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.65, 0.32), tagVMat);
    tagVMesh.position.set(0.02, 0, 0.55);
    barrierGroup.add(tagVMesh);

    // Vertical polarization grating lines on QWP-2
    const vLineMat = new THREE.LineBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.85 });
    for (let lz = 0.40; lz <= 0.70; lz += 0.07) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.07, -0.30, lz),
        new THREE.Vector3(0.07,  0.30, lz),
      ]);
      barrierGroup.add(new THREE.Line(geo, vLineMat));
    }

    // 3. Polarizing Beam Splitter (PBS) — the quantum eraser analyzer
    // The PBS cube is the key optical element. It's oriented at angle θ from horizontal.
    // Channel A (transmitted) continues along the main beam axis to the phosphor screen.
    // Channel B (reflected at 90°) exits perpendicular and hits a secondary detector.
    const analyzerStage = createCarrierStage(1.8);
    scene.add(analyzerStage);

    const analyzerGroup = new THREE.Group();
    analyzerGroup.position.set(1.8, 0.15, 0);
    scene.add(analyzerGroup);

    // Rotatable mount ring — rotates with θ to show orientation
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x3d5a77, metalness: 0.92, roughness: 0.18 });
    const bezelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 16, 48), ringMat);
    bezelMesh.rotation.y = Math.PI / 2;
    analyzerGroup.add(bezelMesh);

    // PBS glass cube body
    const pbsMat = new THREE.MeshPhysicalMaterial({
      color: 0xdcf3ff, metalness: 0.0, roughness: 0.04,
      transmission: 0.87, thickness: 0.65, transparent: true, opacity: 0.82,
    });
    const prismMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.05, 1.05), pbsMat);
    analyzerGroup.add(prismMesh);

    // Diagonal 45° beam-splitter thin film inside PBS
    const bsFilmMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const bsFilm = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 1.5), bsFilmMat);
    bsFilm.rotation.z = Math.PI / 4;
    analyzerGroup.add(bsFilm);

    // Polarization angle indicator needle (rotates with the whole PBS mount)
    const needleMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const needleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 16), needleMat);
    needleMesh.position.set(0.30, 0.36, 0);
    analyzerGroup.add(needleMesh);

    // Channel A transmitted output beam (straight to main detector screen)
    const chanAMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff, transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const chanAArm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 3.38, 10), chanAMat);
    chanAArm.rotation.z = Math.PI / 2;
    chanAArm.position.set(3.49, 0.15, 0);
    scene.add(chanAArm);

    // Channel B reflected output beam (perpendicular, exits toward z+)
    const chanBMat = new THREE.MeshBasicMaterial({
      color: 0xff8800, transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const chanBArm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.55, 10), chanBMat);
    chanBArm.rotation.x = Math.PI / 2;
    chanBArm.position.set(1.8, 0.15, 1.28);
    scene.add(chanBArm);

    // Channel B secondary detector housing
    const detBBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.62, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0x2a1a0a, metalness: 0.85, roughness: 0.3,
        emissive: 0xff4400, emissiveIntensity: 0.07,
      })
    );
    detBBody.position.set(1.8, 0.15, 2.12);
    scene.add(detBBody);

    // Channel B detector face glow plate
    const detBFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.42 })
    );
    detBFace.rotation.x = -Math.PI / 2;
    detBFace.position.set(1.8, 0.47, 2.12);
    scene.add(detBFace);

    // 4. Phosphor Detector Screen (+5.18)
    const detectorStage = createCarrierStage(5.18);
    scene.add(detectorStage);

    const pcanvas = document.createElement("canvas");
    pcanvas.width = 1024;
    pcanvas.height = 768;
    const pctx = pcanvas.getContext("2d")!;
    pctx.fillStyle = "#03080e";
    pctx.fillRect(0, 0, 1024, 768);

    const phosphorTexture = new THREE.CanvasTexture(pcanvas);
    phosphorTexture.colorSpace = THREE.SRGBColorSpace;

    const screenHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.7, 3.9),
      new THREE.MeshStandardMaterial({ color: 0x111c28, metalness: 0.88, roughness: 0.28 })
    );
    screenHousing.position.set(5.26, 0.15, 0);
    scene.add(screenHousing);

    const phosphorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.4),
      new THREE.MeshBasicMaterial({ map: phosphorTexture, toneMapped: false })
    );
    phosphorScreen.rotation.y = -Math.PI / 2;
    phosphorScreen.position.set(5.17, 0.15, 0);
    scene.add(phosphorScreen);

    
    // --- 3D Hardware Object Annotations & Identity Callout Labels ---
    const labelsGroup = new THREE.Group();
    scene.add(labelsGroup);

    // Laser pump
    const labelPump = createLabelSprite("PUMP LASER", "Coherent UV Source", "#6600ff");
    labelPump.position.set(-5.8, 1.45, 0);
    labelsGroup.add(labelPump);

    // SPDC Crystal
    const labelSpdc = createLabelSprite("SPDC BBO CRYSTAL", "Type-I Entangled Pair Generator", "#a855f7");
    labelSpdc.position.set(-2.6, 1.45, 0);
    labelsGroup.add(labelSpdc);

    // Dual-Slit Barrier
    const labelSlits = createLabelSprite("DUAL SLITS & QWP", "d = 0.20mm · Orthogonal H/V Tags", "#00d4ff");
    labelSlits.position.set(-1.2, 1.75, 0);
    labelsGroup.add(labelSlits);

    // Individual Slit 1 / Slit 2 markers
    const labelSlitH = createLabelSprite("SLIT 1 (H)", "Horizontal Linear QWP Tag", "#00d4ff");
    labelSlitH.scale.set(1.4, 0.45, 1);
    labelSlitH.position.set(-1.2, 0.95, -0.95);
    labelsGroup.add(labelSlitH);

    const labelSlitV = createLabelSprite("SLIT 2 (V)", "Vertical Linear QWP Tag", "#ffaa3b");
    labelSlitV.scale.set(1.4, 0.45, 1);
    labelSlitV.position.set(-1.2, 0.95, 0.95);
    labelsGroup.add(labelSlitV);

    // Analyzer PBS Cube
    const labelPbs = createLabelSprite("POLARIZING BEAM SPLITTER", "Rotatable Analyzer Angle θ", "#00d4ff");
    labelPbs.position.set(1.8, 1.65, 0);
    labelsGroup.add(labelPbs);

    // Channel B Secondary Detector
    const labelDetB = createLabelSprite("CHANNEL B DETECTOR", "Reflected Orthogonal Subset (▲)", "#ff8800");
    labelDetB.position.set(1.8, 1.35, 2.3);
    labelsGroup.add(labelDetB);

    // Channel A Main Detector
    const labelDetA = createLabelSprite("CHANNEL A DETECTOR SCREEN", "Transmitted Fringe Sub-Ensemble (●)", "#00d4ff");
    labelDetA.position.set(5.18, 2.15, 0);
    labelsGroup.add(labelDetA);

    // --- InstancedMesh for Flying Photons ---
    // Single draw call for all flying particles (up to maxParticles)
    const particleGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, maxParticles);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    interface ActiveFlight {
      bornTime: number;
      duration: number;
      xTargetM: number;
      yTargetM: number;
      channel: EraserChannel;
      slitTag?: "H" | "V";
      colorHex: string;
    }

    const flights: ActiveFlight[] = [];
    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();

    function redrawCanvasHits(hitsList: RecordedEraserHit[], view: string, wlColor: string) {
      pctx.fillStyle = "#03080e";
      pctx.fillRect(0, 0, 1024, 768);

      // Grid coordinate markers
      pctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      pctx.lineWidth = 1;
      for (let gx = 100; gx < 1024; gx += 120) {
        pctx.beginPath();
        pctx.moveTo(gx, 0);
        pctx.lineTo(gx, 768);
        pctx.stroke();
      }

      hitsList.forEach((h) => {
        const isChanA = h.channel === "A";
        const isChanB = h.channel === "B";

        if (view === "A" && !isChanA) return;
        if (view === "B" && !isChanB) return;

        // Map x in [-0.02, 0.02] to pixel [60, 964]
        const cx = 512 + (h.x / 0.02) * 440;
        const cy = 384 - (h.y / 0.015) * 320;

        let dotColor = wlColor;
        if (isChanA) dotColor = "#00d4ff"; // Sky Blue
        if (isChanB) dotColor = "#ff8800"; // Warm Orange

        pctx.fillStyle = dotColor;
        pctx.beginPath();
        if (isChanB) {
          // Channel B: Distinct Triangle shape
          pctx.moveTo(cx, cy - 4.5);
          pctx.lineTo(cx + 4, cy + 3.5);
          pctx.lineTo(cx - 4, cy + 3.5);
          pctx.closePath();
        } else {
          // Channel A / All: Distinct Circular dot
          pctx.arc(cx, cy, 3, 0, Math.PI * 2);
        }
        pctx.fill();
      });

      phosphorTexture.needsUpdate = true;
    }

    function addSingleCanvasHit(h: RecordedEraserHit, view: string, wlColor: string) {
      const isChanA = h.channel === "A";
      const isChanB = h.channel === "B";

      if (view === "A" && !isChanA) return;
      if (view === "B" && !isChanB) return;

      const cx = 512 + (h.x / 0.02) * 440;
      const cy = 384 - (h.y / 0.015) * 320;

      let dotColor = wlColor;
      if (isChanA) dotColor = "#00d4ff";
      if (isChanB) dotColor = "#ff8800";

      pctx.fillStyle = dotColor;
      pctx.beginPath();
      if (isChanB) {
        pctx.moveTo(cx, cy - 4.5);
        pctx.lineTo(cx + 4, cy + 3.5);
        pctx.lineTo(cx - 4, cy + 3.5);
        pctx.closePath();
      } else {
        pctx.arc(cx, cy, 3, 0, Math.PI * 2);
      }
      pctx.fill();
      phosphorTexture.needsUpdate = true;
    }

    // Controls: pointer dragging
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(currentLookAt.current));

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= dx * 0.0055;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.0045, 0.15, Math.PI / 2 - 0.05);

      camera.position.setFromSpherical(spherical).add(currentLookAt.current);
      camera.lookAt(currentLookAt.current);
    };

    const onPointerUp = () => {
      isDragging = false;
      renderer.domElement.style.cursor = "grab";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = THREE.MathUtils.clamp(spherical.radius + e.deltaY * 0.006, 2.5, 18.0);
      camera.position.setFromSpherical(spherical).add(currentLookAt.current);
      camera.lookAt(currentLookAt.current);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Photon Spawning
    function spawnPhoton(now: number) {
      if (flights.length >= maxParticles) return;

      const { mode: currentMode, physicsModel: model, speedMultiplier: sm, wavelengthNm: wl } = stateRef.current;
      const sample = model.sample(currentMode);

      // Random vertical position [-0.012, +0.012]
      const yTargetM = (Math.random() * 2 - 1) * 0.012;

      const baseDuration = (prefersReducedMotion ? 2500 : 1100) + Math.random() * 100;
      const duration = baseDuration / sm;

      flights.push({
        bornTime: now,
        duration,
        xTargetM: sample.x,
        yTargetM,
        channel: sample.channel,
        slitTag: sample.slitTag,
        colorHex: wavelengthToColor(wl).hex,
      });

      quantumAudio.playPhotonLaunch(wl);
    }

    let nextSpawnTime = 0;
    let lastManualId = manualTriggerRef.current;
    let prevView = stateRef.current.activeView;

    // --- Animation Loop ---
    const animate = (time: number) => {
      if (isDisposed) return;
      requestAnimationFrame(animate);

      if (!isTabVisible) return;


      const {
        mode: curMode,
        thetaRad: curTheta,
        emissionRate: curRate,
        speedMultiplier: curSpeed,
        isRunning: curRunning,
        activeView: curView,
        showLabels: curLabels,
        onHit: reportHit,
        wavelengthNm: curWl,
      } = stateRef.current;

      labelsGroup.visible = !!curLabels;
      labelPbs.visible = !!curLabels && curMode === "analyzer";
      labelDetB.visible = !!curLabels && curMode === "analyzer";
      labelSlitH.visible = !!curLabels && curMode !== "plain";
      labelSlitV.visible = !!curLabels && curMode !== "plain";


      const col = wavelengthToColor(curWl);

      // Camera lerp
      if (!isDragging) {
        camera.position.lerp(targetCamPos.current, 0.05);
        currentLookAt.current.lerp(targetCamLook.current, 0.05);
        camera.lookAt(currentLookAt.current);
        spherical.setFromVector3(camera.position.clone().sub(currentLookAt.current));
      }

      // Rotate the entire PBS mount (bezel, cube, film, needle) around beam (x) axis
      // This accurately represents rotating the PBS polarization axis by angle θ
      bezelMesh.rotation.x = curTheta;
      prismMesh.rotation.x = curTheta;
      bsFilm.rotation.z = Math.PI / 4; // film stays at 45° relative to cube face
      needleMesh.rotation.x = curTheta;

      // Slit taggers visual state
      const isTagged = curMode !== "plain";
      tagHMesh.visible = isTagged;
      tagVMesh.visible = isTagged;
      analyzerGroup.visible = curMode === "analyzer";

      // Detect view change -> repaint full canvas
      if (curView !== prevView) {
        prevView = curView;
        const curHits = hitsRef.current ?? [];
        redrawCanvasHits(curHits, curView, col.hex);
      }

      // Manual trigger
      if (manualTriggerRef.current !== lastManualId) {
        lastManualId = manualTriggerRef.current;
        spawnPhoton(time);
      }

      // Continuous stream
      const interval = 1000 / curRate / curSpeed;
      if (curRunning) {
        let spawned = 0;
        while (time >= nextSpawnTime && spawned < 4) {
          spawnPhoton(time);
          nextSpawnTime += interval;
          spawned++;
        }
        if (time >= nextSpawnTime) {
          nextSpawnTime = time + interval;
        }
      }

      // Update flying particles
      let activeCount = 0;
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        const progress = Math.min((time - f.bornTime) / f.duration, 1.0);

        // Flight coordinates:
        // x goes from emitter -5.8 to screen +5.18
        const posX = -5.8 + (5.18 - -5.8) * progress;

        // Map physical coordinate xTargetM [-0.02, 0.02] to 3D z in [-1.8, 1.8]
        const targetZ = (f.xTargetM / 0.02) * 1.8;
        const targetY = 0.15 + (f.yTargetM / 0.015) * 1.2;

        let currentZ = 0;
        let currentY = 0.15;

        // Split flight stages:
        // Stage 1: Emitter to Slits (-5.8 to -1.2): 0.0 to 0.38
        // Stage 2: Slits to Analyzer (-1.2 to +1.8): 0.38 to 0.70
        // Stage 3: Analyzer to Screen (+1.8 to +5.18): 0.70 to 1.0
        if (progress < 0.38) {
          currentZ = 0; // Straight beam before barrier
          currentY = 0.15;
        } else if (progress < 0.70) {
          const u = (progress - 0.38) / (0.70 - 0.38);
          // Wave superposition emerging from both slits!
          currentZ = targetZ * u * 0.6;
          currentY = 0.15 + (targetY - 0.15) * u * 0.5;
        } else {
          const v = (progress - 0.70) / (1.0 - 0.70);
          currentZ = targetZ * (0.6 + 0.4 * v);
          currentY = 0.15 + (targetY - 0.15) * (0.5 + 0.5 * v);
        }

        dummy.position.set(posX, currentY, currentZ);

        // Pulse scale
        const scale = 0.06 + 0.03 * Math.sin(progress * Math.PI);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(activeCount, dummy.matrix);

        // Tint particles:
        // If tagged and after slits: tint Slit 1 / Slit 2
        // Only after analyzer / detection are Channel A/B colors assigned
        if (isTagged && progress >= 0.38 && progress < 0.70) {
          tempColor.set(f.slitTag === "H" ? 0x00d4ff : 0xffaa3b);
        } else if (progress >= 0.70 && curMode === "analyzer") {
          tempColor.set(f.channel === "A" ? 0x00d4ff : 0xff8800);
        } else {
          tempColor.set(col.rgbNum);
        }
        instancedMesh.setColorAt(activeCount, tempColor);
        activeCount++;

        // Hit detection screen
        if (progress >= 1.0) {
          const hitRecord: RecordedEraserHit = {
            x: f.xTargetM,
            y: f.yTargetM,
            channel: f.channel,
            slitTag: f.slitTag,
          };
          addSingleCanvasHit(hitRecord, curView, col.hex);
          quantumAudio.playScreenHit(targetZ);
          reportHit(hitRecord);
          flights.splice(i, 1);
        }
      }

      instancedMesh.count = activeCount;
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    };

    requestAnimationFrame(animate);

    // Resize handler
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);

    // Cleanup on unmount
    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      resizeObserver.disconnect();

      // Dispose Three.js resources
      particleGeo.dispose();
      particleMat.dispose();
      instancedMesh.dispose();
      phosphorTexture.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="three-viewport" style={{ width: "100%", height: "100%" }} />;
}

// ============================================================================
// Analytical Distribution Plot & 70-Bin Histogram
// ============================================================================

interface DistributionProps {
  mode: EraserMode;
  thetaDeg: number;
  visibility: number;
  activeView: "ALL" | "A" | "B" | "OVERLAY";
  onSelectView: (v: "ALL" | "A" | "B" | "OVERLAY") => void;
  hits: RecordedEraserHit[];
  physicsModel: QuantumEraserModel;
  wavelengthColor: string;
}

function EraserDistributionPlot({
  mode,
  thetaDeg,
  visibility,
  activeView,
  onSelectView,
  hits,
  physicsModel,
  wavelengthColor,
}: DistributionProps) {
  const binsCount = 70;
  const { xMin, xMax } = physicsModel.config;
  const binWidth = (xMax - xMin) / binsCount;

  // Compute histograms
  const { histAll, histA, histB } = useMemo(() => {
    const bAll = new Array(binsCount).fill(0);
    const bA = new Array(binsCount).fill(0);
    const bB = new Array(binsCount).fill(0);

    hits.forEach((h) => {
      if (h.x >= xMin && h.x <= xMax) {
        const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((h.x - xMin) / binWidth)));
        bAll[idx]++;
        if (h.channel === "A") bA[idx]++;
        else if (h.channel === "B") bB[idx]++;
      }
    });

    const maxAll = Math.max(1, ...bAll);
    const maxA = Math.max(1, ...bA);
    const maxB = Math.max(1, ...bB);

    return {
      histAll: bAll.map((v) => v / maxAll),
      histA: bA.map((v) => v / Math.max(maxAll, maxA * 2)),
      histB: bB.map((v) => v / Math.max(maxAll, maxB * 2)),
    };
  }, [hits, binsCount, xMin, xMax, binWidth]);

  // Analytical curves over 160 grid points
  const { pathMode, pathA, pathB } = useMemo(() => {
    const ptsMode: string[] = [];
    const ptsA: string[] = [];
    const ptsB: string[] = [];
    const n = 160;

    // Maximum density for scaling SVG height (120px)
    let maxDensity = 0;
    for (let i = 0; i < physicsModel.nPoints; i++) {
      if (physicsModel.p1[i] > maxDensity) maxDensity = physicsModel.p1[i];
      if (physicsModel.g[i] > maxDensity) maxDensity = physicsModel.g[i];
    }
    maxDensity = Math.max(1e-5, maxDensity);

    for (let i = 0; i <= n; i++) {
      const idx = Math.min(physicsModel.nPoints - 1, Math.floor((i / n) * (physicsModel.nPoints - 1)));
      const px = (i / n) * 440;

      // Mode-specific total curve
      let dens = physicsModel.g[idx];
      if (mode === "plain") dens = physicsModel.p1[idx];

      const py = 118 - (dens / maxDensity) * 102;
      ptsMode.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);

      // Channel A curve
      const pyA = 118 - (physicsModel.pA[idx] / maxDensity) * 102;
      ptsA.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${pyA.toFixed(1)}`);

      // Channel B curve
      const pyB = 118 - (physicsModel.pB[idx] / maxDensity) * 102;
      ptsB.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${pyB.toFixed(1)}`);
    }

    return {
      pathMode: ptsMode.join(" "),
      pathA: ptsA.join(" "),
      pathB: ptsB.join(" "),
    };
  }, [physicsModel, mode]);

  return (
    <div className="analytics-card-wide">
      <div className="analytics-header">
        <div>
          <span className="section-kicker">MODULE 01 // DETECTOR SCREEN HISTOGRAM</span>
          <h3 className="analytics-title">Probability Density P(x) &amp; Channel Sorting</h3>
        </div>
        <div className="analytics-tag-group">
          <span
            className="analytics-tag"
            style={{ color: "#00d4ff", borderColor: "rgba(0, 212, 255, 0.4)", backgroundColor: "rgba(0, 212, 255, 0.1)" }}
          >
            {mode === "plain" && "MODE 1: PLAIN (INTERFERENCE FRINGES)"}
            {mode === "tagged" && "MODE 2: TAGGED (FLAT DIFFRACTION ENVELOPE)"}
            {mode === "analyzer" && `MODE 3: ANALYZER (θ = ${thetaDeg}°, V = ${(visibility * 100).toFixed(1)}%)`}
          </span>
        </div>
      </div>

      {/* Screen View Filter Tabs */}
      <div className="detector-view-toolbar" role="tablist" aria-label="Detector View Channels">
        <span className="view-toolbar-label">DETECTOR VIEW:</span>
        <div className="view-pill-group">
          {(
            [
              { id: "ALL", label: "All Hits (A + B)", dot: wavelengthColor },
              { id: "A", label: "Channel A (●)", dot: "#00d4ff" },
              { id: "B", label: "Channel B (▲)", dot: "#ff8800" },
              { id: "OVERLAY", label: "Overlaid (A & B)", dot: "#a855f7" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={activeView === v.id}
              onClick={() => onSelectView(v.id)}
              className={`view-pill-btn ${activeView === v.id ? "active" : ""}`}
            >
              <span className="pill-dot" style={{ backgroundColor: v.dot }} />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="plot-canvas-large">
        <svg viewBox="0 0 440 135" preserveAspectRatio="none" className="distribution-svg">
          <line x1="0" y1="120" x2="440" y2="120" stroke="#1d2e3e" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="220" y1="10" x2="220" y2="120" stroke="#1d2e3e" strokeWidth="1" strokeDasharray="2 4" />

          {/* Histogram Bars */}
          {activeView === "ALL" &&
            histAll.map((val, idx) => {
              const barW = 440 / binsCount;
              const barH = val * 95;
              const barX = idx * barW;
              const barY = 120 - barH;
              return (
                <rect
                  key={idx}
                  x={barX + 0.5}
                  y={barY}
                  width={Math.max(1, barW - 1)}
                  height={barH}
                  fill={wavelengthColor}
                  opacity={0.35 + val * 0.55}
                  rx="1"
                />
              );
            })}

          {activeView === "A" &&
            histA.map((val, idx) => {
              const barW = 440 / binsCount;
              const barH = val * 95;
              const barX = idx * barW;
              const barY = 120 - barH;
              return (
                <rect
                  key={idx}
                  x={barX + 0.5}
                  y={barY}
                  width={Math.max(1, barW - 1)}
                  height={barH}
                  fill="#00d4ff"
                  opacity={0.4 + val * 0.55}
                  rx="1"
                />
              );
            })}

          {activeView === "B" &&
            histB.map((val, idx) => {
              const barW = 440 / binsCount;
              const barH = val * 95;
              const barX = idx * barW;
              const barY = 120 - barH;
              return (
                <rect
                  key={idx}
                  x={barX + 0.5}
                  y={barY}
                  width={Math.max(1, barW - 1)}
                  height={barH}
                  fill="#ff8800"
                  opacity={0.4 + val * 0.55}
                  rx="1"
                />
              );
            })}

          {activeView === "OVERLAY" &&
            histA.map((valA, idx) => {
              const barW = 440 / binsCount;
              const halfW = (barW - 1) / 2;
              const valB = histB[idx];
              const barHA = valA * 95;
              const barHB = valB * 95;
              const barX = idx * barW;
              return (
                <g key={idx}>
                  <rect x={barX + 0.5} y={120 - barHA} width={halfW} height={barHA} fill="#00d4ff" opacity={0.65} rx="1" />
                  <rect x={barX + 0.5 + halfW} y={120 - barHB} width={halfW} height={barHB} fill="#ff8800" opacity={0.65} rx="1" />
                </g>
              );
            })}

          {/* Analytical Continuous Curves */}
          {activeView === "ALL" && (
            <path d={pathMode} fill="none" stroke={wavelengthColor} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
          )}

          {(activeView === "A" || activeView === "OVERLAY") && (
            <path d={pathA} fill="none" stroke="#00d4ff" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          )}

          {(activeView === "B" || activeView === "OVERLAY") && (
            <path d={pathB} fill="none" stroke="#ff8800" strokeWidth="2.2" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        <div className="plot-axis-labels">
          <span>-20 mm (Left)</span>
          <span>x = 0 mm (Center Optical Axis)</span>
          <span>+20 mm (Right)</span>
        </div>
      </div>

      <div className="plot-legend-row">
        <div className="legend-item">
          <span className="legend-shape shape-circle" style={{ backgroundColor: "#00d4ff" }} />
          <span>Channel A (θ = {thetaDeg}°)</span>
        </div>
        <div className="legend-item">
          <span className="legend-shape shape-triangle" style={{ borderColor: "#ff8800" }} />
          <span>Channel B (Anti-fringe, θ + 90°)</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ backgroundColor: wavelengthColor }} />
          <span>Envelope g(x) = p_A + p_B</span>
        </div>
      </div>
    </div>
  );
}
