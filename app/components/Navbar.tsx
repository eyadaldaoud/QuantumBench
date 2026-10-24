"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EXPERIMENTS } from "@/lib/experiments";

interface NavbarProps {
  currentExperimentSlug?: string;
}

export default function Navbar({ currentExperimentSlug }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="platform-nav-header">
      <div className="platform-nav-container">
        {/* Brand / Logo */}
        <Link href="/" className="platform-brand" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="brand-symbol" aria-hidden="true">
            <span className="brand-orbit">⚛</span>
          </div>
          <div className="brand-text-block">
            <div className="brand-title-line">
              <span className="brand-title">QUANTALAB</span>
              <span className="brand-version-pill">v1.0 BETA</span>
            </div>
            <span className="brand-tagline">VIRTUAL QUANTUM &amp; OPTICS LABORATORY</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="platform-nav-menu" aria-label="Main Navigation">
          <Link
            href="/"
            className={`nav-link ${!currentExperimentSlug ? "active" : ""}`}
          >
            Catalog
          </Link>

          {/* Experiments Dropdown */}
          <div
            className="nav-dropdown-wrapper"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button
              type="button"
              className={`nav-link nav-dropdown-btn ${currentExperimentSlug ? "active" : ""}`}
              onClick={() => setIsDropdownOpen((v) => !v)}
              aria-expanded={isDropdownOpen}
            >
              <span>Experiments</span>
              <span className="dropdown-caret">▾</span>
            </button>

            {isDropdownOpen && (
              <div className="nav-dropdown-menu">
                <div className="dropdown-section-header">ACTIVE SIMULATIONS</div>
                {EXPERIMENTS.filter((e) => e.status === "active").map((exp) => (
                  <Link
                    key={exp.id}
                    href={exp.route}
                    className={`dropdown-item active-sim ${currentExperimentSlug === exp.slug ? "current" : ""}`}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="dropdown-exp-icon">{exp.icon}</span>
                    <div className="dropdown-exp-info">
                      <div className="dropdown-exp-name">
                        {exp.title}
                        <span className="badge-live-mini">LIVE</span>
                      </div>
                      <span className="dropdown-exp-sub">{exp.subtitle}</span>
                    </div>
                  </Link>
                ))}

                {EXPERIMENTS.some((e) => e.status !== "active") && (
                  <>
                    <div className="dropdown-divider" />
                    <div className="dropdown-section-header">UPCOMING</div>
                    {EXPERIMENTS.filter((e) => e.status !== "active").map((exp) => (
                      <Link
                        key={exp.id}
                        href={`/#exp-${exp.slug}`}
                        className="dropdown-item upcoming-sim"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <span className="dropdown-exp-icon">{exp.icon}</span>
                        <div className="dropdown-exp-info">
                          <div className="dropdown-exp-name">
                            {exp.title}
                            <span className="badge-soon-mini">UPCOMING</span>
                          </div>
                          <span className="dropdown-exp-sub">{exp.category}</span>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/#about" className="nav-link">
            About
          </Link>
          <Link href="/#docs" className="nav-link">
            Docs &amp; Math
          </Link>
        </nav>

        {/* Right Action Cluster */}
        <div className="platform-nav-actions">
          <Link
            href="/experiments/double-slit"
            className="btn-launch-header"
            title="Launch 3D Double-Slit Optical Bench"
          >
            <span className="btn-launch-glow" />
            <span className="btn-launch-icon">⚡</span>
            <span>LAUNCH DOUBLE-SLIT LAB</span>
          </Link>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            aria-label="Toggle mobile menu"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <Link
            href="/"
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🏠 Experiments Catalog
          </Link>
          <Link
            href="/experiments/double-slit"
            className="mobile-nav-link live-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🌊 Double-Slit 3D Simulation (Live)
          </Link>
          <Link
            href="/#about"
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🔬 Physics Principles &amp; Architecture
          </Link>
          <Link
            href="/#docs"
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            📖 Documentation &amp; Contribute
          </Link>
        </div>
      )}
    </header>
  );
}
