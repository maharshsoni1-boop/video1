/**
 * AI Suite (aisuite.run) Controller
 * Multi-Angle Studio, AI Background Pedestal, Kinetic Image-to-Video Motion,
 * and Viral Reel Storyboard / Shot-List Planner for ReelKar.
 */

import { CONFIG } from './config.js';
import { loadImage, downscaleImage, extractDominantColor } from './imageTools.js';
import { ProceduralAudioEngine } from './audio.js';

// State for AI Suite
export const suiteState = {
  activeTool: 'multi-angle',
  currentSourceImage: null, // HTMLImageElement
  currentSourceDataUrl: null,
  isProcessing: false,
  multiAnglesResults: [],
  selectedStudioBackdrop: 'obsidian-gold',
  selectedMotionStyle: 'turntable',
  motionPlaying: false,
  motionAnimId: null,
  storyboard: null
};

// Singleton procedural audio engine instance for audio tool preview
let suiteAudioEngine = null;

/**
 * Initialize AI Suite Workspace
 */
export function initAISuite() {
  initWorkspaceTabs();
  initToolNavigation();
  initMultiAngleTool();
  initStudioBackdropTool();
  initImageToVideoTool();
  initStoryPlannerTool();
  initAudioStudioTool();

  // Load default demo product for immediate zero-friction exploration
  loadDefaultSuitePhoto('assets/demo/demo-1.jpg', 'Royal Kundan Choker');
}

/**
 * Tab switching between "Reel Studio" and "AI Suite"
 */
function initWorkspaceTabs() {
  const reelTabBtn = document.getElementById('tabReelStudio');
  const suiteTabBtn = document.getElementById('tabAISuite');
  const reelMakerView = document.getElementById('reelMakerView');
  const aiSuiteView = document.getElementById('aiSuiteSection');

  if (!reelTabBtn || !suiteTabBtn || !reelMakerView || !aiSuiteView) return;

  reelTabBtn.addEventListener('click', () => {
    switchWorkspace('reel');
  });

  suiteTabBtn.addEventListener('click', () => {
    switchWorkspace('suite');
  });
}

export function switchWorkspace(target) {
  const reelTabBtn = document.getElementById('tabReelStudio');
  const suiteTabBtn = document.getElementById('tabAISuite');
  const reelMakerView = document.getElementById('reelMakerView');
  const aiSuiteView = document.getElementById('aiSuiteSection');

  if (target === 'reel') {
    reelTabBtn.classList.add('active');
    suiteTabBtn.classList.remove('active');
    reelMakerView.style.display = 'block';
    aiSuiteView.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    suiteTabBtn.classList.add('active');
    reelTabBtn.classList.remove('active');
    reelMakerView.style.display = 'none';
    aiSuiteView.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // If motion canvas was running, resume it
    if (suiteState.activeTool === 'image-to-video' && suiteState.currentSourceImage) {
      startMotionLoop();
    }
  }
}

/**
 * Tool navigation inside AI Suite (Multi-Angle, Background, Motion, Story, Audio)
 */
function initToolNavigation() {
  const toolTabs = document.querySelectorAll('.tool-tab-card');
  const panels = document.querySelectorAll('.tool-panel');

  toolTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const toolId = tab.getAttribute('data-tool');
      suiteState.activeTool = toolId;

      toolTabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(`panel-${toolId}`);
      if (targetPanel) targetPanel.classList.add('active');

      // Tool specific actions on activation
      if (toolId === 'image-to-video' && suiteState.currentSourceImage) {
        startMotionLoop();
      } else {
        stopMotionLoop();
      }
    });
  });
}

/**
 * Load default sample photo for initial state
 */
async function loadDefaultSuitePhoto(src, title) {
  try {
    const img = await loadImage(src);
    setSuiteSourceImage(img, src, title || 'Sample Indian Jewellery');
  } catch (e) {
    console.warn('Could not load default suite photo:', e);
  }
}

function setSuiteSourceImage(img, dataUrl, title) {
  suiteState.currentSourceImage = img;
  suiteState.currentSourceDataUrl = dataUrl;

  // Update preview thumbnails in all tools
  const previews = document.querySelectorAll('.suite-source-preview');
  previews.forEach(p => {
    p.src = dataUrl;
  });

  // Render initial backdrop canvas
  renderStudioBackdrop();

  // Reset or run motion preview
  if (suiteState.activeTool === 'image-to-video') {
    startMotionLoop();
  }
}

