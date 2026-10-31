"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { quantumAudio } from "./quantum-audio";
import {
  computeFringeSpacing,
  computeIntensity,
  PhysicsParams,
  samplePhotonImpact,
  wavelengthToColor,
} from "./quantum-physics";

interface FlyingPhoton {
  meshGroup: THREE.Group;
  waveletA: THREE.Sprite;
  waveletB: THREE.Sprite;
  coreSprite: THREE.Sprite;
  bornTime: number;
  duration: number;
  targetZ: number;
  targetY: number;
  slitChoice: -1 | 1;
  isObserved: boolean;
  hasTriggeredSlit: boolean;
}

interface CameraPreset {
  name: string;
  id: "cinematic" | "barrel" | "detector" | "overhead" | "slits";
  position: THREE.Vector3;
  target: THREE.Vector3;
  description: string;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: "Overview",
    id: "cinematic",
    position: new THREE.Vector3(-4.4, 2.2, 5.2),
    target: new THREE.Vector3(0.1, 0.0, 0),
    description: "Cinematic 45° optical bench view: full apparatus with clear slit separation",
  },
  {
    name: "Axis",
    id: "barrel",
    position: new THREE.Vector3(-6.8, 1.25, 0.0),
    target: new THREE.Vector3(1.2, 0.15, 0.0),
    description: "Look down the beam barrel through both slits directly to the detector",
  },
  {
    name: "Screen",
    id: "detector",
    position: new THREE.Vector3(2.4, 0.35, 2.4),
    target: new THREE.Vector3(5.18, 0.1, 0),
    description: "Close-up perpendicular view of the phosphor screen and fringes",
  },
  {
    name: "Slits Stage",
    id: "slits",
    position: new THREE.Vector3(-1.8, 0.65, 1.8),
    target: new THREE.Vector3(-0.5, 0.15, 0),
    description: "Close-up of the dual aperture slits, micrometer stage, and which-path detector",
  },
  {
    name: "Top",
    id: "overhead",
    position: new THREE.Vector3(0.0, 9.2, 0.01),
    target: new THREE.Vector3(0.0, 0.0, 0),
    description: "Top-down view of wave propagation and interference geometry",
  },
];

function createGlowSpriteTexture(colorHex: string, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const center = size / 2;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0.0, "#ffffff");
  grad.addColorStop(0.2, colorHex);
  grad.addColorStop(0.5, colorHex);
  grad.addColorStop(0.75, colorHex + "33");
  grad.addColorStop(1.0, "rgba(0,0,0,0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


function createLabelSprite(text: string, subtitle?: string, accentColor = "#38e1ff"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 512, 160);

  // Rounded pill background
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

  // Glow line top indicator
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 40, y + 6, w - 80, 4);

  // Text: Title
  ctx.font = "bold 32px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, subtitle ? y + 48 : y + 64);

  // Text: Subtitle
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

interface DoubleSlitSceneProps {
  wavelength: number;
  whichPath: boolean;
  emissionRate: number;
  speedMultiplier: number;
  isRunning: boolean;
  resetKey: number;
  activePreset: "cinematic" | "barrel" | "detector" | "overhead" | "slits";
  showWaveOverlay: boolean;
  showLabels: boolean;
  onHit: (z: number, y: number, slitChoice: -1 | 1) => void;
  triggerSinglePhoton: number;
}

