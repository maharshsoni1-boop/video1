/**
 * ReelKar Style Presets
 * Defines the visual, typographic, motion, particle, and audio characteristics
 * for each of the 4 reel styles.
 */

export const PRESETS = {
  'royal-gold': {
    id: 'royal-gold',
    name: 'Royal Gold',
    badge: 'Popular for Jewellery',
    description: 'Dark background, regal gold accents, slow cinematic Ken Burns zoom, luxury serif typography.',
    previewBg: 'linear-gradient(135deg, #100f14 0%, #1c1822 50%, #0d0b10 100%)',
    previewBorder: '1px solid #d4af37',
    previewTagColor: '#d4af37',
    
    // Canvas Visuals
    colors: {
      background: '#0a0a0e',
      primaryText: '#f5ecd7',
      accentGold: '#d4af37',
      accentSecondary: '#f9d976',
      pillBg: 'rgba(16, 14, 20, 0.78)',
      pillBorder: 'rgba(212, 175, 55, 0.5)',
      vignetteColor: 'rgba(0, 0, 0, 0.65)',
      cardBg: '#121018',
    },

    typography: {
      titleFont: "bold 58px 'Playfair Display', Georgia, serif",
      subtitleFont: "500 32px 'Inter', sans-serif",
      priceFont: "bold 44px 'Playfair Display', serif",
      badgeFont: "600 24px 'Inter', sans-serif",
      letterSpacing: '2px',
    },

    motion: {
      zoomAmount: 0.12, // +12% zoom over slide
      transitionType: 'crossfade', // crossfade with subtle depth
      transitionDuration: 0.5,
      slideDuration: 2.7,
      ease: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },

    particles: {
      enabled: true,
      type: 'gold-sparkle',
      count: 28,
      speed: 0.8,
      colors: ['#ffe599', '#ffd700', '#fff', '#e5b842'],
      shimmer: true,
    },

    grade: {
      brightness: 1.02,
      contrast: 1.1,
      saturate: 1.15,
      warmthHex: 'rgba(212, 175, 55, 0.08)',
    },

    audioMood: 'royal',
  },

  'festive': {
    id: 'festive',
    name: 'Festive',
    badge: 'Diwali & Weddings',
    description: 'Warm celebratory colors, festive sparkle bursts, upbeat Indian rhythms, and decorative accents.',
    previewBg: 'linear-gradient(135deg, #2b0816 0%, #4a1024 50%, #1f040d 100%)',
    previewBorder: '1px solid #ff9933',
    previewTagColor: '#ff9933',

    colors: {
      background: '#1a050f',
      primaryText: '#fff8f0',
      accentGold: '#ff9933',
      accentSecondary: '#ffd166',
      pillBg: 'rgba(43, 8, 22, 0.85)',
      pillBorder: 'rgba(255, 153, 51, 0.6)',
      vignetteColor: 'rgba(26, 5, 15, 0.7)',
      cardBg: '#2a0917',
    },

    typography: {
      titleFont: "bold 60px 'Playfair Display', Georgia, serif",
      subtitleFont: "600 32px 'Inter', sans-serif",
      priceFont: "bold 46px 'Playfair Display', serif",
      badgeFont: "700 26px 'Inter', sans-serif",
      letterSpacing: '1.5px',
    },

    motion: {
      zoomAmount: 0.16,
      transitionType: 'slide', // energetic slide & crossfade
      transitionDuration: 0.38,
      slideDuration: 2.4,
      ease: 'ease-out',
    },

    particles: {
      enabled: true,
      type: 'festive-burst',
      count: 40,
      speed: 1.3,
      colors: ['#ff9933', '#ffd166', '#ff4d6d', '#ffffff'],
      shimmer: true,
    },

    grade: {
      brightness: 1.05,
      contrast: 1.15,
      saturate: 1.25,
      warmthHex: 'rgba(255, 107, 107, 0.09)',
    },

    audioMood: 'festive',
  },

  'minimal-luxe': {
    id: 'minimal-luxe',
    name: 'Minimal Luxe',
    badge: 'Clean Modern Aesthetic',
    description: 'Subtle light balance, soft fades, generous whitespace, thin modern sans-serif typography.',
    previewBg: 'linear-gradient(135deg, #1c1d22 0%, #282a33 50%, #131418 100%)',
    previewBorder: '1px solid #a0a6b5',
    previewTagColor: '#e2e8f0',

    colors: {
      background: '#0e1015',
      primaryText: '#f8fafc',
      accentGold: '#e2e8f0',
      accentSecondary: '#94a3b8',
      pillBg: 'rgba(15, 23, 42, 0.75)',
      pillBorder: 'rgba(226, 232, 240, 0.35)',
      vignetteColor: 'rgba(0, 0, 0, 0.45)',
      cardBg: '#131822',
    },

    typography: {
      titleFont: "300 56px 'Inter', sans-serif",
      subtitleFont: "400 30px 'Inter', sans-serif",
      priceFont: "500 42px 'Inter', sans-serif",
      badgeFont: "500 24px 'Inter', sans-serif",
      letterSpacing: '3px',
    },

    motion: {
      zoomAmount: 0.08, // very subtle slow zoom
      transitionType: 'crossfade',
      transitionDuration: 0.55,
      slideDuration: 2.8,
      ease: 'ease-in-out',
    },

    particles: {
      enabled: false,
      type: 'none',
      count: 0,
      speed: 0,
      colors: [],
      shimmer: false,
    },

    grade: {
      brightness: 1.0,
      contrast: 1.05,
      saturate: 1.02,
      warmthHex: 'transparent',
    },

    audioMood: 'minimal',
  },

  'bold-reel': {
    id: 'bold-reel',
    name: 'Bold Reel',
    badge: 'Trending & Fast-Paced',
    description: 'Fast cuts, bold punchy titles, quick zoom-throughs, modern vibrant high-contrast style.',
    previewBg: 'linear-gradient(135deg, #090e17 0%, #132238 50%, #05080e 100%)',
    previewBorder: '1px solid #38bdf8',
    previewTagColor: '#38bdf8',

    colors: {
      background: '#05080e',
      primaryText: '#ffffff',
      accentGold: '#38bdf8',
      accentSecondary: '#facc15',
      pillBg: 'rgba(5, 8, 14, 0.9)',
      pillBorder: 'rgba(56, 189, 248, 0.7)',
      vignetteColor: 'rgba(0, 0, 0, 0.7)',
      cardBg: '#09111e',
    },

    typography: {
      titleFont: "900 66px 'Inter', Impact, sans-serif",
      subtitleFont: "700 34px 'Inter', sans-serif",
      priceFont: "900 48px 'Inter', sans-serif",
      badgeFont: "800 26px 'Inter', sans-serif",
      letterSpacing: '0.5px',
    },

    motion: {
      zoomAmount: 0.22, // punchy zoom
      transitionType: 'whip', // whip / snap cut
      transitionDuration: 0.3,
      slideDuration: 2.2,
      ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },

    particles: {
      enabled: true,
      type: 'bold-flash',
      count: 18,
      speed: 2.0,
      colors: ['#38bdf8', '#facc15', '#ffffff'],
      shimmer: false,
    },

    grade: {
      brightness: 1.08,
      contrast: 1.25,
      saturate: 1.3,
      warmthHex: 'rgba(56, 189, 248, 0.05)',
    },

    audioMood: 'bold',
  }
};