// ============================================================================
// 1. MULTI-ANGLE STUDIO (5 Distinct Camera Perspectives from 1 Photo)
// ============================================================================
function initMultiAngleTool() {
  const generateBtn = document.getElementById('suiteGenerateAnglesBtn');
  const sendToReelBtn = document.getElementById('sendAnglesToReelBtn');
  const fileInput = document.getElementById('suiteAngleFileInput');
  const dropzone = document.getElementById('suiteAngleDropzone');
  const sampleThumbs = document.querySelectorAll('#panel-multi-angle .suite-sample-thumb');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const img = await loadImage(file);
        const downscaled = await downscaleImage(img);
        setSuiteSourceImage(img, downscaled.dataUrl, file.name.replace(/\.[^/.]+$/, ''));
      }
    });
  }

  // Sample thumbs click
  sampleThumbs.forEach(thumb => {
    thumb.addEventListener('click', async () => {
      sampleThumbs.forEach(t => t.classList.remove('selected'));
      thumb.classList.add('selected');
      const src = thumb.getAttribute('data-src');
      const name = thumb.getAttribute('data-name');
      const img = await loadImage(src);
      setSuiteSourceImage(img, src, name);
    });
  });

  if (generateBtn) {
    generateBtn.addEventListener('click', generateAllAngles);
  }

  if (sendToReelBtn) {
    sendToReelBtn.addEventListener('click', pushAnglesToReelMaker);
  }
}

/**
 * Generate 5 Distinct Commercial Camera Angles
 */
async function generateAllAngles() {
  if (!suiteState.currentSourceImage) {
    window.showToast?.('Please upload or select a product photo first.', 'warning');
    return;
  }

  suiteState.isProcessing = true;
  const generateBtn = document.getElementById('suiteGenerateAnglesBtn');
  const progressBar = document.getElementById('suiteQueueFill');
  const queueStatus = document.getElementById('suiteQueueStatus');
  const gallery = document.getElementById('suiteAnglesGallery');
  const actionBanner = document.getElementById('anglesActionBanner');

  if (generateBtn) generateBtn.disabled = true;
  if (queueStatus) queueStatus.textContent = 'Synthesizing camera matrices & commercial perspectives...';
  if (progressBar) progressBar.style.width = '10%';

  const anglesDef = [
    {
      id: 'macro-closeup',
      title: '1. Intimate Macro / Close-Up',
      angleTag: 'MACRO 1.8X',
      desc: 'High-detail zoom focusing on craftsmanship, gems, and surface texture.',
      renderFn: renderMacroAngle
    },
    {
      id: 'low-angle-hero',
      title: '2. Low-Angle Hero Shot',
      angleTag: 'HERO PERSPECTIVE',
      desc: 'Dramatic bottom-up elevation with gold rim lighting and deep contrast.',
      renderFn: renderHeroAngle
    },
    {
      id: 'overhead-flatlay',
      title: '3. Directly Overhead / Flat-Lay',
      angleTag: '90° FLAT-LAY',
      desc: 'Editorial top-down view with soft 360° contact shadow diffusion.',
      renderFn: renderOverheadAngle
    },
    {
      id: 'profile-showroom',
      title: '4. 45° Showroom Profile',
      angleTag: '45° SHOWROOM',
      desc: 'Classic commercial jewellery display angle with directional specular sparkle.',
      renderFn: renderProfileAngle
    },
    {
      id: 'lifestyle-wide',
      title: '5. Establishing Luxury Showcase',
      angleTag: 'WIDE BOKEH',
      desc: 'Framed wide view with subtle golden bokeh background and lens glow.',
      renderFn: renderWideAngle
    }
  ];

  const results = [];
  gallery.innerHTML = '';

  for (let i = 0; i < anglesDef.length; i++) {
    const def = anglesDef[i];
    if (queueStatus) queueStatus.textContent = `Rendering angle ${i + 1}/5: ${def.title}...`;
    if (progressBar) progressBar.style.width = `${((i + 1) / anglesDef.length) * 90}%`;

    // Slight async tick for smooth UI updates
    await new Promise(r => setTimeout(r, 220));

    const angleDataUrl = def.renderFn(suiteState.currentSourceImage);
    const color = await extractDominantColor(suiteState.currentSourceImage);

    results.push({
      id: 'angle_' + def.id + '_' + Date.now(),
      title: def.title.split('. ')[1] || def.title,
      tag: def.angleTag,
      desc: def.desc,
      dataUrl: angleDataUrl,
      base64: angleDataUrl.split(',')[1],
      price: '',
      itemType: def.angleTag,
      dominantColor: color.hex
    });

    // Create and append angle card
    const card = createAngleCard(results[results.length - 1], i);
    gallery.appendChild(card);
  }

  suiteState.multiAnglesResults = results;
  suiteState.isProcessing = false;
  if (generateBtn) generateBtn.disabled = false;
  if (progressBar) progressBar.style.width = '100%';
  if (queueStatus) queueStatus.textContent = '✅ All 5 camera angles generated and ready!';
  if (actionBanner) actionBanner.style.display = 'flex';

  window.showToast?.('5 studio angles generated! Ready to create Reel or download.', 'success');
}