function DoubleSlitScene({
  wavelength,
  whichPath,
  emissionRate,
  speedMultiplier,
  isRunning,
  resetKey,
  activePreset,
  showWaveOverlay,
  showLabels,
  onHit,
  triggerSinglePhoton,
}: DoubleSlitSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    wavelength,
    whichPath,
    emissionRate,
    speedMultiplier,
    isRunning,
    showWaveOverlay,
    showLabels,
    onHit,
  });

  useEffect(() => {
    stateRef.current = {
      wavelength,
      whichPath,
      emissionRate,
      speedMultiplier,
      isRunning,
      showWaveOverlay,
      showLabels,
      onHit,
    };
  }, [wavelength, whichPath, emissionRate, speedMultiplier, isRunning, showWaveOverlay, showLabels, onHit]);

  const targetCamPos = useRef(CAMERA_PRESETS[0].position.clone());
  const targetCamLook = useRef(CAMERA_PRESETS[0].target.clone());
  const currentLookAt = useRef(CAMERA_PRESETS[0].target.clone());

  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === activePreset) || CAMERA_PRESETS[0];
    targetCamPos.current.copy(preset.position);
    targetCamLook.current.copy(preset.target);
  }, [activePreset]);

  const manualTriggerRef = useRef<number>(triggerSinglePhoton);
  useEffect(() => {
    manualTriggerRef.current = triggerSinglePhoton;
  }, [triggerSinglePhoton]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    // --- Scene Setup ---
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

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x131f2d, 1.25);
    scene.add(ambientLight);

    const keyDirectional = new THREE.DirectionalLight(0xdcf3ff, 2.0);
    keyDirectional.position.set(-3, 8, 6);
    scene.add(keyDirectional);

    const rimLight = new THREE.DirectionalLight(0x75bdf4, 1.5);
    rimLight.position.set(4, 5, -6);
    scene.add(rimLight);

    const laserGlowLight = new THREE.PointLight(0x56e39f, 24, 7);
    laserGlowLight.position.set(-4.0, 0.15, 0);
    scene.add(laserGlowLight);

    const detectorGlowLight = new THREE.PointLight(0x56e39f, 16, 6);
    detectorGlowLight.position.set(5.1, 0, 0);
    scene.add(detectorGlowLight);

    // --- Floor & Optical Bench ---
    const floorGeo = new THREE.PlaneGeometry(36, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      metalness: 0.65,
      roughness: 0.35,
    });
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

    const benchBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1b2836,
      metalness: 0.85,
      roughness: 0.28,
    });
    const benchBody = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.18, 1.3), benchBodyMat);
    benchGroup.add(benchBody);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x8ab2cf,
      metalness: 0.98,
      roughness: 0.12,
    });
    [-0.45, 0.45].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 13.8, 24), railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0.11, z);
      benchGroup.add(rail);
    });

    // Helper: Precision Optical Carrier Stages (Thorlabs / Newport style lab post & clamp)
    function createCarrierStage(xPos: number) {
      const stage = new THREE.Group();
      stage.position.set(xPos, -1.68, 0);

      // Heavy dovetail base saddle riding the dual rails
      const saddleMat = new THREE.MeshStandardMaterial({
        color: 0x182430,
        metalness: 0.88,
        roughness: 0.22,
      });
      const clampBlock = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 1.28), saddleMat);
      stage.add(clampBlock);

      // Knurled rail lock thumbscrew on the saddle side
      const thumbMat = new THREE.MeshStandardMaterial({
        color: 0x7b99b0,
        metalness: 0.94,
        roughness: 0.18,
      });
      const lockScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 16), thumbMat);
      lockScrew.rotation.x = Math.PI / 2;
      lockScrew.position.set(0, 0, 0.68);
      stage.add(lockScrew);

      // Ground stainless steel post holder cylinder
      const holderMat = new THREE.MeshStandardMaterial({
        color: 0x1f2e3d,
        metalness: 0.86,
        roughness: 0.28,
      });
      const postHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.85, 24), holderMat);
      postHolder.position.set(0, 0.48, 0);
      stage.add(postHolder);

      // Height adjustment knurled collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 24), thumbMat);
      collar.position.set(0, 0.88, 0);
      stage.add(collar);

      // Hardened stainless steel optical post
      const postMat = new THREE.MeshStandardMaterial({
        color: 0xc4d8e8,
        metalness: 0.96,
        roughness: 0.08,
      });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.15, 24), postMat);
      post.position.set(0, 1.18, 0);
      stage.add(post);

      return stage;
    }

    // 1. Scientific Gas/Diode Laser Head with Anodized Fins and Precision Bezel (-5.8)
    const emitterStage = createCarrierStage(-5.8);
    scene.add(emitterStage);

    const emitterHousing = new THREE.Group();
    emitterHousing.position.set(-5.8, 0.15, 0);
    scene.add(emitterHousing);

    // Cylindrical laser head body (laboratory He-Ne / DPSS style)
    const laserBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x16222f,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
    const laserTube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 36), laserBodyMat);
    laserTube.rotation.z = Math.PI / 2;
    laserTube.position.set(-0.35, 0, 0);
    emitterHousing.add(laserTube);

    // Radiating heatsink cooling fins
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x223648,
      metalness: 0.85,
      roughness: 0.3,
    });
    [-1.0, -0.75, -0.5, -0.25, 0.0, 0.25].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 32), finMat);
      fin.rotation.z = Math.PI / 2;
      fin.position.set(fx, 0, 0);
      emitterHousing.add(fin);
    });

    // Rear power cap with key-switch & BNC power connector
    const rearCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.3, 32), finMat);
    rearCap.rotation.z = Math.PI / 2;
    rearCap.position.set(-1.55, 0, 0);
    emitterHousing.add(rearCap);

    // Output aperture snout collar
    const snoutMat = new THREE.MeshStandardMaterial({
      color: 0x48647e,
      metalness: 0.95,
      roughness: 0.14,
    });
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.55, 32), snoutMat);
    snout.rotation.z = -Math.PI / 2;
    snout.position.set(0.95, 0, 0);
    emitterHousing.add(snout);

    // Mechanical laser shutter ring
    const shutterRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 16, 32), snoutMat);
    shutterRing.rotation.y = Math.PI / 2;
    shutterRing.position.set(1.22, 0, 0);
    emitterHousing.add(shutterRing);

    // Internal resonant cavity glow (visible through inspection port)
    const cavityMat = new THREE.MeshBasicMaterial({
      color: 0x54e39d,
      transparent: true,
      opacity: 0.85,
    });
    const cavityGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 24), cavityMat);
    cavityGlow.rotation.z = Math.PI / 2;
    cavityGlow.position.set(-0.35, 0, 0);
    emitterHousing.add(cavityGlow);

    // Laser aperture emitting flare
    const apertureFlareMat = new THREE.MeshBasicMaterial({
      color: 0x54e39d,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const apertureFlare = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), apertureFlareMat);
    apertureFlare.position.set(1.25, 0, 0);
    emitterHousing.add(apertureFlare);

    // 2. Barrier Stage & Slits (-0.5)
    // Clear open aperture gaps of width 0.36 centered at Z = -0.55 and Z = +0.55
    const barrierStage = createCarrierStage(-0.5);
    scene.add(barrierStage);

    const barrierGroup = new THREE.Group();
    barrierGroup.position.set(-0.5, 0.15, 0);
    scene.add(barrierGroup);

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0c1219,
      metalness: 0.85,
      roughness: 0.25,
    });

    const topShield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 3.2), plateMat);
    topShield.position.set(0, 1.1, 0);
    barrierGroup.add(topShield);

    const bottomShield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 3.2), plateMat);
    bottomShield.position.set(0, -1.1, 0);
    barrierGroup.add(bottomShield);

    // Center divider septum: from Z = -0.37 to +0.37 (width 0.74)
    const centerDividerMat = new THREE.MeshStandardMaterial({
      color: 0x14202d,
      metalness: 0.88,
      roughness: 0.32,
    });
    const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.74), centerDividerMat);
    centerBlock.position.set(0, 0, 0);
    barrierGroup.add(centerBlock);

    // Left block: from Z = -0.73 to -1.55 -> Slit A is [-0.73, -0.37], center -0.55, width 0.36
    const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.82), plateMat);
    leftBlock.position.set(0, 0, -1.14);
    barrierGroup.add(leftBlock);

    // Right block: from Z = +0.73 to +1.55 -> Slit B is [+0.37, +0.73], center +0.55, width 0.36
    const rightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.82), plateMat);
    rightBlock.position.set(0, 0, 1.14);
    barrierGroup.add(rightBlock);

    // Luminous cyan aperture lips framing the two open slit windows
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x4ce6ff,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x00c8f5,
      emissiveIntensity: 0.85,
    });
    [-0.73, -0.37, 0.37, 0.73].forEach((zEdge) => {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.2, 0.02), lipMat);
      lip.position.set(0, 0, zEdge);
      barrierGroup.add(lip);
    });

    // 3. Precision Which-Path Observer Measurement Sensors (Photomultiplier tubes / avalanche photodiodes)
    const observerRig = new THREE.Group();
    observerRig.position.set(-0.5, 0.15, 0);
    scene.add(observerRig);

    const sensorHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1f1610,
      metalness: 0.85,
      roughness: 0.28,
    });
    const sensorLensMat = new THREE.MeshPhysicalMaterial({
      color: 0xffeedd,
      transmission: 0.9,
      roughness: 0.05,
      metalness: 0.1,
    });
    const sensorLedMatA = new THREE.MeshBasicMaterial({ color: 0x54e39d });
    const sensorLedMatB = new THREE.MeshBasicMaterial({ color: 0x54e39d });

    // Sensor Unit A (Slit A at Z = -0.55m): Cylindrical APD detector with optical snout
    const sensorBodyA = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.32, 20), sensorHousingMat);
    sensorBodyA.position.set(0.20, 0.72, -0.55);
    observerRig.add(sensorBodyA);

    const sensorLensA = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), sensorLensMat);
    sensorLensA.position.set(0.20, 0.56, -0.55);
    observerRig.add(sensorLensA);

    const sensorLedA = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), sensorLedMatA);
    sensorLedA.position.set(0.30, 0.75, -0.55);
    observerRig.add(sensorLedA);

    const probeBeamMatA = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const probeBeamA = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 12), probeBeamMatA);
    probeBeamA.position.set(0.20, 0, -0.55);
    observerRig.add(probeBeamA);

    // Sensor Unit B (Slit B at Z = +0.55m)
    const sensorBodyB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.32, 20), sensorHousingMat);
    sensorBodyB.position.set(0.20, 0.72, 0.55);
    observerRig.add(sensorBodyB);

    const sensorLensB = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), sensorLensMat);
    sensorLensB.position.set(0.20, 0.56, 0.55);
    observerRig.add(sensorLensB);

    const sensorLedB = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), sensorLedMatB);
    sensorLedB.position.set(0.30, 0.75, 0.55);
    observerRig.add(sensorLedB);

    const probeBeamMatB = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const probeBeamB = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 12), probeBeamMatB);
    probeBeamB.position.set(0.20, 0, 0.55);
    observerRig.add(probeBeamB);

    // 4. DETECTOR PHOSPHOR CANVAS SCREEN (+5.2)
    const detectorStage = createCarrierStage(5.2);
    scene.add(detectorStage);

    const detectorRig = new THREE.Group();
    detectorRig.position.set(5.2, 0.15, 0);
    scene.add(detectorRig);

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x182433,
      metalness: 0.92,
      roughness: 0.22,
    });
    const screenBezel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.5, 4.5), bezelMat);
    screenBezel.position.set(0.08, 0, 0);
    detectorRig.add(screenBezel);

    const phosphorCanvas = document.createElement("canvas");
    phosphorCanvas.width = 1024;
    phosphorCanvas.height = 768;
    const pctx = phosphorCanvas.getContext("2d")!;

    function initPhosphorScreen() {
      pctx.fillStyle = "#070e17";
      pctx.fillRect(0, 0, 1024, 768);

      pctx.strokeStyle = "rgba(40, 75, 105, 0.35)";
      pctx.lineWidth = 1;

      for (let x = 64; x < 1024; x += 64) {
        pctx.beginPath();
        pctx.moveTo(x, 0);
        pctx.lineTo(x, 768);
        pctx.stroke();
      }

      for (let y = 64; y < 768; y += 64) {
        pctx.beginPath();
        pctx.moveTo(0, y);
        pctx.lineTo(1024, y);
        pctx.stroke();
      }

      pctx.strokeStyle = "rgba(85, 191, 229, 0.75)";
      pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.moveTo(512, 0);
      pctx.lineTo(512, 768);
      pctx.moveTo(0, 384);
      pctx.lineTo(1024, 384);
      pctx.stroke();

      pctx.strokeStyle = "rgba(100, 180, 220, 0.6)";
      pctx.fillStyle = "rgba(140, 185, 215, 0.75)";
      pctx.font = "14px monospace";
      for (let x = 112; x <= 912; x += 80) {
        pctx.beginPath();
        pctx.moveTo(x, 0);
        pctx.lineTo(x, 18);
        pctx.moveTo(x, 750);
        pctx.lineTo(x, 768);
        pctx.stroke();
        const mm = Math.round(((x - 512) / 400) * 1.5 * 10) / 10;
        pctx.fillText(`${mm > 0 ? "+" : ""}${mm}m`, x - 18, 36);
      }
    }
    initPhosphorScreen();

    const phosphorTexture = new THREE.CanvasTexture(phosphorCanvas);
    phosphorTexture.minFilter = THREE.LinearFilter;
    phosphorTexture.magFilter = THREE.LinearFilter;
    phosphorTexture.needsUpdate = true;

    const screenFaceMat = new THREE.MeshBasicMaterial({ map: phosphorTexture });
    const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(4.34, 3.34), screenFaceMat);
    screenFace.rotation.y = -Math.PI / 2;
    screenFace.position.set(-0.01, 0, 0);
    detectorRig.add(screenFace);

    
    // --- 3D Hardware Annotations & Object Identity Callout Labels ---
    const labelsGroup = new THREE.Group();
    scene.add(labelsGroup);

    // Emitter label
    const labelEmitter = createLabelSprite("COHERENT LASER", "λ = 390 - 700nm Source", "#38e1ff");
    labelEmitter.position.set(-5.8, 1.45, 0);
    labelsGroup.add(labelEmitter);

    // Optical rail bench label
    const labelRail = createLabelSprite("OPTICAL RAIL BENCH", "Heavy Vibration-Isolated Track", "#75bdf4");
    labelRail.position.set(-3.2, -1.2, 1.3);
    labelsGroup.add(labelRail);

    // Dual-Slit Barrier label
    const labelSlits = createLabelSprite("DUAL-SLIT APERTURE", "d = 1.10m · a = 0.36m", "#38e1ff");
    labelSlits.position.set(-0.5, 1.65, 0);
    labelsGroup.add(labelSlits);

    // Slit A & Slit B individual markers
    const labelSlitA = createLabelSprite("SLIT A", "Aperture 1 (Z = -0.55m)", "#00d4ff");
    labelSlitA.scale.set(1.4, 0.45, 1);
    labelSlitA.position.set(-0.5, 0.95, -0.95);
    labelsGroup.add(labelSlitA);

    const labelSlitB = createLabelSprite("SLIT B", "Aperture 2 (Z = +0.55m)", "#00d4ff");
    labelSlitB.scale.set(1.4, 0.45, 1);
    labelSlitB.position.set(-0.5, 0.95, 0.95);
    labelsGroup.add(labelSlitB);

    // Which-Path Observer Detector label
    const labelObserver = createLabelSprite("WHICH-PATH DETECTORS", "Decoherence Collapse Monitors", "#ffaa3b");
    labelObserver.position.set(0.1, 1.55, 0);
    labelsGroup.add(labelObserver);

    // Phosphor Screen Detector label
    const labelDetector = createLabelSprite("DETECTOR SCREEN", "High-Resolution Phosphor Plane", "#56e39f");
    labelDetector.position.set(5.2, 2.35, 0);
    labelsGroup.add(labelDetector);

    const recordedHits: { z: number; y: number }[] = [];

    function renderPhosphorCanvas() {
      const { wavelength: wl, whichPath: wp, showWaveOverlay: overlay } = stateRef.current;
      const col = wavelengthToColor(wl);

      initPhosphorScreen();

      if (overlay) {
        pctx.save();
        pctx.globalCompositeOperation = "screen";

        const params: PhysicsParams = { wavelengthNm: wl, whichPath: wp };
        for (let x = 32; x < 992; x += 3) {
          const zNorm = ((x - 512) / 460) * 1.9;
          const intensity = computeIntensity(zNorm, params);

          if (intensity > 0.02) {
            pctx.fillStyle = col.hex;
            pctx.globalAlpha = intensity * 0.42;
            pctx.fillRect(x - 1, 48, 3, 672);
          }
        }
        pctx.restore();
      }

      pctx.save();
      pctx.globalCompositeOperation = "screen";

      recordedHits.forEach((hit) => {
        const cx = 512 + (hit.z / 1.9) * 460;
        const cy = 384 - (hit.y / 1.5) * 320;

        const radGrad = pctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
        radGrad.addColorStop(0.0, "#ffffff");
        radGrad.addColorStop(0.25, col.hex);
        radGrad.addColorStop(0.7, col.hex + "44");
        radGrad.addColorStop(1.0, "rgba(0,0,0,0)");

        pctx.fillStyle = radGrad;
        pctx.beginPath();
        pctx.arc(cx, cy, 14, 0, Math.PI * 2);
        pctx.fill();

        pctx.fillStyle = "#ffffff";
        pctx.beginPath();
        pctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        pctx.fill();
      });

      pctx.restore();
      phosphorTexture.needsUpdate = true;
    }

    function addCanvasHit(z: number, y: number) {
      const { wavelength: wl } = stateRef.current;
      const col = wavelengthToColor(wl);

      recordedHits.push({ z, y });
      if (recordedHits.length > 2500) recordedHits.shift();

      const cx = 512 + (z / 1.9) * 460;
      const cy = 384 - (y / 1.5) * 320;

      pctx.save();
      pctx.globalCompositeOperation = "screen";

      const radGrad = pctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      radGrad.addColorStop(0.0, "#ffffff");
      radGrad.addColorStop(0.25, col.hex);
      radGrad.addColorStop(0.7, col.hex + "44");
      radGrad.addColorStop(1.0, "rgba(0,0,0,0)");

      pctx.fillStyle = radGrad;
      pctx.beginPath();
      pctx.arc(cx, cy, 14, 0, Math.PI * 2);
      pctx.fill();

      pctx.fillStyle = "#ffffff";
      pctx.beginPath();
      pctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      pctx.fill();

      pctx.restore();
      phosphorTexture.needsUpdate = true;
    }

    // Dynamic Wave Propagation Lines: 4 pre-barrier, 4 for Slit A, 4 for Slit B
    const waveLines: THREE.Line[] = [];
    for (let w = 0; w < 12; w++) {
      const segs = 48;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segs; s++) pts.push(new THREE.Vector3(0, 0, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: 0x54e39d,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
        })
      );
      scene.add(line);
      waveLines.push(line);
    }

    // Orbit & Pointer Controls
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(currentLookAt.current));
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

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
      spherical.radius = THREE.MathUtils.clamp(spherical.radius + e.deltaY * 0.012, 1.8, 18.0);
      camera.position.setFromSpherical(spherical).add(currentLookAt.current);
      camera.lookAt(currentLookAt.current);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!host) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);

    // --- Flying Photon Simulation State ---
    const activePhotons: FlyingPhoton[] = [];
    let nextLaunchTime = 0;
    let lastTime = performance.now();
    let isDisposed = false;
    let lastManualTriggerId = manualTriggerRef.current;

    function firePhoton(now: number) {
      const { wavelength: wl, whichPath: wp, speedMultiplier: sm } = stateRef.current;
      const col = wavelengthToColor(wl);

      const params: PhysicsParams = { wavelengthNm: wl, whichPath: wp };
      const impact = samplePhotonImpact(params);

      const glowTex = createGlowSpriteTexture(col.hex);
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const meshGroup = new THREE.Group();

      const coreSprite = new THREE.Sprite(spriteMat);
      coreSprite.scale.set(0.12, 0.12, 1);
      meshGroup.add(coreSprite);

      const waveletA = new THREE.Sprite(spriteMat.clone());
      waveletA.scale.set(0.1, 0.1, 1);
      waveletA.visible = false;
      meshGroup.add(waveletA);

      const waveletB = new THREE.Sprite(spriteMat.clone());
      waveletB.scale.set(0.1, 0.1, 1);
      waveletB.visible = false;
      meshGroup.add(waveletB);

      meshGroup.position.set(-4.4, 0.15, 0);
      scene.add(meshGroup);

      const baseDuration = 1050 + Math.random() * 80;
      const duration = baseDuration / sm;

      activePhotons.push({
        meshGroup,
        waveletA,
        waveletB,
        coreSprite,
        bornTime: now,
        duration,
        targetZ: impact.z,
        targetY: impact.y,
        slitChoice: impact.slitChoice,
        isObserved: wp,
        hasTriggeredSlit: false,
      });

      quantumAudio.playPhotonLaunch(wl);
    }

    // --- Animation Loop with Physically Straight Trajectories ---
    const animate = (time: number) => {
      if (isDisposed) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;


      const {
        wavelength: currentWl,
        whichPath: currentWp,
        emissionRate: currentRate,
        speedMultiplier: currentSpeed,
        isRunning: currentRunning,
        showLabels: currentLabels,
        onHit: reportHit,
      } = stateRef.current;

      labelsGroup.visible = !!currentLabels;
      labelObserver.visible = !!currentLabels && currentWp;


      const currentColor = wavelengthToColor(currentWl);

      laserGlowLight.color.setHex(currentColor.rgbNum);
      detectorGlowLight.color.setHex(currentColor.rgbNum);
      cavityMat.color.setHex(currentColor.rgbNum);
      apertureFlareMat.color.setHex(currentColor.rgbNum);

      if (!isDragging) {
        camera.position.lerp(targetCamPos.current, 0.05);
        currentLookAt.current.lerp(targetCamLook.current, 0.05);
        camera.lookAt(currentLookAt.current);
        spherical.setFromVector3(camera.position.clone().sub(currentLookAt.current));
      }

      observerRig.visible = currentWp;
      if (currentWp) {
        const pulse = 0.5 + 0.35 * Math.sin(time * 0.009 * currentSpeed);
        probeBeamMatA.opacity = pulse;
        probeBeamMatB.opacity = pulse;
      }

      if (!showWaveOverlay) {
        waveLines.forEach((l) => {
          l.visible = false;
        });
      } else {
        waveLines.forEach((line, idx) => {
          line.visible = true;
          const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
          const segs = 48;

          if (idx < 4) {
            // Pre-barrier wavefronts expanding from laser nozzle (-4.4, 0.15, 0)
            const phase = ((time * 0.0022 * currentSpeed * (532 / currentWl) + (idx / 4) * 3.8) % 3.8);
            const radius = Math.min(phase * 1.05, 3.85);
            for (let s = 0; s <= segs; s++) {
              const angle = -Math.PI / 4 + (s / segs) * (Math.PI / 2);
              const x = -4.4 + Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              attr.setXYZ(s, x, 0.15, z);
            }
            (line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.35 * (1 - radius / 3.85));
          } else {
            // Post-barrier wavefronts expanding from Slit A (z = -0.55) and Slit B (z = +0.55)
            const isSlitA = idx < 8;
            const slitIndex = isSlitA ? idx - 4 : idx - 8;
            const slitZ = isSlitA ? -0.55 : 0.55;

            if (currentWp && isSlitA) {
              line.visible = false;
              return;
            }

            const postPhase = ((time * 0.0022 * currentSpeed * (532 / currentWl) + (slitIndex / 4) * 5.6) % 5.6);
            const radius = postPhase;

            for (let s = 0; s <= segs; s++) {
              const angle = -Math.PI / 3 + (s / segs) * ((2 * Math.PI) / 3);
              const x = -0.5 + Math.cos(angle) * radius;
              const z = slitZ + Math.sin(angle) * radius;
              attr.setXYZ(s, Math.min(x, 5.18), 0.15, THREE.MathUtils.clamp(z, -3.2, 3.2));
            }
            const fade = Math.sin((postPhase / 5.6) * Math.PI);
            (line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.28 * fade);
          }
          (line.material as THREE.LineBasicMaterial).color.setHex(currentColor.rgbNum);
          attr.needsUpdate = true;
        });
      }

      if (manualTriggerRef.current !== lastManualTriggerId) {
        lastManualTriggerId = manualTriggerRef.current;
        firePhoton(time);
      }

      const launchInterval = (1000 / currentRate) / currentSpeed;
      if (currentRunning) {
        let spawned = 0;
        while (time >= nextLaunchTime && spawned < 5) {
          firePhoton(time);
          nextLaunchTime += launchInterval;
          spawned++;
        }
        if (time >= nextLaunchTime) {
          nextLaunchTime = time + launchInterval;
        }
      }

      for (let i = activePhotons.length - 1; i >= 0; i--) {
        const shot = activePhotons[i];
        const progress = Math.min((time - shot.bornTime) / shot.duration, 1.0);
        const transitT = 0.4; // Reach barrier at 40% of duration

        const slitZ = shot.slitChoice === -1 ? -0.55 : 0.55;

        if (progress < transitT) {
          // Pre-slit flight: From Laser nozzle (-4.4, 0.15, 0) to Barrier (-0.5, 0.15, slitZ)
          const t = progress / transitT;
          const x = -4.4 + (-0.5 - -4.4) * t;

          if (shot.isObserved) {
            // OBSERVED / PARTICLE MODE:
            // Continuous straight ray from nozzle (z = 0) directly into chosen slit center (z = slitZ)!
            // NEVER enters the center divider!
            const z = slitZ * t;
            shot.meshGroup.position.set(x, 0.15, z);
            shot.coreSprite.scale.set(0.08, 0.08, 1);
            shot.coreSprite.visible = true;
            shot.waveletA.visible = false;
            shot.waveletB.visible = false;
          } else {
            // QUANTUM WAVE SUPERPOSITION (NO OBSERVER):
            // The photon wave packet enters BOTH slits simultaneously!
            // Wavelet A flies directly towards Slit A center (-0.55).
            // Wavelet B flies directly towards Slit B center (+0.55).
            // Center divider remains completely untouched!
            shot.coreSprite.visible = false;
            shot.waveletA.visible = true;
            shot.waveletB.visible = true;

            const zA = -0.55 * t;
            const zB = 0.55 * t;

            shot.meshGroup.position.set(x, 0.15, 0);
            shot.waveletA.position.set(0, 0, zA);
            shot.waveletB.position.set(0, 0, zB);

            // Sized at 0.08, glides through 0.36 slit window with 0.14 margin on both sides
            shot.waveletA.scale.setScalar(0.08);
            shot.waveletB.scale.setScalar(0.08);
          }
        } else {
          // Post-slit flight: From Barrier (-0.5) to Detector Screen (+5.18)
          const u = (progress - transitT) / (1.0 - transitT);
          const x = -0.5 + (5.18 - -0.5) * u;
          const y = 0.15 + (shot.targetY - 0.15) * u;

          if (!shot.hasTriggeredSlit) {
            shot.hasTriggeredSlit = true;
            quantumAudio.playSlitTransit(shot.isObserved, shot.slitChoice);

            if (shot.isObserved) {
              if (shot.slitChoice === -1) {
                sensorLedMatA.color.setHex(0xffaa33);
                setTimeout(() => sensorLedMatA.color.setHex(0x54e39d), 130 / currentSpeed);
              } else {
                sensorLedMatB.color.setHex(0xffaa33);
                setTimeout(() => sensorLedMatB.color.setHex(0x54e39d), 130 / currentSpeed);
              }
            }
          }

          if (shot.isObserved) {
            // OBSERVED / PARTICLE MODE:
            // Continuous straight ray from chosen slit center directly to target hit!
            const z = slitZ + (shot.targetZ - slitZ) * u;
            shot.meshGroup.position.set(x, y, z);
            shot.coreSprite.visible = true;
            shot.coreSprite.scale.set(0.08, 0.08, 1);
            shot.waveletA.visible = false;
            shot.waveletB.visible = false;
          } else {
            // QUANTUM WAVE SUPERPOSITION:
            // Both wavelets emerge cleanly from Slit A (-0.55) and Slit B (+0.55).
            // They fan out as expanding secondary Huygens wavelets and interfere towards target hit!
            shot.coreSprite.visible = false;
            shot.waveletA.visible = true;
            shot.waveletB.visible = true;

            const zA = -0.55 + (shot.targetZ - -0.55) * u;
            const zB = 0.55 + (shot.targetZ - 0.55) * u;

            shot.meshGroup.position.set(x, y, 0);
            shot.waveletA.position.set(0, 0, zA);
            shot.waveletB.position.set(0, 0, zB);

            const waveExpand = 0.08 + u * 0.12;
            shot.waveletA.scale.setScalar(waveExpand);
            shot.waveletB.scale.setScalar(waveExpand);
          }
        }

        if (progress >= 1.0) {
          addCanvasHit(shot.targetZ, shot.targetY);
          quantumAudio.playScreenHit(shot.targetZ);
          reportHit(shot.targetZ, shot.targetY, shot.slitChoice);

          scene.remove(shot.meshGroup);
          shot.meshGroup.traverse((obj) => {
            if (obj instanceof THREE.Sprite) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
          });

          activePhotons.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const frameId = requestAnimationFrame(animate);

    const clearScreen = () => {
      recordedHits.length = 0;
      renderPhosphorCanvas();
    };
    clearScreen();

    renderPhosphorCanvas();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();

      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);

      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [resetKey, showWaveOverlay]);

  return (
    <div className="scene-container">
      <div ref={mountRef} className="three-viewport" />
    </div>
  );
}

