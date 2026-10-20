# ReelKar - Project Plan & Architecture

## Overview
ReelKar is an instant Instagram Reel generator built specifically for Indian small business owners (jewellery shops, saree boutiques, bakeries, salons). It turns 3 to 8 photos into a high-converting, vertical 9:16 video in under a minute with zero editing skill.

## Core Architecture

```
ReelKar Client (Browser, No Build Step)
├── index.html               # Semantic, mobile-first responsive layout
├── css/
│   ├── main.css            # Dark luxury design system, typography & variables
│   ├── landing.css         # Hero, dropzone, before-after interactive strip
│   ├── studio.css          # Photo tray, style picker, festival mode, quick details
│   └── player.css          # 9:16 video player, telemetry drawer, feedback modal
├── js/
│   ├── config.js           # Single config file for brand name, presets, defaults
│   ├── imageTools.js       # Client downscaling (<768px, 0.7 JPEG), EXIF, colors
│   ├── presets.js          # Royal Gold, Festive, Minimal Luxe, Bold Reel configs
│   ├── audio.js            # Procedural Web Audio API synth (4 cultural/modern styles)
│   ├── renderer.js         # 1080x1920 30fps canvas compositor + MediaRecorder
│   ├── telemetry.js        # Pipeline instrumentation & performance timing
│   ├── api.js              # Resilient API client with offline fallback handling
│   └── ui.js               # Reactive DOM controller, touch reordering, Web Share
└── assets/
    ├── icons/              # Clean SVG icons (zero emojis in UI)
    └── demo/               # 5 royalty-free sample Indian jewellery photos

Backend (Vercel Serverless Functions in /api)
├── api/analyze.js          # Multimodal Gemini 2.5 Flash analyzer + offline fallback
└── api/feedback.js         # User feedback collector & optional webhook forwarder
```

## Data & Video Pipeline
1. **User input**: 3-8 photos uploaded or "Try with sample photos".
2. **Client Compression**: Downscaled in browser to max 768px (JPEG 0.7) to stay well under Vercel's 4.5MB request limit.
3. **AI Analysis (`/api/analyze.js`)**:
   - Sends downscaled base64 images to Gemini 2.5 Flash.
   - Extracts: Hook photo + rationale, titles, item types, dominant colors, multilingual caption (EN, Hindi, Gujarati, Hinglish), and 12 hashtags.
   - **Deterministic Fallback**: If offline or API fails, uses smart templates without breaking.
4. **Procedural Sound Design (`js/audio.js`)**:
   - Web Audio API synthesizes custom multi-track audio synced to preset mood (e.g. Indian tabla/dholak beat for Festive, deep luxury pad for Royal Gold).
   - Audio stream routed into canvas recording destination.
5. **Video Rendering (`js/renderer.js`)**:
   - 1080x1920 canvas @ 30fps with smart blurred background fitting.
   - Ken Burns movement, style transitions, particle overlays, intro lockup & outro CTA.
   - Recorded into MP4 / WebM with real-time telemetry metrics.
6. **Result**: In-browser preview, instant download, Web Share API, and 1-click caption copy.