function createAngleCard(angle, index) {
  const card = document.createElement('div');
  card.className = 'angle-card';

  card.innerHTML = `
    <div class="angle-canvas-wrap">
      <img src="${angle.dataUrl}" alt="${angle.title}" />
      <span class="angle-card-badge">${angle.tag}</span>
    </div>
    <div class="angle-card-info">
      <div class="angle-card-title">${angle.title}</div>
      <div class="angle-card-desc">${angle.desc}</div>
      <div class="angle-card-actions">
        <button class="btn btn-secondary btn-sm" style="flex: 1;" type="button" data-action="single-add">
          + Add to Reel
        </button>
        <button class="btn btn-outline-gold btn-sm" type="button" data-action="download" title="Download HD Angle">
          ⬇
        </button>
      </div>
    </div>
  `;

  // Action listeners
  card.querySelector('[data-action="single-add"]').addEventListener('click', () => {
    addSingleAngleToReel(angle);
  });

  card.querySelector('[data-action="download"]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = angle.dataUrl;
    a.download = `reelkar-${angle.tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`;
    a.click();
    window.showToast?.(`Downloaded ${angle.title}`, 'success');
  });

  return card;
}

/**
 * Push all 5 generated angles directly into ReelKar's photo tray & switch to Studio
 */
async function pushAnglesToReelMaker() {
  if (suiteState.multiAnglesResults.length === 0) {
    window.showToast?.('No angles generated yet. Click "Generate 5 Camera Angles" first.', 'warning');
    return;
  }

  const photosForStudio = [];
  for (let i = 0; i < suiteState.multiAnglesResults.length; i++) {
    const item = suiteState.multiAnglesResults[i];
    const img = await loadImage(item.dataUrl);
    photosForStudio.push({
      id: item.id,
      file: null,
      img,
      dataUrl: item.dataUrl,
      base64: item.base64,
      sizeBytes: Math.round(item.dataUrl.length * 0.75),
      title: item.title,
      price: '',
      itemType: item.tag,
      dominantColor: item.dominantColor
    });
  }

  if (window.reelkarLoadGeneratedPhotos) {
    window.reelkarLoadGeneratedPhotos(photosForStudio);
    switchWorkspace('reel');
    window.showToast?.('All 5 studio angles loaded into Reel Maker! Customize and render your reel.', 'success');
  } else {
    window.showToast?.('Reel Maker interface not linked.', 'error');
  }
}

function addSingleAngleToReel(angle) {
  loadImage(angle.dataUrl).then(img => {
    const singlePhoto = {
      id: angle.id,
      file: null,
      img,
      dataUrl: angle.dataUrl,
      base64: angle.base64,
      sizeBytes: Math.round(angle.dataUrl.length * 0.75),
      title: angle.title,
      price: '',
      itemType: angle.tag,
      dominantColor: angle.dominantColor
    };

    if (window.reelkarAppendPhoto) {
      window.reelkarAppendPhoto(singlePhoto);
      window.showToast?.(`Added "${angle.title}" to Reel Tray!`, 'success');
    }
  });
}

// -------------------------------------------------------------
// Canvas Perspective Transforms for 5 Angles
// -------------------------------------------------------------