// --- Large Live Distribution Plot Component ---
function LiveDistributionPlot({
  whichPath,
  wavelength,
  hits,
}: {
  whichPath: boolean;
  wavelength: number;
  hits: { z: number; y: number }[];
}) {
  const binsCount = 70;
  const minZ = -1.9;
  const maxZ = 1.9;

  const histogram = useMemo(() => {
    const bins = new Array(binsCount).fill(0);
    const binWidth = (maxZ - minZ) / binsCount;

    hits.forEach((h) => {
      if (h.z >= minZ && h.z <= maxZ) {
        const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((h.z - minZ) / binWidth)));
        bins[idx]++;
      }
    });

    const maxCount = Math.max(1, ...bins);
    return bins.map((c) => c / maxCount);
  }, [hits, binsCount]);

  const curvePoints = useMemo(() => {
    const params: PhysicsParams = { wavelengthNm: wavelength, whichPath };
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 160; i++) {
      const z = minZ + (i / 160) * (maxZ - minZ);
      const intensity = computeIntensity(z, params);
      pts.push({ x: (i / 160) * 440, y: 118 - intensity * 102 });
    }
    return pts;
  }, [whichPath, wavelength]);

  const curveSvgPath = useMemo(() => {
    if (!curvePoints.length) return "";
    return curvePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  }, [curvePoints]);

  const color = wavelengthToColor(wavelength);

  const calculatedSpacing = computeFringeSpacing(wavelength).toFixed(2);

  return (
    <div className="analytics-card-wide">
      <div className="analytics-header">
        <div>
          <span className="section-kicker">MODULE 01 // DETECTOR DIAGNOSTICS</span>
          <h3 className="analytics-title">Phosphor Screen Intensity &amp; Density Function P(z)</h3>
        </div>
        <span className="analytics-tag" style={{ color: color.hex, borderColor: `${color.hex}55`, backgroundColor: `${color.hex}14` }}>
          {whichPath ? "DECOHERENCE COLLAPSE (2 CLASSICAL BANDS)" : "WAVE SUPERPOSITION (5+ INTERFERENCE FRINGES)"}
        </span>
      </div>

      <div className="plot-canvas-large">
        <svg viewBox="0 0 440 135" preserveAspectRatio="none" className="distribution-svg">
          <defs>
            <linearGradient id="plotGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.hex} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color.hex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="0" y1="120" x2="440" y2="120" stroke="#1d2e3e" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="220" y1="10" x2="220" y2="120" stroke="#1d2e3e" strokeWidth="1" strokeDasharray="2 4" />

          {/* Slit center projection markers at z = -0.55m and z = +0.55m */}
          <line x1="156" y1="18" x2="156" y2="120" stroke="#ffaa33" strokeWidth="1" strokeDasharray="1 3" opacity="0.4" />
          <line x1="284" y1="18" x2="284" y2="120" stroke="#ffaa33" strokeWidth="1" strokeDasharray="1 3" opacity="0.4" />

          {histogram.map((val, idx) => {
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
                fill={color.hex}
                opacity={0.35 + val * 0.55}
                rx="1"
              />
            );
          })}

          <path d={`${curveSvgPath} L 440 120 L 0 120 Z`} fill="url(#plotGradient)" />
          <path d={curveSvgPath} fill="none" stroke={color.hex} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="plot-axis-labels">
          <span>SLIT A PROJECTION (-0.55m)</span>
          <span>SCREEN OPTICAL AXIS (Z = 0)</span>
          <span>SLIT B PROJECTION (+0.55m)</span>
        </div>
      </div>

      <div className="plot-legend">
        <div className="legend-item">
          <span className="legend-swatch bar-swatch" style={{ backgroundColor: color.hex }} />
          <span>Accumulated Discrete Impacts ({hits.length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch line-swatch" style={{ borderColor: color.hex }} />
          <span>{whichPath ? "Two Classical Piles (No Cross-Term Interference)" : `Interference Pattern (|Ψ_A + Ψ_B|², λ = ${wavelength}nm)`}</span>
        </div>
      </div>

      {/* Real-Time Scientific Diagnostics Grid */}
      <div className="plot-diagnostic-grid">
        <div className="diagnostic-tile">
          <span className="diag-kicker">FRINGE VISIBILITY (V)</span>
          <span className={`diag-value ${whichPath ? "val-amber" : "val-cyan"}`}>
            {whichPath ? "0.0% (Zero Fringes)" : "96.4% (High Contrast)"}
          </span>
          <span className="diag-sub">V = (I_max - I_min) / (I_max + I_min)</span>
        </div>

        <div className="diagnostic-tile">
          <span className="diag-kicker">FRINGE SPACING (Δz)</span>
          <span className="diag-value">
            {whichPath ? "N/A (2 Separate Clumps)" : `~${calculatedSpacing} m`}
          </span>
          <span className="diag-sub">Δz = λ · L / d (Screen L = 5.68m, d = 1.10m)</span>
        </div>

        <div className="diagnostic-tile">
          <span className="diag-kicker">QUANTUM STATE |Ψ⟩</span>
          <span className="diag-value state-formula">
            {whichPath ? "|Slit A⟩ or |Slit B⟩" : "1/√2 (|Slit A⟩ + |Slit B⟩)"}
          </span>
          <span className="diag-sub">{whichPath ? "Decohered / Classical Mixture" : "Pure Spatial Wavepacket Superposition"}</span>
        </div>

        <div className="diagnostic-tile">
          <span className="diag-kicker">APPARATUS GEOMETRY</span>
          <span className="diag-value">L = 5.68m · d = 1.10m</span>
          <span className="diag-sub">Dual Slits a = 0.36m · 14.3m Optical Rail</span>
        </div>
      </div>
    </div>
  );
}

