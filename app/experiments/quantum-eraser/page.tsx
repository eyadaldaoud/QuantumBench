import type { Metadata } from "next";
import QuantumEraserLab from "./quantum-eraser-lab";

export const metadata: Metadata = {
  title: "The Quantum Eraser — Interactive 3D Quantum Optics Lab | QuantaLab",
  description:
    "Interactive 3D simulation of the Quantum Eraser experiment. Explore which-path polarization tagging, fringe destruction, and state erasure via sorted polarization analysis.",
};

export default function QuantumEraserPage() {
  return <QuantumEraserLab />;
}