function createCanvas(width = 800, height = 1000) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Angle 1: Macro Close-up (1.8x zoom + radial edge blur + contrast + micro-sparkle)
function renderMacroAngle(img) {
  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Background dark vignette
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, w, h);

  // Zoomed in 1.8x center crop
  const zoom = 1.8;
  const cropW = img.width / zoom;
  const cropH = img.height / zoom;
  const cropX = (img.width - cropW) / 2;
  const cropY = (img.height - cropH) / 2;

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, w, h);

  // Radial blur vignette on edges to simulate macro lens depth-of-field
  const radGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
  radGrad.addColorStop(0, 'rgba(0,0,0,0)');
  radGrad.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  radGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, w, h);

  // High contrast & saturation boost overlay
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // 2 Micro-sparkles on highlights
  drawGlint(ctx, w * 0.42, h * 0.38, 16, '#fff9d6');
  drawGlint(ctx, w * 0.62, h * 0.46, 22, '#ffffff');

  return canvas.toDataURL('image/jpeg', 0.9);
}

// Angle 2: Low-Angle Hero Shot (Perspective distortion + dramatic gold rim lighting)
function renderHeroAngle(img) {
  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Dark dramatic luxury backdrop with bottom pedestal shadow
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#10121a');
  bgGrad.addColorStop(0.6, '#08090d');
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Draw subject with subtle upward vertical shift and pedestal grounding
  const scale = Math.min((w * 0.9) / img.width, (h * 0.75) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = h * 0.18;

  // Contact shadow on faux pedestal
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, dy + dh - 10, dw * 0.45, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 35;
  ctx.fill();
  ctx.restore();

  // Draw image
  ctx.drawImage(img, dx, dy, dw, dh);

  // Dramatic top-right gold rim light
  const rimGrad = ctx.createRadialGradient(w * 0.85, h * 0.15, 20, w * 0.85, h * 0.15, w * 0.8);
  rimGrad.addColorStop(0, 'rgba(255, 215, 100, 0.35)');
  rimGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.12)');
  rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.9);
}

// Angle 3: Directly Overhead / Flat-Lay (Top-down 90° view, soft 360° shadow)
function renderOverheadAngle(img) {
  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Luxury matte slate background
  ctx.fillStyle = '#111319';
  ctx.fillRect(0, 0, w, h);

  // Subtle linen / slate grid lines for editorial look
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw centered top-down subject with 360° diffused drop shadow
  const scale = Math.min((w * 0.8) / img.width, (h * 0.7) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  // 360 soft drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 45;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 15;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // Clean uniform top-down lighting
  const topLight = ctx.createLinearGradient(0, 0, 0, h);
  topLight.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  topLight.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = topLight;
  ctx.fillRect(0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.9);
}

// Angle 4: 45° Showroom Profile (Perspective skew, angled shadow, specular sparkle)
function renderProfileAngle(img) {
  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Deep luxury charcoal background
  ctx.fillStyle = '#0d0e14';
  ctx.fillRect(0, 0, w, h);

  // Subtle showroom spotlight cone from top left
  const spotGrad = ctx.createRadialGradient(w * 0.2, 0, 30, w * 0.45, h * 0.5, w * 0.85);
  spotGrad.addColorStop(0, 'rgba(255, 240, 200, 0.22)');
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, w, h);

  // 45 degree display tilt transform
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.06); // ~3.5 deg elegant slant
  ctx.scale(0.96, 0.92);

  const scale = Math.min((w * 0.82) / img.width, (h * 0.72) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  // Angled contact shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 25;
  ctx.shadowOffsetY = 30;

  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  // Specular sparkle on angle highlight
  drawGlint(ctx, w * 0.55, h * 0.35, 24, '#ffffff');

  return canvas.toDataURL('image/jpeg', 0.9);
}