// --- Main Interactive Lab Shell ---
export default function DoubleSlitLab() {
  const [whichPath, setWhichPath] = useState(false);
  const [wavelength, setWavelength] = useState(532);
  const [emissionRate, setEmissionRate] = useState(15);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isRunning, setIsRunning] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [activePreset, setActivePreset] = useState<"cinematic" | "barrel" | "detector" | "slits" | "overhead">("cinematic");
  const [showWaveOverlay, setShowWaveOverlay] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hitHistory, setHitHistory] = useState<{ z: number; y: number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [singleShotTrigger, setSingleShotTrigger] = useState(0);
  const [guideStep, setGuideStep] = useState(1);
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showVideoModal) {
          setShowVideoModal(false);
        } else if (showTheoryModal) {
          setShowTheoryModal(false);
        } else if (isMaximized) {
          setIsMaximized(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMaximized, showTheoryModal, showVideoModal]);

  const currentColor = useMemo(() => wavelengthToColor(wavelength), [wavelength]);

  const handleHit = useCallback((z: number, y: number) => {
    setHitHistory((prev) => {
      const next = [...prev, { z, y }];
      return next.length > 2000 ? next.slice(-2000) : next;
    });
    setTotalCount((c) => c + 1);
  }, []);

  const handleReset = useCallback(() => {
    setHitHistory([]);
    setTotalCount(0);
    setResetKey((k) => k + 1);
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    quantumAudio.setEnabled(nextState);
    setSoundEnabled(nextState);
  };

  const fireSingle = () => {
    setSingleShotTrigger((id) => id + 1);
  };

  const selectPreset = (presetId: "cinematic" | "barrel" | "detector" | "overhead" | "slits") => {
    setActivePreset(presetId);
  };

  const handleStepSelect = (stepNum: number) => {
    setGuideStep(stepNum);
    handleReset();

    if (stepNum === 0) {
      setWhichPath(true);
      setIsRunning(true);
      setEmissionRate(8);
      setActivePreset("cinematic");
    } else if (stepNum === 1) {
      setWhichPath(false);
      setIsRunning(true);
      setEmissionRate(15);
      setActivePreset("detector");
    } else if (stepNum === 2) {
      setWhichPath(true);
      setIsRunning(true);
      setEmissionRate(15);
      setActivePreset("slits");
    } else if (stepNum === 3) {
      setWhichPath(false);
      setWavelength(405);
      setIsRunning(true);
      setEmissionRate(25);
      setActivePreset("barrel");
    }
  };

  return (
    <div className="quantum-studio-root">
      {/* Sleek Studio Header */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <Link href="/" className="back-hub-btn" title="Back to QuantaLab Experiments Catalog">
            <span className="back-arrow">←</span>
            <span>CATALOG</span>
          </Link>
          <div className="topbar-divider-v" />
          <div className="studio-logo" aria-hidden="true">Ψ</div>
          <div className="topbar-branding">
            <div className="topbar-title-row">
              <h1 className="studio-title">QUANTUM OPTICS LAB</h1>
              <span className="studio-status-pill">
                <span className="status-dot-live" />
                SIMULATION ACTIVE
              </span>
            </div>
            <span className="studio-subtitle">THE DOUBLE-SLIT EXPERIMENT &amp; WAVE-PARTICLE DUALITY</span>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="topbar-actions">
          <button
            onClick={() => {
              setVideoStartTime(0);
              setShowVideoModal(true);
            }}
            className="topbar-btn video-guide-btn"
            title="Watch YouTube video explaining the double-slit experiment & observer effect"
          >
            <span className="yt-badge">▶</span>
            <span>VIDEO GUIDE</span>
          </button>

          <button
            onClick={() => setShowTheoryModal(true)}
            className="topbar-btn theory-btn"
            title="Read physical explanation of wave-particle duality"
          >
            <span>📖 THEORY &amp; MATH</span>
          </button>
        </div>
      </header>

      {/* Hero Grand 3D Viewport: Expansive Cinematic Scale */}
      <section className={`grand-viewport-section ${isMaximized ? "is-maximized" : ""}`}>
        <div className="canvas-wrapper">
          <DoubleSlitScene
            wavelength={wavelength}
            whichPath={whichPath}
            emissionRate={emissionRate}
            speedMultiplier={speedMultiplier}
            isRunning={isRunning}
            resetKey={resetKey}
            activePreset={activePreset}
            showWaveOverlay={showWaveOverlay}
            showLabels={showLabels}
            onHit={handleHit}
            triggerSinglePhoton={singleShotTrigger}
          />

          {/* TOP HUD DECK: Unified Glass Control Bar */}
          <div className="viewport-top-hud">
            {/* Left: Master Quantum Observation State Switcher */}
            <div className="hud-section">
              <div className="hud-observer-switcher">
                <div className="hud-mode-pill-group" role="group" aria-label="Quantum State Switcher">
                  <button
                    type="button"
                    onClick={() => {
                      if (whichPath) {
                        setWhichPath(false);
                        handleReset();
                      }
                    }}
                    className={`hud-mode-btn wave-mode ${!whichPath ? "active" : ""}`}
                    title="No observer: photon travels in wave superposition through both slits, producing 5+ interference fringes"
                    aria-pressed={!whichPath}
                  >
                    <span className="hud-mode-icon">🌊</span>
                    <div className="hud-mode-content">
                      <span className="hud-mode-title">NO OBSERVER</span>
                      <span className="hud-mode-status">WAVE SUPERPOSITION</span>
                    </div>
                    {!whichPath && <span className="hud-pulse-dot dot-cyan" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!whichPath) {
                        setWhichPath(true);
                        handleReset();
                      }
                    }}
                    className={`hud-mode-btn observer-mode ${whichPath ? "active" : ""}`}
                    title="Observer active: detectors at slits measure which slit each photon enters, collapsing superposition into 2 classical bands"
                    aria-pressed={whichPath}
                  >
                    <span className="hud-mode-icon">👁️</span>
                    <div className="hud-mode-content">
                      <span className="hud-mode-title">OBSERVER ACTIVE</span>
                      <span className="hud-mode-status">PARTICLE COLLAPSE</span>
                    </div>
                    {whichPath && <span className="hud-pulse-dot dot-amber" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Center: Camera Angles Toolbar */}
            <div className="hud-section hud-center-section">
              <div className="hud-camera-toolbar" role="toolbar" aria-label="Camera Presets">
                <span className="hud-deck-label">📷 CAMERA:</span>
                <div className="hud-cam-btn-group">
                  {CAMERA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => selectPreset(preset.id)}
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

            {/* Right: Viewport Utilities Dock */}
            <div className="hud-section hud-right-section">
              <div className="hud-utility-dock">
                <button
                  onClick={toggleSound}
                  className={`hud-tool-btn ${soundEnabled ? "tool-active" : ""}`}
                  title={soundEnabled ? "Audio chimes active (Click to Mute)" : "Muted (Click to enable audio chimes)"}
                  aria-pressed={soundEnabled}
                >
                  <span>{soundEnabled ? "🔊 AUDIO" : "🔇 MUTED"}</span>
                </button>

                <button
                  onClick={() => setShowWaveOverlay((v) => !v)}
                  className={`hud-tool-btn ${showWaveOverlay ? "tool-active" : ""}`}
                  title="Overlay continuous theoretical wave fringes on phosphor detector screen"
                >
                  <span>≋ {showWaveOverlay ? "WAVE ON" : "WAVE"}</span>
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
                  title={isMaximized ? "Exit Fullscreen Theater View (Esc)" : "Expand to Fullscreen Theater View"}
                >
                  <span>{isMaximized ? "❐ EXIT" : "⛶ EXPAND"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Hint */}
          <div className="viewport-orbit-hint" aria-hidden="true">
            <span>Left-Click Drag: Rotate Apparatus • Scroll: Zoom • Right-Click: Pan</span>
          </div>

          {/* BOTTOM HUD DECK: Unified Glass Telemetry & Playback Bar */}
          <div className="viewport-bottom-hud">
            {/* Left: Live Instrument Telemetry */}
            <div className="hud-section">
              <div className="hud-telemetry-cluster">
                <div className="hud-metric">
                  <span className="hud-metric-kicker">DETECTIONS</span>
                  <span className="hud-metric-val">{String(totalCount).padStart(5, "0")}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">WAVELENGTH</span>
                  <span className="hud-metric-val" style={{ color: currentColor.hex }}>
                    {wavelength} nm
                  </span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">PATTERN</span>
                  <span className={`hud-metric-val ${whichPath ? "val-amber" : "val-cyan"}`}>
                    {whichPath ? "2 CLASSICAL BANDS" : "5+ WAVE FRINGES"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Center: Playback Stream Control */}
            <div className="hud-section hud-center-section">
              <div className="hud-playback-cluster">
                <button
                  onClick={() => setIsRunning((r) => !r)}
                  className={`hud-stream-btn ${isRunning ? "stream-pause" : "stream-play"}`}
                  title={isRunning ? "Pause continuous photon stream" : "Resume continuous photon stream"}
                >
                  {isRunning ? "❚❚ PAUSE STREAM" : "▶ RESUME STREAM"}
                </button>

                <button
                  onClick={fireSingle}
                  className="hud-single-btn"
                  title="Fire exactly one single photon in slow motion"
                >
                  ⚡ FIRE 1 PHOTON
                </button>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Right: Simulation Speed Pills */}
            <div className="hud-section hud-right-section">
              <div className="hud-speed-cluster" role="radiogroup" aria-label="Simulation Speed">
                <span className="hud-deck-label">⏱ SPEED:</span>
                <div className="hud-speed-pills">
                  {[
                    { value: 0.1, label: "0.1x", title: "Ultra Slow-Motion (10x slower) — Inspect single wavepacket splitting" },
                    { value: 0.25, label: "0.25x", title: "Slow-Motion (4x slower)" },
                    { value: 0.5, label: "0.5x", title: "Half Speed (2x slower)" },
                    { value: 1.0, label: "1x", title: "Normal Real-Time Speed" },
                    { value: 2.0, label: "2x", title: "Fast (2x faster)" },
                    { value: 4.0, label: "4x", title: "Ultra Fast (4x faster) — Rapid accumulation" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSpeedMultiplier(s.value)}
                      className={`hud-speed-btn ${speedMultiplier === s.value ? "active" : ""}`}
                      title={s.title}
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

      {/* 2-Column Analytical Dashboard: Live Plot + Complete Experiment Controls */}
      <section className="dashboard-console-grid">
        {/* Left Column: Live Probability Distribution Graph */}
        <LiveDistributionPlot
          whichPath={whichPath}
          wavelength={wavelength}
          hits={hitHistory}
        />

        {/* Right Column: Complete Interactive Control Deck */}
        <div className="controls-deck">
          {/* Card 1: Coherent Laser Source Calibration */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 02 // SOURCE CALIBRATION</span>
                <h4 className="card-subheading">Monochromatic Laser Wavelength (λ)</h4>
              </div>
              <span className="wl-spec-badge" style={{ color: currentColor.hex, borderColor: `${currentColor.hex}44`, backgroundColor: `${currentColor.hex}15` }}>
                {wavelength} nm · {currentColor.name}
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
                value={wavelength}
                onChange={(e) => setWavelength(Number(e.target.value))}
                className="quantum-slider"
                aria-label="Laser wavelength in nanometers"
                style={
                  {
                    "--slider-color": currentColor.hex,
                    "--slider-percent": `${((wavelength - 390) / (700 - 390)) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>

            {/* Quick Spectral Line Shortcuts */}
            <div className="spectral-shortcuts-row">
              <span className="spectral-label">SPECTRAL PRESETS:</span>
              <div className="spectral-pills">
                {[
                  { nm: 405, label: "405nm Violet", hex: "#9b51e0", note: "Tighter Fringes" },
                  { nm: 488, label: "488nm Cyan", hex: "#00d4ff", note: "Argon Line" },
                  { nm: 532, label: "532nm Green", hex: "#00ff87", note: "Reference DPSS" },
                  { nm: 633, label: "633nm He-Ne Red", hex: "#ff3b30", note: "Wider Fringes" },
                ].map((spec) => (
                  <button
                    key={spec.nm}
                    type="button"
                    onClick={() => setWavelength(spec.nm)}
                    className={`spectral-pill ${wavelength === spec.nm ? "active" : ""}`}
                    style={wavelength === spec.nm ? { borderColor: spec.hex, color: spec.hex, background: `${spec.hex}18` } : {}}
                    title={`${spec.label} (${spec.note})`}
                  >
                    <span className="spectral-dot" style={{ backgroundColor: spec.hex }} />
                    {spec.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rate-row">
              <span className="rate-label">EMISSION FLUX RATE:</span>
              <div className="rate-pills">
                {[
                  { rate: 1, label: "1 / s (Single)" },
                  { rate: 5, label: "5 / s" },
                  { rate: 15, label: "15 / s" },
                  { rate: 35, label: "35 / s (Stream)" },
                ].map((item) => (
                  <button
                    key={item.rate}
                    onClick={() => setEmissionRate(item.rate)}
                    className={`rate-pill ${emissionRate === item.rate ? "selected" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Guided Experiments Tour */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">MODULE 03 // INVESTIGATION SCENARIOS</span>
                <h4 className="card-subheading">Interactive Quantum Phenomenon Tour</h4>
              </div>
              <span className="step-indicator">STEP {guideStep + 1} OF 4</span>
            </div>

            <div className="tour-pill-grid">
              {[
                { idx: 0, label: "1. Classical Particle Piles", sub: "Observer ON · 2 straight lines behind slits" },
                { idx: 1, label: "2. Wave Superposition Fringes", sub: "No Observer · Multi-fringe interference emerges" },
                { idx: 2, label: "3. Which-Path Observer Collapse", sub: "Slit detectors active · Superposition collapses" },
                { idx: 3, label: "4. Violet Wavelength Compression", sub: "λ = 405nm · Fringes compress visibly" },
              ].map((step) => (
                <button
                  key={step.idx}
                  onClick={() => handleStepSelect(step.idx)}
                  className={`tour-card-btn ${guideStep === step.idx ? "active" : ""}`}
                >
                  <div className="tour-card-header">
                    <span className="tour-card-title">{step.label}</span>
                    <span className="tour-card-arrow">↗</span>
                  </div>
                  <span className="tour-card-sub">{step.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Theory & Video Guide Companion */}
          <div className="control-card media-companion-card">
            <div className="media-companion-header">
              <div className="media-badge-icon">Ψ</div>
              <div>
                <span className="card-tag">MODULE 04 // PHENOMENON &amp; MEDIA</span>
                <h4 className="media-companion-title">Wave-Particle Duality &amp; Measurement Theory</h4>
                <p className="media-companion-desc">
                  Explore how single photons interfere with themselves as probability wavepackets, and why physical detection at the slits destroys phase coherence.
                </p>
              </div>
            </div>

            <div className="media-companion-actions">
              <button
                type="button"
                onClick={() => {
                  setVideoStartTime(0);
                  setShowVideoModal(true);
                }}
                className="companion-btn companion-video-btn"
                title="Watch Dr. Quantum's animated double slit video"
              >
                <span className="yt-badge">▶</span>
                <span>Watch Video Guide (Dr. Quantum Animation)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTheoryModal(true)}
                className="companion-btn companion-theory-btn"
                title="Read mathematical and physical explanation"
              >
                <span>📖 Physics &amp; Mathematics Guide</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Physics Demystification Modal / Drawer */}
      {showTheoryModal && (
        <div className="modal-backdrop" onClick={() => setShowTheoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Wave or Particle? The Quantum Paradox Demystified</h3>
              <button
                onClick={() => setShowTheoryModal(false)}
                className="modal-close-btn"
                aria-label="Close explanation modal"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Why do we see individual dots in both modes?</strong>
              </p>
              <div className="modal-callout">
                Light is always absorbed as discrete quantum packets (photons). You will always detect single localized dots on the screen. However, <em>how the photons travel</em> is what changes:
              </div>
              <ul className="modal-list">
                <li>
                  <strong>WITHOUT OBSERVER (Wave Superposition):</strong> The photon travels as a continuous spatial wave packet passing through <em>both</em> slits simultaneously. The waves from Slit A and Slit B interfere constructively and destructively, guiding the dots into <strong>5+ bright and dark interference fringes</strong>.
                </li>
                <li>
                  <strong>WITH OBSERVER (Which-Path Collapse):</strong> Physical sensors at the slits interact with the photon to determine its path. This physical interaction destroys phase superposition (decoherence). The photon is forced into a localized particle that travels through only <em>one</em> slit, landing in <strong>two classical straight piles</strong>.
                </li>
                <li>
                  <strong>&quot;Observer&quot; is NOT human consciousness:</strong> Any physical interaction (a photodetector, a polarization filter, or an atom scattering) that entangles with the photon constitutes an &quot;observation&quot;.
                </li>
              </ul>

              <div className="modal-video-cta-box">
                <div className="modal-video-cta-info">
                  <span className="modal-video-cta-title">Prefer an animated video breakdown?</span>
                  <span className="modal-video-cta-desc">Watch Dr. Quantum explain wave-particle duality and the observer effect on YouTube.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTheoryModal(false);
                    setShowVideoModal(true);
                  }}
                  className="modal-video-cta-btn"
                >
                  <span className="yt-badge">▶</span>
                  <span>WATCH VIDEO EXPLANATION</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Video Explanation Modal */}
      {showVideoModal && (
        <div className="modal-backdrop" onClick={() => setShowVideoModal(false)}>
          <div className="modal-content video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="video-modal-title-group">
                <span className="yt-badge">▶ YOUTUBE</span>
                <h3>The Double-Slit Experiment &amp; The Observer Effect</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="modal-close-btn"
                aria-label="Close video explanation modal"
              >
                ✕
              </button>
            </div>

            <div className="video-player-wrapper">
              <iframe
                key={videoStartTime}
                src={`https://www.youtube-nocookie.com/embed/Ms-CVF540fo?autoplay=1&rel=0&start=${videoStartTime}`}
                title="The Double Slit Experiment Explained by Dr Quantum"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="youtube-iframe"
              />
            </div>

            <div className="video-modal-footer">
              <div className="video-guide-points">
                <span className="guide-points-title">Jump to Key Stages:</span>
                <div className="guide-chips">
                  {[
                    { start: 0, time: "0:00", label: "Classical Particles (2 Bands)" },
                    { start: 80, time: "1:20", label: "Wave Interference (Fringes)" },
                    { start: 150, time: "2:30", label: "Single Photons Creating Fringes" },
                    { start: 230, time: "3:50", label: "The Observer Effect (Wave Collapse)" },
                  ].map((ch) => (
                    <button
                      key={ch.start}
                      type="button"
                      onClick={() => setVideoStartTime(ch.start)}
                      className={`guide-chip-btn ${videoStartTime === ch.start ? "active" : ""}`}
                      title={`Jump to ${ch.time}`}
                    >
                      <strong>{ch.time}</strong> {ch.label}
                    </button>
                  ))}
                </div>
              </div>
              <a
                href={videoStartTime > 0 ? `https://www.youtube.com/watch?v=Ms-CVF540fo&t=${videoStartTime}s` : "https://www.youtube.com/watch?v=Ms-CVF540fo"}
                target="_blank"
                rel="noopener noreferrer"
                className="open-yt-btn"
              >
                Open on YouTube ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
