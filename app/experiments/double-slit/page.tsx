import type { Metadata } from "next";
import DoubleSlitLab from "@/app/double-slit-lab";

export const metadata: Metadata = {
  title: "The Double-Slit Experiment — Interactive 3D Quantum Lab | QuantaLab",
  description:
    "Interactive 3D simulation of Young's double-slit experiment. Observe single-photon wave interference, wave-particle duality, and quantum state collapse via observer detectors.",
};

export default function DoubleSlitExperimentPage() {
  return <DoubleSlitLab />;
}
