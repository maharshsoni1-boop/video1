/**
 * Video Rendering Engine for ReelKar
 * 1080x1920 30fps canvas compositor with Ken Burns motion, smart 9:16 blurred fitting,
 * procedural audio sync, MediaRecorder export, and real-time live preview.
 */

import { CONFIG } from './config.js';
import { PRESETS } from './presets.js';
import { telemetry } from './telemetry.js';

export class VideoRenderer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CONFIG.VIDEO.WIDTH;
    this.canvas.height = CONFIG.VIDEO.HEIGHT;
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });

    this.isRendering = false;
    this.abortController = null;
    this.particles = [];
  }

  /**
   * Check best supported MIME type for MediaRecorder
   */
  static getSupportedMimeType() {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    for (const mime of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return 'video/webm';
  }

  /**
   * Pre-render a blurred 1080x1920 background offscreen for each photo
   * This provides 60fps performance without calling heavy GPU blur every frame.
   */
  _createBlurredBackdrop(img) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 540;
    offCanvas.height = 960;
    const offCtx = offCanvas.getContext('2d');

    // Draw scaled image to fill
    const scale = Math.max(540 / img.naturalWidth, 960 / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const sx = (540 - sw) / 2;
    const sy = (960 - sh) / 2;

    offCtx.filter = 'blur(28px) brightness(0.55)';
    offCtx.drawImage(img, sx, sy, sw, sh);
    offCtx.filter = 'none';

    return offCanvas;
  }

  /**
   * Initialize particle system for Royal Gold & Festive styles
   */
  _initParticles(preset) {
    this.particles = [];
    if (!preset.particles.enabled) return;

    for (let i = 0; i < preset.particles.count; i++) {
      this.particles.push({
        x: Math.random() * CONFIG.VIDEO.WIDTH,
        y: Math.random() * CONFIG.VIDEO.HEIGHT,
        radius: Math.random() * 3.5 + 1.5,
        color: preset.particles.colors[Math.floor(Math.random() * preset.particles.colors.length)],
        vx: (Math.random() - 0.5) * preset.particles.speed,
        vy: -Math.random() * preset.particles.speed - 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Update and draw particles on the frame
   */
  _drawParticles(ctx, frameTime) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < -20) p.y = CONFIG.VIDEO.HEIGHT + 10;
      if (p.x < -20) p.x = CONFIG.VIDEO.WIDTH + 10;
      if (p.x > CONFIG.VIDEO.WIDTH + 20) p.x = -10;

      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(frameTime * 4 + p.twinklePhase));
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;

      // Draw star/diamond sparkle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle flare on larger particles
      if (p.radius > 3.0) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - p.radius * 2.5, p.y);
        ctx.lineTo(p.x + p.radius * 2.5, p.y);
        ctx.moveTo(p.x, p.y - p.radius * 2.5);
        ctx.lineTo(p.x, p.y + p.radius * 2.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Draw a single photo slide with Ken Burns motion, blurred backdrop, and safe framing
   */
  _drawPhotoSlide(ctx, photoItem, motionIndex, progress, preset) {
    const { img, backdrop } = photoItem;
    const W = CONFIG.VIDEO.WIDTH;
    const H = CONFIG.VIDEO.HEIGHT;

    // 1. Draw pre-rendered blurred background
    ctx.drawImage(backdrop, 0, 0, W, H);

    // 2. Subtle Dark Vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, preset.colors.vignetteColor);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // 3. Ken Burns Motion on foreground image
    ctx.save();
    const maxZoom = preset.motion.zoomAmount;
    let scale = 1.0;
    let panX = 0;
    let panY = 0;

    // Alternate motion paths per photo index
    switch (motionIndex % 4) {
      case 0: // Zoom In center
        scale = 1.0 + progress * maxZoom;
        break;
      case 1: // Zoom In drift left
        scale = 1.02 + progress * maxZoom;
        panX = -progress * 40;
        break;
      case 2: // Zoom Out drift right
        scale = 1.0 + maxZoom - progress * maxZoom;
        panX = (progress - 0.5) * 40;
        break;
      case 3: // Slow Pan Up
        scale = 1.03 + progress * (maxZoom * 0.8);
        panY = -progress * 45;
        break;
    }

    // Safe zone for foreground photo: 920px max width, 1260px max height
    const maxFgW = 900;
    const maxFgH = 1240;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let fgW = maxFgW;
    let fgH = fgW / imgRatio;

    if (fgH > maxFgH) {
      fgH = maxFgH;
      fgW = fgH * imgRatio;
    }

    const centerX = W / 2 + panX;
    const centerY = (H / 2 - 40) + panY;

    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Rounded card with luxury drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 25;

    // Subtle 1px gold/accent border around photo
    const radius = 24;
    ctx.beginPath();
    ctx.roundRect(-fgW / 2, -fgH / 2, fgW, fgH, radius);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Clip and draw sharp photo
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, -fgW / 2, -fgH / 2, fgW, fgH);
    ctx.restore();

    // Reset shadow & draw border
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = preset.colors.pillBorder;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw Intro Brand Lockup (0 to 2.2s)
   */
  _drawIntroLockup(ctx, time, shopName, categoryLabel, preset) {
    if (time > 2.2) return;
    const W = CONFIG.VIDEO.WIDTH;
    const alpha = time < 0.4 ? time / 0.4 : time > 1.8 ? (2.2 - time) / 0.4 : 1.0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Top Brand Plaque
    const boxY = 160;
    ctx.font = preset.typography.titleFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    // Shop Name
    ctx.fillStyle = preset.colors.accentGold;
    ctx.fillText((shopName || CONFIG.APP_NAME).toUpperCase(), W / 2, boxY);

    // Subtitle
    ctx.font = preset.typography.subtitleFont;
    ctx.fillStyle = preset.colors.primaryText;
    ctx.fillText(categoryLabel ? `${categoryLabel.toUpperCase()} COLLECTION` : 'EXCLUSIVE COLLECTION', W / 2, boxY + 60);

    // Gold expanding line
    const lineWidth = Math.min(360, (time / 0.8) * 360);
    ctx.strokeStyle = preset.colors.accentGold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - lineWidth / 2, boxY + 95);
    ctx.lineTo(W / 2 + lineWidth / 2, boxY + 95);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw Festival Celebration Badge (if active)
   */
  _drawFestivalBadge(ctx, festival, preset) {
    if (!festival || !festival.badge) return;
    const W = CONFIG.VIDEO.WIDTH;

    ctx.save();
    const pillW = 560;
    const pillH = 64;
    const pillX = (W - pillW) / 2;
    const pillY = 90;

    // Pill background
    ctx.fillStyle = 'rgba(30, 10, 18, 0.85)';
    ctx.strokeStyle = preset.colors.accentGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 32);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.font = "bold 26px 'Playfair Display', serif";
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(festival.badge, W / 2, pillY + pillH / 2);

    ctx.restore();
  }

  /**
   * Draw Photo Title & Price Tag Overlay
   */
  _drawPhotoOverlay(ctx, photo, slideProgress, preset) {
    const W = CONFIG.VIDEO.WIDTH;
    const H = CONFIG.VIDEO.HEIGHT;

    // Smooth ease-in for overlay
    const easeY = slideProgress < 0.25 
      ? Math.sin((slideProgress / 0.25) * (Math.PI / 2)) 
      : 1.0;
    const alpha = Math.min(1, slideProgress * 4);

    const titleText = photo.title || photo.name || photo.itemType || 'Exclusive Product';
    const priceText = photo.price ? `${photo.price}` : null;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Bottom banner position
    const cardY = H - 380 + (1 - easeY) * 50;
    const cardW = 900;
    const cardH = priceText ? 150 : 110;
    const cardX = (W - cardW) / 2;

    // Frosted glass pill background
    ctx.fillStyle = preset.colors.pillBg;
    ctx.strokeStyle = photo.dominantColor || preset.colors.pillBorder;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // Text Content
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left';

    // Title
    ctx.font = preset.typography.titleFont;
    ctx.fillStyle = preset.colors.primaryText;
    const truncatedTitle = titleText.length > 28 ? titleText.substring(0, 26) + '...' : titleText;
    ctx.fillText(truncatedTitle, cardX + 36, cardY + 54);

    // Price Pill / Tag (if available)
    if (priceText) {
      ctx.textAlign = 'right';
      ctx.font = preset.typography.priceFont;
      ctx.fillStyle = photo.dominantColor || preset.colors.accentGold;
      ctx.fillText(priceText, cardX + cardW - 36, cardY + 54);

      // Sub-caption hint
      ctx.textAlign = 'left';
      ctx.font = preset.typography.subtitleFont;
      ctx.fillStyle = preset.colors.accentSecondary;
      ctx.fillText(photo.itemType || 'Handcrafted In Pure 22K Gold', cardX + 36, cardY + 105);
    } else {
      ctx.font = preset.typography.subtitleFont;
      ctx.fillStyle = preset.colors.accentSecondary;
      ctx.fillText(photo.itemType || 'Pure Craftsmanship • Tap to Enquire', cardX + 36, cardY + 86);
    }

    ctx.restore();
  }

  /**
   * Draw Outro CTA Card (final 2.4s of video)
   */
  _drawOutroCard(ctx, timeRemaining, shopDetails, preset) {
    const W = CONFIG.VIDEO.WIDTH;
    const H = CONFIG.VIDEO.HEIGHT;
    const alpha = timeRemaining > 2.0 ? (2.4 - timeRemaining) / 0.4 : 1.0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Fullscreen dark luxury gradient backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(10, 10, 14, 0.94)');
    grad.addColorStop(0.5, 'rgba(16, 14, 22, 0.97)');
    grad.addColorStop(1, 'rgba(8, 8, 12, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Central Framing Card
    const cardW = 920;
    const cardH = 960;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    ctx.fillStyle = preset.colors.cardBg;
    ctx.strokeStyle = preset.colors.accentGold;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 32);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'center';

    // Store Name
    const storeName = shopDetails.shopName || CONFIG.APP_NAME;
    ctx.font = "bold 64px 'Playfair Display', serif";
    ctx.fillStyle = preset.colors.accentGold;
    ctx.fillText(storeName.toUpperCase(), W / 2, cardY + 160);

    // City / Location
    if (shopDetails.city) {
      ctx.font = "500 32px 'Inter', sans-serif";
      ctx.fillStyle = preset.colors.accentSecondary;
      ctx.fillText(`📍 ${shopDetails.city.toUpperCase()}`, W / 2, cardY + 225);
    }

    // Gold divider
    ctx.strokeStyle = preset.colors.pillBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 180, cardY + 280);
    ctx.lineTo(W / 2 + 180, cardY + 280);
    ctx.stroke();

    // Call to Action Headline
    ctx.font = "bold 44px 'Playfair Display', serif";
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Order / Enquire Today', W / 2, cardY + 370);

    ctx.font = "400 30px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Worldwide & Pan-India Shipping Available', W / 2, cardY + 430);

    // WhatsApp Action Pill Button
    const btnW = 760;
    const btnH = 110;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + 520;

    ctx.fillStyle = '#25D366'; // WhatsApp Green
    ctx.shadowColor = 'rgba(37, 211, 102, 0.4)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;

    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 55);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 38px 'Inter', sans-serif";
    const waText = shopDetails.whatsapp 
      ? `💬 WhatsApp: ${shopDetails.whatsapp}` 
      : '💬 Order on WhatsApp / DM';
    ctx.fillText(waText, W / 2, btnY + 70);

    // Bottom footer hint
    ctx.font = "500 26px 'Inter', sans-serif";
    ctx.fillStyle = preset.colors.accentSecondary;
    ctx.fillText('Send a screenshot of your favorite piece to buy', W / 2, cardY + 740);

    // ReelKar watermark subtly at the base
    ctx.font = "400 22px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`Created in 60s with ${CONFIG.APP_NAME}`, W / 2, cardY + 860);

    ctx.restore();
  }

  /**
   * Main Video Render Pipeline
   * @param {Object} options
   * @param {Array} options.photos - list of photo objects with img & metadata
   * @param {string} options.presetId - royal-gold | festive | minimal-luxe | bold-reel
   * @param {Object} options.shopDetails - { shopName, city, whatsapp, category, festival }
   * @param {HTMLCanvasElement} [options.previewCanvas] - live miniature preview element
   * @param {Function} [options.onProgress] - ({ stage, percent, frame, totalFrames }) => void
   * @returns {Promise<{ blob: Blob, url: string, mimeType: string, durationSec: number, sizeBytes: number }>}
   */
  async renderVideo({ photos, presetId = 'royal-gold', shopDetails = {}, previewCanvas = null, onProgress = null }) {
    if (this.isRendering) throw new Error('A render is already in progress');
    this.isRendering = true;

    telemetry.reset();
    telemetry.startTimer('render');
    telemetry.update('status', 'rendering');

    const preset = PRESETS[presetId] || PRESETS['royal-gold'];
    const slideDuration = preset.motion.slideDuration || CONFIG.VIDEO.SLIDE_DURATION_SEC;
    const outroDuration = CONFIG.VIDEO.OUTRO_DURATION_SEC;
    const transitionDuration = preset.motion.transitionDuration || CONFIG.VIDEO.TRANSITION_DURATION_SEC;

    const totalDurationSec = photos.length * slideDuration + outroDuration;
    const fps = CONFIG.VIDEO.FPS;
    const totalFrames = Math.ceil(totalDurationSec * fps);

    const rawBytes = photos.reduce((acc, p) => acc + (p.file ? p.file.size : (p.sizeBytes || 45000) * 2.8), 0);
    const downscaledBytes = photos.reduce((acc, p) => acc + (p.sizeBytes || 42000), 0);

    telemetry.updateMultiple({
      fps,
      targetResolution: `${CONFIG.VIDEO.WIDTH}x${CONFIG.VIDEO.HEIGHT}`,
      imageCount: photos.length,
      rawInputBytes: Math.round(rawBytes),
      downscaledBytes: Math.round(downscaledBytes),
      aiModel: shopDetails.isOfflineMode ? 'Deterministic Fallback' : 'Gemini 3.8 Flash',
      isOfflineMode: !!shopDetails.isOfflineMode
    });

    // 1. Prepare blurred backdrops
    onProgress?.({ stage: 'Preparing visual frames', percent: 5, frame: 0, totalFrames });
    const preparedPhotos = photos.map(p => ({
      ...p,
      backdrop: this._createBlurredBackdrop(p.img)
    }));

    // 2. Initialize particles
    this._initParticles(preset);

    // 3. Audio track setup & MediaRecorder
    this.audioEngine.play(preset.audioMood, totalDurationSec);
    const audioTrack = this.audioEngine.getAudioTrack();

    const canvasStream = this.canvas.captureStream(fps);
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
      telemetry.update('audioTracks', 1);
    }

    const mimeType = VideoRenderer.getSupportedMimeType();
    telemetry.update('encoderMimeType', mimeType);

    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps high-quality 1080p
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const recordPromise = new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, mimeType, sizeBytes: blob.size });
      };
      mediaRecorder.onerror = (err) => reject(err);
    });

    mediaRecorder.start(250); // gather 250ms chunks

    // 4. Render loop across totalFrames
    const ctx = this.ctx;
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        const timeSec = frame / fps;
        const outroStartTime = photos.length * slideDuration;

        ctx.clearRect(0, 0, CONFIG.VIDEO.WIDTH, CONFIG.VIDEO.HEIGHT);

        if (timeSec >= outroStartTime) {
          // --- Outro Phase ---
          const timeInOutro = timeSec - outroStartTime;
          this._drawOutroCard(ctx, outroDuration - timeInOutro, shopDetails, preset);
          this._drawParticles(ctx, timeSec);
        } else {
          // --- Photo Slides Phase ---
          const photoIndex = Math.floor(timeSec / slideDuration);
          const slideTime = timeSec % slideDuration;
          const slideProgress = slideTime / slideDuration;

          const currentPhoto = preparedPhotos[photoIndex];
          const nextPhoto = preparedPhotos[(photoIndex + 1) % preparedPhotos.length];

          // Check if we are in transition window at the end of slide
          const inTransition = slideTime > (slideDuration - transitionDuration) && photoIndex < preparedPhotos.length - 1;
          const transitionProgress = inTransition 
            ? (slideTime - (slideDuration - transitionDuration)) / transitionDuration
            : 0;

          if (inTransition && preset.motion.transitionType === 'slide') {
            // Slide transition: slide current left, incoming from right
            ctx.save();
            ctx.translate(-transitionProgress * CONFIG.VIDEO.WIDTH, 0);
            this._drawPhotoSlide(ctx, currentPhoto, photoIndex, slideProgress, preset);
            ctx.restore();

            ctx.save();
            ctx.translate((1 - transitionProgress) * CONFIG.VIDEO.WIDTH, 0);
            this._drawPhotoSlide(ctx, nextPhoto, photoIndex + 1, 0, preset);
            ctx.restore();
          } else if (inTransition && preset.motion.transitionType === 'whip') {
            // Whip cut transition
            const blurOffset = Math.sin(transitionProgress * Math.PI) * 120;
            ctx.save();
            ctx.translate(-transitionProgress * CONFIG.VIDEO.WIDTH - blurOffset, 0);
            this._drawPhotoSlide(ctx, currentPhoto, photoIndex, slideProgress, preset);
            ctx.restore();

            ctx.save();
            ctx.translate((1 - transitionProgress) * CONFIG.VIDEO.WIDTH + blurOffset, 0);
            this._drawPhotoSlide(ctx, nextPhoto, photoIndex + 1, 0, preset);
            ctx.restore();
          } else if (inTransition) {
            // Default crossfade / zoom-through
            this._drawPhotoSlide(ctx, currentPhoto, photoIndex, slideProgress, preset);
            ctx.save();
            ctx.globalAlpha = transitionProgress;
            this._drawPhotoSlide(ctx, nextPhoto, photoIndex + 1, 0, preset);
            ctx.restore();
          } else {
            // Standard single slide draw
            this._drawPhotoSlide(ctx, currentPhoto, photoIndex, slideProgress, preset);
          }

          // Dynamic Overlays
          this._drawParticles(ctx, timeSec);
          this._drawIntroLockup(ctx, timeSec, shopDetails.shopName, shopDetails.category, preset);
          this._drawFestivalBadge(ctx, shopDetails.festival, preset);
          this._drawPhotoOverlay(ctx, currentPhoto, slideProgress, preset);
        }

        // Live preview mirror on preview canvas
        if (previewCtx && frame % 2 === 0) {
          previewCtx.drawImage(this.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        }

        // Telemetry & progress update
        const percent = Math.min(98, Math.round((frame / totalFrames) * 95) + 5);
        if (frame % 15 === 0 || frame === totalFrames - 1) {
          telemetry.update('totalFramesRendered', frame + 1);
          onProgress?.({
            stage: timeSec >= outroStartTime ? 'Rendering final CTA card' : `Rendering slide ${Math.min(photos.length, Math.floor(timeSec / slideDuration) + 1)} of ${photos.length}`,
            percent,
            frame: frame + 1,
            totalFrames
          });
          // Yield to browser event loop
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // Finalize recording
      mediaRecorder.stop();
      this.audioEngine.stop();

      const result = await recordPromise;
      const renderDurationMs = telemetry.stopTimer('render');

      telemetry.updateMultiple({
        renderDurationMs,
        outputSizeBytes: result.sizeBytes,
        status: 'complete'
      });

      onProgress?.({ stage: 'Reel ready to post!', percent: 100, frame: totalFrames, totalFrames });
      this.isRendering = false;

      return {
        ...result,
        durationSec: totalDurationSec,
        renderDurationMs
      };
    } catch (err) {
      this.isRendering = false;
      this.audioEngine.stop();
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      throw err;
    }
  }
}