// Angle 5: Establishing Wide Showcase (Expanded luxury bokeh & warm ambient glow)
function renderWideAngle(img) {
  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Deep luxury background with warm bokeh discs
  ctx.fillStyle = '#0a0b10';
  ctx.fillRect(0, 0, w, h);

  // Draw warm ambient bokeh orbs in background
  const orbs = [
    { x: w * 0.2, y: h * 0.2, r: 90, color: 'rgba(212, 175, 55, 0.12)' },
    { x: w * 0.8, y: h * 0.3, r: 120, color: 'rgba(245, 158, 11, 0.08)' },
    { x: w * 0.3, y: h * 0.75, r: 100, color: 'rgba(212, 175, 55, 0.09)' },
    { x: w * 0.85, y: h * 0.8, r: 140, color: 'rgba(56, 189, 248, 0.06)' }
  ];
  orbs.forEach(orb => {
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    g.addColorStop(0, orb.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Centered slightly wider shot (scale 0.75)
  const scale = Math.min((w * 0.72) / img.width, (h * 0.62) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  // Deep grounding shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, dy + dh - 10, dw * 0.42, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, dx, dy, dw, dh);

  // Soft overall gold lens glow
  const lensGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
  lensGrad.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
  lensGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = lensGrad;
  ctx.fillRect(0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.9);
}

function drawGlint(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  // 4-point star glint
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(0, 0, size, 0);
  ctx.quadraticCurveTo(0, 0, 0, size);
  ctx.quadraticCurveTo(0, 0, -size, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size);
  ctx.fill();

  // Center bright dot
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

// ============================================================================
// 2. STUDIO BACKGROUND PEDESTAL TOOL
// ============================================================================
function initStudioBackdropTool() {
  const backdropChips = document.querySelectorAll('#panel-bg-studio .suite-preset-chip');
  const addBackdropBtn = document.getElementById('suiteAddBackdropBtn');
  const downloadBackdropBtn = document.getElementById('suiteDownloadBackdropBtn');

  backdropChips.forEach(chip => {
    chip.addEventListener('click', () => {
      backdropChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      suiteState.selectedStudioBackdrop = chip.getAttribute('data-backdrop');
      renderStudioBackdrop();
    });
  });

  if (addBackdropBtn) {
    addBackdropBtn.addEventListener('click', () => {
      const canvas = document.getElementById('suiteBackdropCanvas');
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      loadImage(dataUrl).then(img => {
        if (window.reelkarAppendPhoto) {
          window.reelkarAppendPhoto({
            id: 'photo_backdrop_' + Date.now(),
            file: null,
            img,
            dataUrl,
            base64: dataUrl.split(',')[1],
            sizeBytes: Math.round(dataUrl.length * 0.75),
            title: 'Studio Pedestal Shot',
            price: '',
            itemType: 'Studio Pedestal',
            dominantColor: '#d4af37'
          });
          window.showToast?.('Added Studio Pedestal shot to Reel Tray!', 'success');
        }
      });
    });
  }

  if (downloadBackdropBtn) {
    downloadBackdropBtn.addEventListener('click', () => {
      const canvas = document.getElementById('suiteBackdropCanvas');
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.92);
      a.download = `reelkar-studio-pedestal-${suiteState.selectedStudioBackdrop}.jpg`;
      a.click();
      window.showToast?.('Studio shot downloaded!', 'success');
    });
  }
}

function renderStudioBackdrop() {
  const canvas = document.getElementById('suiteBackdropCanvas');
  if (!canvas || !suiteState.currentSourceImage) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const img = suiteState.currentSourceImage;

  ctx.clearRect(0, 0, w, h);

  // Draw backdrop by theme
  const theme = suiteState.selectedStudioBackdrop;

  if (theme === 'obsidian-gold') {
    // 1. Royal Black Obsidian with Gold Rim
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#10131d');
    bg.addColorStop(0.65, '#090a0f');
    bg.addColorStop(1, '#020305');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Golden ambient pedestal base
    const pedGrad = ctx.createRadialGradient(w / 2, h * 0.78, 10, w / 2, h * 0.78, w * 0.45);
    pedGrad.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
    pedGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.15)');
    pedGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = pedGrad;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

  } else if (theme === 'marble-silk') {
    // 2. White Carrera Marble with Champagne Silk
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#e5e7eb');
    bg.addColorStop(0.6, '#f3f4f6');
    bg.addColorStop(1, '#d1d5db');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Marble vein lines
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, 0);
    ctx.bezierCurveTo(w * 0.4, h * 0.3, w * 0.2, h * 0.7, w * 0.7, h);
    ctx.stroke();

  } else if (theme === 'festive-marigold') {
    // 3. Festive Marigold & Brass Glow
    const bg = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, w * 0.8);
    bg.addColorStop(0, '#2b1404');
    bg.addColorStop(0.6, '#180a02');
    bg.addColorStop(1, '#0a0401');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Floating festive spark particles
    for (let i = 0; i < 18; i++) {
      const sx = (i * 47) % w;
      const sy = (i * 61) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 153, 51, 0.45)' : 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    // 4. Emerald Velvet Luxury
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#04221a');
    bg.addColorStop(0.6, '#021510');
    bg.addColorStop(1, '#010907');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  // Draw Subject on Pedestal with contact shadow
  const scale = Math.min((w * 0.78) / img.width, (h * 0.68) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = h * 0.2;

  // Grounding pedestal shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, dy + dh - 12, dw * 0.44, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 35;
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, dx, dy, dw, dh);

  // Warm highlight glint
  drawGlint(ctx, dx + dw * 0.65, dy + dh * 0.35, 20, '#fff4cc');
}

// ============================================================================
// 3. IMAGE TO VIDEO MOTION ANIMATOR
// ============================================================================
function initImageToVideoTool() {
  const motionChips = document.querySelectorAll('#panel-image-to-video .suite-preset-chip');
  const togglePlayBtn = document.getElementById('suiteMotionToggleBtn');
  const sendMotionToReelBtn = document.getElementById('suiteSendMotionToReelBtn');

  motionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      motionChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      suiteState.selectedMotionStyle = chip.getAttribute('data-motion');
      startMotionLoop();
    });
  });

  if (togglePlayBtn) {
    togglePlayBtn.addEventListener('click', () => {
      if (suiteState.motionPlaying) {
        stopMotionLoop();
        togglePlayBtn.textContent = '▶ Play Loop';
      } else {
        startMotionLoop();
        togglePlayBtn.textContent = '⏸ Pause';
      }
    });
  }

  if (sendMotionToReelBtn) {
    sendMotionToReelBtn.addEventListener('click', () => {
      const canvas = document.getElementById('suiteMotionCanvas');
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      loadImage(dataUrl).then(img => {
        if (window.reelkarAppendPhoto) {
          window.reelkarAppendPhoto({
            id: 'photo_motion_' + Date.now(),
            file: null,
            img,
            dataUrl,
            base64: dataUrl.split(',')[1],
            sizeBytes: Math.round(dataUrl.length * 0.75),
            title: `Kinetic ${suiteState.selectedMotionStyle}`,
            price: '',
            itemType: 'Kinetic Motion',
            dominantColor: '#d4af37'
          });
          window.showToast?.('Added kinetic motion frame to Reel Tray!', 'success');
        }
      });
    });
  }
}

