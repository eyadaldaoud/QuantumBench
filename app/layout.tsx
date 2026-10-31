import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#03070d",
};

export const metadata: Metadata = {
  title: "QuantaLab — Virtual 3D Quantum & Modern Physics Laboratory",
  description:
    "An open-source, interactive 3D simulation platform for exploring quantum mechanics, wave-particle duality, space quantization, and modern physics directly in your browser.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
  keywords: [
    "Quantum Physics",
    "Double-Slit Experiment",
    "Three.js 3D Simulation",
    "Wave-Particle Duality",
    "Observer Effect",
    "Stern-Gerlach",
    "Quantum Tunneling",
    "Quantum Mechanics Simulator",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
