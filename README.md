# ReelKar 🎬

> **Upload 5 photos. Get a reel ready to post in under 60 seconds.**

ReelKar is a production-grade prototype web application built for small business owners in India (jewellers, saree boutiques, bakeries, salons). It turns raw product photos into a ready-to-post, vertical 9:16 Instagram Reel with cinematic motion, custom-tailored procedural background music, AI-written captions in Indian languages, and WhatsApp call-to-action cards.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ReelKar Architecture                            │
├────────────────────────────────────────────────────────────────────────┤
│ Frontend (Zero Frameworks, Plain HTML5 / CSS3 / ES Modules)            │
│                                                                        │
│  [ Upload Dropzone ] ──> [ Browser Image Resizer ]                     │
│                                │ (Max 768px, JPEG 0.7, <350KB total)   │
│                                ▼                                       │
│  [ Multilingual Studio ] ──> [ /api/analyze.js (Vercel Serverless) ]   │
│  (Shop, City, WhatsApp,        │ ├── Google Gemini 2.5 Flash           │
│   Presets, Language)           │ └── Deterministic Fallback Engine     │
│                                ▼                                       │
│  [ Real-time Pipeline Telemetry & Style Compositor ]                   │
│                                │                                       │
│    ┌───────────────────────────┴───────────────────────────┐           │
│    ▼                                                       ▼           │
│  [ Video Engine (Canvas 1080x1920) ]       [ Web Audio Synth Engine ]  │
│   - Smart 9:16 Blurred Backdrop             - Procedural Tabla / Pad   │
│   - Ken Burns Pan & Zoom                    - Keyed to Preset Mood     │
│   - Sparkle Particle Overlay                - Zero External MP3s       │
│   - Intro Lockup + Outro CTA Card           - MediaStreamTrack Sync    │
│    └───────────────────────────┬───────────────────────────┘           │
│                                ▼                                       │
│  [ MediaRecorder Stream Compositor ] ──> [ MP4 / WebM Output ]         │
│  [ Web Share API / 1-Click Download / Multilingual Caption Copy ]       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

1. **Instant Client-Side Video Rendering**:
   - Renders 1080x1920 @ 30fps directly inside the browser using canvas and `MediaRecorder`.
   - Never uploads your full video to a slow server queue; renders locally in 5-10 seconds.
   - Smart 9:16 aspect ratio fit: blurred background with a centered, crisp product photo.
   - Ken Burns movement, crossfades, whip cuts, zoom-throughs, and particle effects.

2. **Procedural Royalty-Free Audio (Web Audio API)**:
   - Synthesizes 4 original audio moods directly in code (no audio hosting, no copyright strikes):
     - **Royal Gold**: Ambient deep sub-pad with singing bowl harmonic chimes.
     - **Festive**: Traditional synthesized Indian percussion (tabla/dholak rhythm) with tanpura drone.
     - **Minimal Luxe**: Soft electric piano pulses with airy atmospheric reverb.
     - **Bold Reel**: Punchy 808 kick, crisp snare, and modern synthwave bassline.

3. **Multimodal AI with Deterministic Fallback**:
   - Uses **Google Gemini 2.5 Flash** to identify items, pick the highest-converting hook photo, extract dominant colors for brand styling, and write captions in **English, Hindi (हिंदी), Gujarati (ગુજરાતી), and Hinglish**.
   - **Zero-Failure Guarantee**: If API key is missing or network times out, ReelKar seamlessly falls back to a deterministic offline template engine. The app never crashes.

4. **Designed for Indian Mobile Commerce**:
   - Outro card with WhatsApp number CTA ("Order on WhatsApp: +91...").
   - 1-tap Festival Mode for Diwali, Dhanteras, Wedding Season, and Akshaya Tritiya.
   - "Under the Hood" telemetry panel showing image sizes, API latency, frame count, and render times.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (tested on Node v22)
- A Google Gemini API Key ([Get one for free at Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Configure
```bash
git clone <repo-url>
cd reelkar
cp .env.example .env.local
```
Add your key inside `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Run Locally
You can run ReelKar locally using the built-in development server (no external dependencies required):
```bash
npm run dev
# Server starts at http://localhost:3000
```

Alternatively, if you have the Vercel CLI installed:
```bash
npx vercel dev
```

---

## ☁️ Deploy to Vercel (1-Click)

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. In the **Environment Variables** section, add:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GEMINI_MODEL`: `gemini-2.5-flash` (optional, defaults to `gemini-2.5-flash`).
   - `FEEDBACK_WEBHOOK_URL`: (optional) Webhook URL to receive feedback submissions.
4. Click **Deploy**. Vercel will automatically configure the static site and the serverless functions in `/api`.

---

## ⚙️ Configuration & Renaming

ReelKar is built to be customized or white-labeled in a single file: [`js/config.js`](file:///d:/Tirth%20project/js/config.js).
You can change:
- `APP_NAME`: Change from "ReelKar" to any custom brand name.
- `TAGLINE`: Marketing headline.
- `STYLE_PRESETS`: Custom colors, typography, transitions, and particle settings.
- `FESTIVALS`: Seasonal celebration presets.
- `LANGUAGES`: Supported caption output languages.

---

## 📱 Browser Compatibility & Limitations

- **Chrome (Desktop & Android)**: Full support for high-fps Canvas recording and Web Audio.
- **Safari (iOS 14.8+ & macOS)**: Supported via native `video/mp4` MediaRecorder.
- **Firefox**: Supported via `video/webm`.
- **Note on WhatsApp/Instagram direct share**: Mobile browsers that support the Web Share API (Level 2) can share the video file directly into Instagram/WhatsApp. Desktop and older mobile browsers gracefully fall back to direct file download.
