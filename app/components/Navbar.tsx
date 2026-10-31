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

          {/* GitHub Repo Link */}
          <a
            href="https://github.com/eyadaldaoud/QuantaLab"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-github-link"
            title="View QuantaLab on GitHub"
            aria-label="GitHub Repository"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
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
            href="/experiments/quantum-eraser"
            className="mobile-nav-link live-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🪞 Quantum Eraser Lab (Live)
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