let motionFrame = 0;
function startMotionLoop() {
  stopMotionLoop();
  suiteState.motionPlaying = true;

  const canvas = document.getElementById('suiteMotionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (!suiteState.motionPlaying) return;
    motionFrame++;
    renderMotionScene(ctx, canvas.width, canvas.height, motionFrame);
    suiteState.motionAnimId = requestAnimationFrame(loop);
  }

  suiteState.motionAnimId = requestAnimationFrame(loop);
}

function stopMotionLoop() {
  suiteState.motionPlaying = false;
  if (suiteState.motionAnimId) {
    cancelAnimationFrame(suiteState.motionAnimId);
    suiteState.motionAnimId = null;
  }
}

function renderMotionScene(ctx, w, h, frame) {
  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0c0d14');
  bgGrad.addColorStop(0.5, '#07080c');
  bgGrad.addColorStop(1, '#020204');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const img = suiteState.currentSourceImage;
  if (!img) return;

  const style = suiteState.selectedMotionStyle;
  const t = (frame % 180) / 180; // 0 to 1 loop every 3 seconds at 60fps
  const wave = Math.sin(t * Math.PI * 2);

  ctx.save();
  ctx.translate(w / 2, h / 2);

  if (style === 'turntable') {
    // 3D Turntable rotation illusion
    const rot = wave * 0.08; // -4.5 deg to +4.5 deg
    const scaleX = 1 - Math.abs(wave) * 0.08; // perspective compression
    ctx.rotate(rot);
    ctx.scale(scaleX, 1);

  } else if (style === 'shimmer') {
    // Gentle pulse + glints
    const zoom = 1 + wave * 0.04;
    ctx.scale(zoom, zoom);

  } else if (style === 'zoom-in') {
    // Ken-Burns Push In
    const zoom = 1 + t * 0.15;
    ctx.scale(zoom, zoom);

  } else {
    // Floating breathing
    const floatY = wave * 16;
    ctx.translate(0, floatY);
  }

  // Draw subject
  const scale = Math.min((w * 0.82) / img.width, (h * 0.68) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  // Contact shadow with dynamic breathing
  ctx.save();
  ctx.beginPath();
  const shadowSpread = 0.42 + wave * 0.04;
  ctx.ellipse(0, dh / 2 - 10, dw * shadowSpread, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  // Moving light shimmer reflection
  if (style === 'shimmer' || style === 'turntable') {
    const glintX = -dw * 0.2 + wave * dw * 0.4;
    const glintY = -dh * 0.15 - wave * dh * 0.1;
    drawGlint(ctx, glintX, glintY, 18 + Math.abs(wave) * 8, '#ffffff');
  }

  ctx.restore();

  // Floating sparkle particles
  for (let i = 0; i < 12; i++) {
    const px = (w * 0.2 + (i * 37 + frame * 0.6)) % w;
    const py = (h * 0.85 - ((frame * 1.2 + i * 40) % (h * 0.7)));
    const alpha = Math.abs(Math.sin((frame + i * 20) * 0.05));
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 4. AI STORY & SHOT LIST PLANNER (Viral 5-Scene Storyboard)
// ============================================================================
function initStoryPlannerTool() {
  const generateStoryBtn = document.getElementById('suiteGenerateStoryBtn');
  const applyStoryToReelBtn = document.getElementById('suiteApplyStoryToReelBtn');
  const copyCaptionBtn = document.getElementById('suiteCopyStoryCaptionBtn');

  if (generateStoryBtn) {
    generateStoryBtn.addEventListener('click', generateViralStoryboard);
  }

  if (applyStoryToReelBtn) {
    applyStoryToReelBtn.addEventListener('click', () => {
      if (!suiteState.storyboard) return;
      applyStoryboardToReel();
      switchWorkspace('reel');
      window.showToast?.('Applied AI script, caption & shop details to Reel Studio!', 'success');
    });
  }

  if (copyCaptionBtn) {
    copyCaptionBtn.addEventListener('click', () => {
      const captionText = document.getElementById('suiteStoryCaptionDisplay')?.textContent;
      if (captionText) {
        navigator.clipboard.writeText(captionText);
        window.showToast?.('Copied full Instagram caption & hashtags!', 'success');
      }
    });
  }
}

function generateViralStoryboard() {
  const shopName = document.getElementById('inputShopName')?.value.trim() || 'Kalyan Heritage Jewellers';
  const category = document.getElementById('selectCategory')?.value || 'jewellery';
  const language = document.getElementById('selectLanguage')?.value || 'en';
  const goal = document.getElementById('suiteCampaignGoal')?.value || 'launch';

  const storyboards = {
    launch: [
      {
        time: '0 - 1.5s',
        shot: 'Visual Hook',
        framing: 'Macro 1.8x Zoom',
        action: 'Extreme close-up on center jewel with glint sparkle.',
        textOverlay: '✨ NEW EXCLUSIVE LAUNCH',
        voiceover: {
          en: 'Stop scrolling! Here is our most requested masterpiece.',
          hi: 'रुकिए! पेश है हमारी सबसे खास और नई कारीगरी।',
          gu: 'એક નજર અહી! આપણી સૌથી ખાસ અને નવી ડિઝાઈન આવી ગઈ છે.',
          hinglish: 'Wait a second! Hamara sabse exclusive royal collection drop ho chuka hai.'
        }
      },
      {
        time: '1.5 - 4.0s',
        shot: 'Craftsmanship Detail',
        framing: '45° Showroom Profile',
        action: 'Slow rotational panning revealing intricate hand-cut work.',
        textOverlay: 'Pure 22K Hallmarked Gold',
        voiceover: {
          en: 'Handcrafted by generational artisans with 22K certified hallmarking.',
          hi: '22K हॉलमार्क शुद्धता के साथ कुशल कारीगरों द्वारा निर्मित।',
          gu: 'પેઢીઓ જૂના કારીગરો દ્વારા શુદ્ધ 22K હોલમાર્કિંગ સાથે તૈયાર કરેલ.',
          hinglish: '100% Certified 22K Gold jiska finishing aur luster bilkul unique hai.'
        }
      },
      {
        time: '4.0 - 7.5s',
        shot: 'Occasion & Fit',
        framing: 'Low-Angle Hero Shot',
        action: 'Dramatic pedestal perspective showing royal presence.',
        textOverlay: 'Perfect for Wedding & Festivals',
        voiceover: {
          en: 'Designed to turn heads at every wedding and grand celebration.',
          hi: 'शादी और हर खास मौके पर आपके रूप में चार चांद लगाए।',
          gu: 'લગ્ન પ્રસંગ અને તહેવારો માટે સૌથી બેસ્ટ અને રોયલ ચોઇસ.',
          hinglish: 'Har wedding aur festive function me aapko dega royal celebrity look.'
        }
      },
      {
        time: '7.5 - 10.5s',
        shot: 'Direct Trust Factor',
        framing: 'Overhead Flat-Lay',
        action: 'Editorial flatlay layout with matching earrings and guarantee card.',
        textOverlay: 'Guaranteed Buyback & Lifetime Polish',
        voiceover: {
          en: 'Backed by our 100% buyback guarantee and direct showroom pricing.',
          hi: 'लाइफटाइम पॉलिश और 100% बायबैक गारंटी के साथ।',
          gu: '100% બાયબેક ગેરંટી અને સીધા શોરૂમ પ્રાઇસિંગ સાથે.',
          hinglish: 'Direct showroom price with lifetime exchange guarantee.'
        }
      },
      {
        time: '10.5 - 15.0s',
        shot: 'WhatsApp Call to Action',
        framing: 'Outro Brand Card',
        action: 'Animated WhatsApp order badge with click-to-chat CTA.',
        textOverlay: '📲 Tap WhatsApp to Order Now',
        voiceover: {
          en: `Tap WhatsApp to get instant pricing and video call preview from ${shopName}!`,
          hi: `कीमत जानने और लाइव वीडियो देखने के लिए तुरंत WhatsApp करें!`,
          gu: `કિંમત જાણવા અને લાઇવ જોવા માટે હમણાં જ WhatsApp કરો!`,
          hinglish: `Abhi WhatsApp pe message karein aur showroom se direct order karein!`
        }
      }
    ]
  };

  const selectedScenes = storyboards.launch;
  suiteState.storyboard = {
    shopName,
    category,
    language,
    scenes: selectedScenes
  };

  // Render Storyboard Timeline
  const container = document.getElementById('suiteStoryboardTimeline');
  if (!container) return;

  container.innerHTML = selectedScenes.map((s, idx) => `
    <div class="storyboard-item">
      <div class="shot-badge">${s.time}</div>
      <div class="shot-details">
        <div class="shot-name">Shot ${idx + 1}: ${s.shot}</div>
        <div class="shot-script"><strong>VO (${language.toUpperCase()}):</strong> "${s.voiceover[language] || s.voiceover.en}"</div>
        <div style="font-size: 0.78rem; color: var(--gold-bright); margin-top: 0.2rem;">Text on Screen: <strong>${s.textOverlay}</strong></div>
      </div>
      <div class="shot-tech">
        <svg class="icon" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <span>${s.framing}</span>
      </div>
    </div>
  `).join('');

  // Generate Instagram Caption Display
  const captionDisplay = document.getElementById('suiteStoryCaptionDisplay');
  if (captionDisplay) {
    const langVO = selectedScenes[0].voiceover[language] || selectedScenes[0].voiceover.en;
    const caption = `✨ ${shopName.toUpperCase()} PRESENTS ✨\n\n${langVO}\n\n💎 Certified Craftsmanship & Direct Showroom Rates\n📲 Tap the link in bio or WhatsApp us for instant live video preview & home delivery!\n\n#ReelKar #${shopName.replace(/\s+/g, '')} #IndianJewellery #GoldJewellery #BridalJewellery #JewelleryDesign #InstaReels #Handcrafted #TraditionalJewellery #JewelleryShop`;
    captionDisplay.textContent = caption;
  }

  const resultBox = document.getElementById('suiteStoryResultsBox');
  if (resultBox) resultBox.style.display = 'block';

  window.showToast?.('Viral 5-scene Reel storyboard generated!', 'success');
}

function applyStoryboardToReel() {
  if (!suiteState.storyboard) return;

  // Pre-fill caption & shop details in ReelKar UI
  const shopInput = document.getElementById('inputShopName');
  if (shopInput && suiteState.storyboard.shopName) {
    shopInput.value = suiteState.storyboard.shopName;
  }
}

// ============================================================================
// 5. AI AUDIO & JINGLES STUDIO
// ============================================================================
function initAudioStudioTool() {
  suiteAudioEngine = new ProceduralAudioEngine();
  const playButtons = document.querySelectorAll('.suite-audio-play-btn');

  playButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetId = btn.getAttribute('data-preset');
      const isPlaying = btn.classList.contains('playing');

      playButtons.forEach(b => {
        b.classList.remove('playing');
        b.textContent = '▶ Listen';
      });

      if (!isPlaying) {
        btn.classList.add('playing');
        btn.textContent = '⏹ Stop';
        suiteAudioEngine.play(presetId, 15);
      } else {
        suiteAudioEngine.stop();
      }
    });
  });
}
