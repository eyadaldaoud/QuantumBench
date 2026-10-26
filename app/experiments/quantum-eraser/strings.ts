/**
 * User-facing copy and localized strings for the Quantum Eraser Experiment.
 *
 * Rules:
 * - No forbidden claims or wording (no consciousness, "the photon knows",
 *   "observer changes reality", "the future changes the past", "the photon decides").
 * - Accurate phrasing: "which-path information is recorded / available / erased".
 * - References strictly limited to Walborn et al. (2002) and Kim et al. (2000).
 */

export const STRINGS = {
  experiment: {
    title: "THE QUANTUM ERASER",
    subtitle: "WHICH-PATH TAGGING, POLARIZATION & STATE ERASURE",
    badge: "2-CHANNEL POLARIZATION ANALYZER",
    breadcrumbCatalog: "CATALOG",
  },

  modes: {
    plain: {
      id: "plain",
      name: "Plain Double Slit",
      shortLabel: "PLAIN",
      description: "No polarization tags: optical waves interfere to produce standard interference fringes.",
      tagline: "NO TAGS: WAVE INTERFERENCE",
    },
    tagged: {
      id: "tagged",
      name: "Which-Path Tagged",
      shortLabel: "TAGGED",
      description: "Slit 1 is marked horizontally (H) and Slit 2 vertically (V). Fringes vanish because orthogonal states cannot interfere.",
      tagline: "H / V TAGGED: WHICH-PATH RECORDED",
    },
    analyzer: {
      id: "analyzer",
      name: "Eraser Analyzer",
      shortLabel: "ANALYZER",
      description: "Polarizing beam splitter oriented at angle θ sorts photons into complementary Channels A and B.",
      tagline: "ANALYZER ACTIVE: POLARIZATION SORTED",
    },
  },

  views: {
    all: "All Hits (A + B)",
    channelA: "Channel A (θ)",
    channelB: "Channel B (θ + 90°)",
    overlay: "Overlaid (A & B)",
  },

  controls: {
    analyzerAngle: "Analyzer Angle (θ)",
    analyzerHelp: "Rotates the polarizing beam splitter analyzer from 0° to 90°. Enabled in Analyzer mode.",
    visibilityReadout: "Fringe Visibility |sin(2θ)|",
    wavelength: "Wavelength (λ)",
    slitSeparation: "Slit Separation (d)",
    slitWidth: "Slit Width (a)",
    particleRate: "Photon Emission Rate",
    particleSpeed: "Simulation Speed",
    pauseStream: "Pause Stream",
    resumeStream: "Resume Stream",
    fireSingle: "Fire 1 Photon",
    clearHits: "Clear Hits",
    reset: "Reset Defaults",
    detectorView: "Detector Screen View",
    camera: "Camera Preset",
  },

  hud: {
    telemetryTitle: "INSTRUMENT TELEMETRY",
    detections: "DETECTIONS",
    channelACount: "CHANNEL A",
    channelBCount: "CHANNEL B",
    visibility: "VISIBILITY",
    mode: "MODE",
  },

  walkthrough: {
    title: "Guided Discovery Walkthrough",
    kicker: "STEP-BY-STEP TUTORIAL",
    steps: [
      {
        stepNumber: 1,
        title: "1. Plain Double Slit",
        summary: "Fringes appear on the screen.",
        detail:
          "In the untagged configuration, light traverses the dual slits without distinguishing markers. Wave amplitudes from both apertures interfere constructively and destructively, forming standard spatial fringes on the detector.",
        presetMode: "plain" as const,
        recommendedTheta: 45,
      },
      {
        stepNumber: 2,
        title: "2. Which-Path Tagged",
        summary: "Fringes disappear, because which-path information now exists in the polarization, even if nobody reads it.",
        detail:
          "Orthogonal polarizers are placed at the slits: Slit 1 is polarized horizontally (H) and Slit 2 vertically (V). Because the two polarization states are mutually orthogonal (|H⟩ · |V⟩ = 0), cross-interference terms cancel. Fringes vanish completely into an unmodulated envelope, regardless of whether any measurement is carried out.",
        presetMode: "tagged" as const,
        recommendedTheta: 45,
      },
      {
        stepNumber: 3,
        title: "3. Polarization Analyzer",
        summary: "The All hits pattern is still flat. Sort the hits by analyzer channel and each channel shows fringes, the two being complementary. Add them together and the fringes cancel.",
        detail:
          "A polarizing beam splitter oriented at angle θ projects the polarization onto diagonal measurement bases. The combined all-hits pattern remains strictly flat with zero fringes. However, when hits are sorted into Channel A (transmitted at θ) and Channel B (reflected at θ + 90°), each channel reveals distinct interference fringes with visibility |sin(2θ)|. Channel B forms an anti-fringe shifted by half a fringe period: adding A and B together cancels the fringes completely.",
        presetMode: "analyzer" as const,
        recommendedTheta: 45,
      },
    ],
    takeawayHeading: "Key Takeaway",
    takeawayText:
      "The eraser does not bring the fringes back in the total pattern. It reveals them in correctly sorted subsets.",
  },

  theory: {
    title: "Theory & Mathematical Foundations",
    modelNote: "Simplified model: far-field, ideal polarizers, equal slit intensities.",
    farFieldExplanation:
      "In the Fraunhofer far-field diffraction regime (L ≫ d, a), the probability density on the screen decomposes into a single-slit diffraction envelope g(x) = sinc²(πax / λL) and an interference modulation governed by the phase difference 2φ(x) = 2πdx / λL.",
    orthogonalityExplanation:
      "When orthogonal polarizations H and V mark which slit a photon traverses, the total state is |Ψ⟩ = (|1, H⟩ + |2, V⟩) / √2. The interference cross-term is proportional to the scalar product ⟨H|V⟩ = 0, so the total intensity distribution simplifies to g(x) without fringes. Which-path information is recorded in the physical polarization state.",
    analyzerExplanation:
      "When an analyzer oriented at angle θ projects the state onto linear basis vectors |θ⟩ and |θ + 90°⟩, the probability density splits into two complementary channels: p_A(x) = 0.5 · g(x) · (1 + sin(2θ) cos(2φ)) and p_B(x) = 0.5 · g(x) · (1 - sin(2θ) cos(2φ)). Their sum is identically g(x) for all angles θ. Which-path information is erased within each sorted channel by measuring in a basis that cannot distinguish H from V.",
    learnMoreHeading: "Learn More: Delayed-Choice Experiments",
    learnMoreText:
      "In delayed-choice configurations using entangled photon pairs generated via spontaneous parametric down-conversion, the sorting measurement on the 'idler' photon can be carried out after the 'signal' photon has already registered on the detector screen. The total unconditioned detection pattern remains flat at all times; interference fringes emerge exclusively when coincidence-counting filters the signal detections against corresponding idler detector channels.",
    citationsHeading: "References",
    citations: [
      {
        authors: "S. P. Walborn, M. O. Terra Cunha, S. Pádua, and C. H. Monken",
        title: "Double-slit quantum eraser",
        journal: "Phys. Rev. A",
        volume: "65",
        page: "033818",
        year: "2002",
      },
      {
        authors: "Y.-H. Kim, R. Yu, S. P. Kulik, Y. Shih, and M. O. Scully",
        title: "Delayed 'Choice' Quantum Eraser",
        journal: "Phys. Rev. Lett.",
        volume: "84",
        page: "1",
        year: "2000",
      },
    ],
  },
};
