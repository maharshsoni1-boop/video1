/**
 * UI Controller for ReelKar
 * Coordinates user interactions, photo tray reordering, persistent shop details,
 * style selection, video rendering orchestration, telemetry drawer, and Web Share API.
 */

import { CONFIG } from './config.js';
import { PRESETS } from './presets.js';
import { loadImage, downscaleImage, extractDominantColor, formatBytes } from './imageTools.js';
import { ProceduralAudioEngine } from './audio.js';
import { VideoRenderer } from './renderer.js';
import { telemetry } from './telemetry.js';
import { analyzePhotos, submitFeedback } from './api.js';

// Application State
const state = {
  photos: [], // array of { id, file, img, base64, dataUrl, title, price, dominantColor, itemType, sizeBytes }
  selectedPresetId: 'royal-gold',
  selectedSpeedMode: 'turbo',
  selectedFestivalId: 'none',
  selectedCategory: 'jewellery',
  selectedLanguage: 'en',
  shopName: '',
  city: '',
  whatsapp: '',
  aiAnalysis: null,
  isRendering: false,
  currentVideoResult: null,
  draggedIndex: null
};

// Singleton Engines
const audioEngine = new ProceduralAudioEngine();
const videoRenderer = new VideoRenderer(audioEngine);

// -------------------------------------------------------------
// DOM Ready Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLocalStorage();
  initLandingLoop();
  initUploadHandlers();
  initStylePicker();
  initFestivalSelector();
  initSpeedModeSelector();
  initTelemetryPanel();
  initFeedbackModal();
  initActionHandlers();
});

// -------------------------------------------------------------
// 1. LocalStorage Persistence for Shop Details
// -------------------------------------------------------------
function initLocalStorage() {
  try {
    const saved = localStorage.getItem('reelkar_shop_details');
    if (saved) {
      const data = JSON.parse(saved);
      state.shopName = data.shopName || '';
      state.city = data.city || '';
      state.whatsapp = data.whatsapp || '';
      state.selectedCategory = data.category || 'jewellery';
      state.selectedLanguage = data.language || 'en';

      document.getElementById('inputShopName').value = state.shopName;
      document.getElementById('inputCity').value = state.city;
      document.getElementById('inputWhatsApp').value = state.whatsapp;
      document.getElementById('selectCategory').value = state.selectedCategory;
      document.getElementById('selectLanguage').value = state.selectedLanguage;
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  // Listeners to auto-save
  const inputs = ['inputShopName', 'inputCity', 'inputWhatsApp', 'selectCategory', 'selectLanguage'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', saveShopDetails);
    el.addEventListener('input', saveShopDetails);
  });
}

function saveShopDetails() {
  state.shopName = document.getElementById('inputShopName').value.trim();
  state.city = document.getElementById('inputCity').value.trim();
  state.whatsapp = document.getElementById('inputWhatsApp').value.trim();
  state.selectedCategory = document.getElementById('selectCategory').value;
  state.selectedLanguage = document.getElementById('selectLanguage').value;

  try {
    localStorage.setItem('reelkar_shop_details', JSON.stringify({
      shopName: state.shopName,
      city: state.city,
      whatsapp: state.whatsapp,
      category: state.selectedCategory,
      language: state.selectedLanguage
    }));
  } catch (e) {}
}

// -------------------------------------------------------------
// 2. Landing Page Live Phone Preview Loop
// -------------------------------------------------------------
let heroLoopTimer = null;
async function initLandingLoop() {
  const canvas = document.getElementById('heroLoopCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Preload sample photos for hero mockup
  const loadedHeroImgs = [];
  for (const sample of CONFIG.SAMPLE_PHOTOS.slice(0, 3)) {
    try {
      const img = await loadImage(sample.src);
      loadedHeroImgs.push(img);
    } catch (e) {}
  }

  if (loadedHeroImgs.length === 0) return;

  let slideIndex = 0;
  let slideTime = 0;
  const slideDuration = 2.4;
  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    slideTime += dt;
    if (slideTime >= slideDuration) {
      slideTime = 0;
      slideIndex = (slideIndex + 1) % loadedHeroImgs.length;
    }

    const currentImg = loadedHeroImgs[slideIndex];
    const progress = slideTime / slideDuration;

    // Canvas dimensions: 270 x 480
    ctx.fillStyle = '#0a0b0f';
    ctx.fillRect(0, 0, 270, 480);

    // Blurred background
    ctx.save();
    ctx.filter = 'blur(12px) brightness(0.6)';
    ctx.drawImage(currentImg, -20, -20, 310, 520);
    ctx.restore();

    // Ken burns foreground
    ctx.save();
    const zoom = 1.0 + progress * 0.08;
    ctx.translate(135, 220);
    ctx.scale(zoom, zoom);
    const fw = 220;
    const fh = 290;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 15;
    ctx.roundRect(-fw / 2, -fh / 2, fw, fh, 12);
    ctx.clip();
    ctx.drawImage(currentImg, -fw / 2, -fh / 2, fw, fh);
    ctx.restore();

    // Floating golden sparkles
    ctx.fillStyle = '#f3e5ab';
    for (let i = 0; i < 6; i++) {
      const sx = (i * 45 + progress * 80) % 270;
      const sy = (100 + i * 50 - progress * 40) % 480;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(progress * 6 + i);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    heroLoopTimer = requestAnimationFrame(loop);
  }

  heroLoopTimer = requestAnimationFrame(loop);
}

// -------------------------------------------------------------
// 3. Upload & Sample Photo Handlers
// -------------------------------------------------------------
function initUploadHandlers() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const choosePhotosBtn = document.getElementById('choosePhotosBtn');
  const tryDemoPhotosBtn = document.getElementById('tryDemoPhotosBtn');
  const addMorePhotosBtn = document.getElementById('addMorePhotosBtn');

  choosePhotosBtn.addEventListener('click', () => fileInput.click());
  addMorePhotosBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  // Drag and Drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  });

  // 1-Click Try Demo Sample Photos
  tryDemoPhotosBtn.addEventListener('click', loadDemoPhotos);
}

async function loadDemoPhotos() {
  showToast('Loading 5 handcrafted sample jewellery photos...', 'info');
  telemetry.log('Loading 5 bundled demo sample photos...');

  const loadedPhotos = [];
  for (let i = 0; i < CONFIG.SAMPLE_PHOTOS.length; i++) {
    const sample = CONFIG.SAMPLE_PHOTOS[i];
    try {
      const img = await loadImage(sample.src);
      const downscaled = await downscaleImage(img);

      loadedPhotos.push({
        id: 'photo_' + Date.now() + '_' + i,
        file: null,
        img,
        dataUrl: downscaled.dataUrl,
        base64: downscaled.base64,
        sizeBytes: downscaled.sizeBytes,
        title: sample.name,
        price: sample.price,
        itemType: sample.itemType,
        dominantColor: sample.dominantColor
      });
    } catch (err) {
      console.warn('Failed to load sample photo:', sample.src, err);
    }
  }

  if (loadedPhotos.length >= 3) {
    state.photos = loadedPhotos;
    transitionToStudio();
    renderPhotoTray();
    updateTelemetryImageStats();
    showToast('Loaded 5 sample photos! Pick your style and create your reel.', 'success');
  } else {
    showToast('Could not load sample photos. Please upload your own.', 'error');
  }
}

async function handleFilesAdded(fileList) {
  const validFiles = fileList.filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
    return;
  }

  const remainingSlots = CONFIG.VIDEO.MAX_PHOTOS - state.photos.length;
  if (remainingSlots <= 0) {
    showToast(`Maximum ${CONFIG.VIDEO.MAX_PHOTOS} photos allowed.`, 'warning');
    return;
  }

  const filesToProcess = validFiles.slice(0, remainingSlots);
  showToast(`Processing ${filesToProcess.length} photos...`, 'info');

  for (const file of filesToProcess) {
    try {
      const img = await loadImage(file);
      const downscaled = await downscaleImage(img);
      const color = await extractDominantColor(img);

      state.photos.push({
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        file,
        img,
        dataUrl: downscaled.dataUrl,
        base64: downscaled.base64,
        sizeBytes: downscaled.sizeBytes,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        price: '',
        itemType: 'Product Feature',
        dominantColor: color.hex
      });
    } catch (e) {
      console.warn('Skipping unreadable image:', file.name, e);
    }
  }

  if (state.photos.length >= CONFIG.VIDEO.MIN_PHOTOS) {
    transitionToStudio();
    renderPhotoTray();
    updateTelemetryImageStats();
    showToast(`${state.photos.length} photos ready in tray.`, 'success');
  } else {
    renderPhotoTray();
    showToast(`Please add at least ${CONFIG.VIDEO.MIN_PHOTOS} photos (${state.photos.length} added).`, 'warning');
  }
}

function transitionToStudio() {
  document.getElementById('studioSection').style.display = 'flex';
  document.getElementById('resultSection').style.display = 'none';

  // Smooth scroll down to studio
  document.getElementById('studioSection').scrollIntoView({ behavior: 'smooth' });
}

// -------------------------------------------------------------
// 4. Photo Tray & Drag/Touch Reordering
// -------------------------------------------------------------
function renderPhotoTray() {
  const grid = document.getElementById('photoTrayGrid');
  const counter = document.getElementById('photoCounter');
  const hookBox = document.getElementById('hookRationaleBox');

  grid.innerHTML = '';
  counter.textContent = `${state.photos.length} Photos (Max ${CONFIG.VIDEO.MAX_PHOTOS})`;

  state.photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = `photo-card ${index === 0 ? 'is-hook' : ''}`;
    card.draggable = true;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="photo-thumb-wrapper">
        <img class="photo-thumb-img" src="${photo.dataUrl}" alt="Photo ${index + 1}" />
        ${index === 0 ? `
          <div class="hook-badge">
            <svg class="icon" style="width: 11px; height: 11px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>HOOK PHOTO</span>
          </div>
        ` : ''}
        <button class="photo-remove-btn" data-index="${index}" title="Remove photo">
          <svg class="icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <input class="photo-price-input" type="text" placeholder="Price tag (optional)" value="${photo.price || ''}" data-index="${index}" />

      <div class="photo-reorder-controls">
        <button class="reorder-btn move-left" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Move left">
          <svg class="icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="reorder-btn move-right" data-index="${index}" ${index === state.photos.length - 1 ? 'disabled' : ''} title="Move right">
          <svg class="icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      state.draggedIndex = index;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-target');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-target');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-target');
      if (state.draggedIndex !== null && state.draggedIndex !== index) {
        movePhoto(state.draggedIndex, index);
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      state.draggedIndex = null;
    });

    // Remove event
    card.querySelector('.photo-remove-btn').addEventListener('click', () => {
      if (state.photos.length <= CONFIG.VIDEO.MIN_PHOTOS) {
        showToast(`You need at least ${CONFIG.VIDEO.MIN_PHOTOS} photos for a reel.`, 'warning');
        return;
      }
      state.photos.splice(index, 1);
      renderPhotoTray();
      updateTelemetryImageStats();
    });

    // Price input change
    card.querySelector('.photo-price-input').addEventListener('input', (e) => {
      state.photos[index].price = e.target.value.trim();
    });

    // Arrow reordering
    card.querySelector('.move-left').addEventListener('click', () => {
      if (index > 0) movePhoto(index, index - 1);
    });

    card.querySelector('.move-right').addEventListener('click', () => {
      if (index < state.photos.length - 1) movePhoto(index, index + 1);
    });

    grid.appendChild(card);
  });

  // Update summary bar
  updateSummaryBar();
}

function movePhoto(fromIndex, toIndex) {
  const item = state.photos.splice(fromIndex, 1)[0];
  state.photos.splice(toIndex, 0, item);
  renderPhotoTray();
  showToast(`Reordered: Photo #${toIndex + 1} is now in position`, 'info');
}

function updateSummaryBar() {
  const preset = PRESETS[state.selectedPresetId];
  const speedMode = CONFIG.SPEED_MODES[state.selectedSpeedMode] || CONFIG.SPEED_MODES.turbo;
  const slideDuration = speedMode.slideDuration || 2.0;
  const totalDuration = Math.round(state.photos.length * slideDuration + speedMode.outroDuration);

  document.getElementById('actionBarTitle').textContent = `Ready to generate ${totalDuration}-second reel`;
  document.getElementById('actionBarSubtitle').textContent = `${preset.name} style • ${speedMode.name} • Procedural Web Audio`;
}

function initSpeedModeSelector() {
  const group = document.getElementById('speedToggleGroup');
  if (!group) return;

  const buttons = group.querySelectorAll('.speed-mode-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedSpeedMode = btn.dataset.speed;
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      updateSummaryBar();
      telemetry.log(`Switched to render mode: ${state.selectedSpeedMode === 'turbo' ? 'Turbo (720p / ~4s)' : 'Ultra HD (1080p / ~12s)'}`);
      showToast(`Selected ${state.selectedSpeedMode === 'turbo' ? '⚡ Turbo Mode (~4s render)' : '💎 Ultra HD (1080p)'}`, 'info');
    });
  });
}

// -------------------------------------------------------------
// 5. Style Picker & Festival Mode
// -------------------------------------------------------------
function initStylePicker() {
  const grid = document.getElementById('stylePickerGrid');
  grid.innerHTML = '';

  Object.values(PRESETS).forEach(preset => {
    const card = document.createElement('div');
    card.className = `style-card ${preset.id === state.selectedPresetId ? 'selected' : ''}`;
    card.dataset.id = preset.id;

    card.innerHTML = `
      <div class="style-preview-box" style="background: ${preset.previewBg}; border: ${preset.previewBorder}">
        <span class="style-preview-label" style="color: ${preset.previewTagColor}; font-family: ${preset.id === 'royal-gold' || preset.id === 'festive' ? 'var(--font-serif)' : 'var(--font-sans)'}">
          ${preset.name}
        </span>
      </div>
      <div class="style-name">${preset.name}</div>
      <div class="style-badge-tag">${preset.badge}</div>
      <div class="style-desc">${preset.description}</div>
    `;

    card.addEventListener('click', () => {
      state.selectedPresetId = preset.id;
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateSummaryBar();
      telemetry.log(`Selected style preset: ${preset.name}`);
    });

    grid.appendChild(card);
  });
}

function initFestivalSelector() {
  const row = document.getElementById('festivalRow');
  row.innerHTML = '';

  CONFIG.FESTIVALS.forEach(f => {
    const pill = document.createElement('button');
    pill.className = `festival-pill ${f.id === state.selectedFestivalId ? 'active' : ''}`;
    pill.type = 'button';
    pill.textContent = f.label;

    pill.addEventListener('click', () => {
      state.selectedFestivalId = f.id;
      document.querySelectorAll('.festival-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      telemetry.log(`Festival mode: ${f.label}`);
    });

    row.appendChild(pill);
  });
}

// -------------------------------------------------------------
// 6. Reel Generation Pipeline Orchestration
// -------------------------------------------------------------
function initActionHandlers() {
  const generateBtn = document.getElementById('generateReelBtn');
  generateBtn.addEventListener('click', startReelGeneration);

  // Logo click returns to top
  document.getElementById('brandLogo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Video controls
  const video = document.getElementById('outputVideo');
  const playBtn = document.getElementById('videoPlayPauseBtn');
  const muteBtn = document.getElementById('videoMuteBtn');

  playBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    showToast(video.muted ? 'Video Muted' : 'Video Unmuted', 'info');
  });

  // Copy Caption
  const copyBtn = document.getElementById('copyCaptionBtn');
  copyBtn.addEventListener('click', handleCopyCaption);

  // Share Reel (Web Share API)
  const shareBtn = document.getElementById('shareReelBtn');
  shareBtn.addEventListener('click', handleShareReel);

  // Make another version
  const makeAnotherBtn = document.getElementById('makeAnotherBtn');
  makeAnotherBtn.addEventListener('click', () => {
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('studioSection').style.display = 'flex';
    document.getElementById('studioSection').scrollIntoView({ behavior: 'smooth' });
  });
}

async function startReelGeneration() {
  if (state.photos.length < CONFIG.VIDEO.MIN_PHOTOS) {
    showToast(`Please have at least ${CONFIG.VIDEO.MIN_PHOTOS} photos in your tray.`, 'warning');
    return;
  }

  state.isRendering = true;
  const progressModal = document.getElementById('progressModal');
  const progressFill = document.getElementById('progressFillBar');
  const progressPercentText = document.getElementById('progressPercentText');
  const progressSubtext = document.getElementById('progressSubtext');
  const previewCanvas = document.getElementById('renderPreviewCanvas');

  // Reset progress steps
  const steps = ['stepAnalyze', 'stepCaption', 'stepAudio', 'stepRender'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'completed');
  });

  progressModal.classList.add('active');
  progressFill.style.width = '5%';
  progressPercentText.textContent = '5% Complete';

  try {
    // ---------------------------------------------
    // Step 1: AI Multimodal Analysis (/api/analyze)
    // ---------------------------------------------
    document.getElementById('stepAnalyze').classList.add('active');
    progressSubtext.textContent = 'Contacting Gemini 2.5 Flash to detect items and optimal hook photo...';

    const festivalObj = CONFIG.FESTIVALS.find(f => f.id === state.selectedFestivalId);
    const analyzePayload = {
      images: state.photos.map(p => p.base64),
      shopName: state.shopName || 'Boutique',
      city: state.city || 'India',
      productType: state.selectedCategory || 'jewellery',
      language: state.selectedLanguage || 'en',
      festival: festivalObj && festivalObj.badge ? festivalObj.label : 'none'
    };

    const aiResult = await analyzePhotos(analyzePayload);
    state.aiAnalysis = aiResult;

    // Update status badge on header
    const badge = document.getElementById('aiStatusBadge');
    const badgeText = document.getElementById('aiStatusText');
    if (aiResult.offlineMode) {
      badge.classList.add('offline');
      badgeText.textContent = 'Offline Smart Mode';
    } else {
      badge.classList.remove('offline');
      badgeText.textContent = 'Gemini 2.5 Active';
    }

    // Apply AI photo metadata (titles, dominant colors)
    if (Array.isArray(aiResult.photos)) {
      aiResult.photos.forEach((pMeta, i) => {
        if (state.photos[i]) {
          if (pMeta.title) state.photos[i].title = pMeta.title;
          if (pMeta.dominantColor) state.photos[i].dominantColor = pMeta.dominantColor;
          if (pMeta.itemType) state.photos[i].itemType = pMeta.itemType;
        }
      });
    }

    // Apply Smart Hook rationale
    if (aiResult.hookRationale) {
      document.getElementById('hookRationaleText').innerHTML = `
        <strong>Smart Hook:</strong> ${aiResult.hookRationale}
      `;
    }

    document.getElementById('stepAnalyze').classList.remove('active');
    document.getElementById('stepAnalyze').classList.add('completed');
    progressFill.style.width = '25%';
    progressPercentText.textContent = '25% Complete';

    // ---------------------------------------------
    // Step 2: Caption & Multilingual Copywriting
    // ---------------------------------------------
    document.getElementById('stepCaption').classList.add('active');
    progressSubtext.textContent = 'Generated high-converting Instagram caption & hashtags.';
    await sleep(250);

    document.getElementById('stepCaption').classList.remove('active');
    document.getElementById('stepCaption').classList.add('completed');
    progressFill.style.width = '40%';
    progressPercentText.textContent = '40% Complete';

    // ---------------------------------------------
    // Step 3: Audio Synthesis
    // ---------------------------------------------
    document.getElementById('stepAudio').classList.add('active');
    progressSubtext.textContent = `Synthesizing ${PRESETS[state.selectedPresetId].name} background music in browser...`;
    await sleep(300);

    document.getElementById('stepAudio').classList.remove('active');
    document.getElementById('stepAudio').classList.add('completed');
    progressFill.style.width = '55%';
    progressPercentText.textContent = '55% Complete';

    // ---------------------------------------------
    // Step 4: Canvas Video Rendering (1080x1920)
    // ---------------------------------------------
    document.getElementById('stepRender').classList.add('active');

    const renderResult = await videoRenderer.renderVideo({
      photos: state.photos,
      presetId: state.selectedPresetId,
      speedModeId: state.selectedSpeedMode,
      shopDetails: {
        shopName: state.shopName,
        city: state.city,
        whatsapp: state.whatsapp,
        category: state.selectedCategory,
        festival: festivalObj,
        isOfflineMode: aiResult.offlineMode
      },
      previewCanvas,
      onProgress: ({ stage, percent }) => {
        const scaledPercent = Math.min(99, Math.round(55 + (percent / 100) * 44));
        progressFill.style.width = `${scaledPercent}%`;
        progressPercentText.textContent = `${scaledPercent}% Complete`;
        document.getElementById('stepRenderText').textContent = stage;
      }
    });

    document.getElementById('stepRender').classList.remove('active');
    document.getElementById('stepRender').classList.add('completed');
    progressFill.style.width = '100%';
    progressPercentText.textContent = '100% Complete';

    state.currentVideoResult = renderResult;

    await sleep(400);
    progressModal.classList.remove('active');
    state.isRendering = false;

    // Display Results Screen
    showResultsScreen(renderResult);

  } catch (error) {
    console.error('Render failure:', error);
    progressModal.classList.remove('active');
    state.isRendering = false;
    showToast(`Error generating reel: ${error.message}`, 'error');
  }
}

function showResultsScreen(renderResult) {
  document.getElementById('studioSection').style.display = 'none';
  const resultSec = document.getElementById('resultSection');
  resultSec.style.display = 'grid';

  // Video element setup
  const video = document.getElementById('outputVideo');
  video.src = renderResult.url;
  video.play().catch(() => {});

  // Download button
  const downloadBtn = document.getElementById('downloadVideoBtn');
  downloadBtn.href = renderResult.url;
  const ext = renderResult.mimeType.includes('mp4') ? 'mp4' : 'webm';
  const brandSlug = (state.shopName || CONFIG.APP_NAME).toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadBtn.download = `${brandSlug}_reel_${state.selectedPresetId}.${ext}`;

  // Telemetry summary header
  const sizeMB = (renderResult.sizeBytes / (1024 * 1024)).toFixed(1);
  const timeSec = (renderResult.renderDurationMs / 1000).toFixed(1);
  document.getElementById('resultTelemetrySummary').textContent = 
    `Rendered in ${timeSec}s • 1080x1920 ${ext.toUpperCase()} • ${sizeMB} MB`;

  // Caption & Hashtags
  const captionEl = document.getElementById('resultCaptionText');
  captionEl.value = state.aiAnalysis?.caption || '';

  const hashtagsStrip = document.getElementById('resultHashtagsStrip');
  hashtagsStrip.innerHTML = '';
  const tags = state.aiAnalysis?.hashtags || [];
  tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'hashtag-pill';
    span.textContent = t;
    hashtagsStrip.appendChild(span);
  });

  // Remake options buttons
  const remakeRow = document.getElementById('remakeOptionsRow');
  remakeRow.innerHTML = '';
  Object.values(PRESETS).forEach(p => {
    if (p.id !== state.selectedPresetId) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.type = 'button';
      btn.textContent = `Render in ${p.name}`;
      btn.addEventListener('click', () => {
        state.selectedPresetId = p.id;
        document.querySelectorAll('.style-card').forEach(c => {
          c.classList.toggle('selected', c.dataset.id === p.id);
        });
        startReelGeneration();
      });
      remakeRow.appendChild(btn);
    }
  });

  resultSec.scrollIntoView({ behavior: 'smooth' });
  showToast('Reel generated successfully! You can download or share directly.', 'success');
}

// -------------------------------------------------------------
// 7. Sharing & Copying
// -------------------------------------------------------------
async function handleCopyCaption() {
  const caption = document.getElementById('resultCaptionText').value;
  const tags = (state.aiAnalysis?.hashtags || []).join(' ');
  const fullText = `${caption}\n\n${tags}`;

  try {
    await navigator.clipboard.writeText(fullText);
    const copyBtnText = document.getElementById('copyBtnText');
    copyBtnText.textContent = 'Copied!';
    showToast('Caption and hashtags copied to clipboard!', 'success');
    setTimeout(() => {
      copyBtnText.textContent = 'Copy Caption';
    }, 2500);
  } catch (err) {
    showToast('Failed to copy. Please select text manually.', 'warning');
  }
}

async function handleShareReel() {
  if (!state.currentVideoResult) return;
  const { blob, mimeType } = state.currentVideoResult;
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const file = new File([blob], `reelkar_video.${ext}`, { type: mimeType });

  const shareData = {
    title: `${state.shopName || CONFIG.APP_NAME} Reel`,
    text: state.aiAnalysis?.caption || 'Check out our latest collection!'
  };

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        ...shareData,
        files: [file]
      });
      showToast('Shared successfully!', 'success');
    } catch (e) {
      if (e.name !== 'AbortError') {
        showToast('Sharing cancelled or unsupported on this device.', 'info');
      }
    }
  } else if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast('Caption shared! Download video to attach to your post.', 'info');
    } catch (e) {}
  } else {
    // Fallback: trigger download
    document.getElementById('downloadVideoBtn').click();
    showToast('Web Share unsupported. Video downloaded to your device.', 'info');
  }
}

// -------------------------------------------------------------
// 8. Under-the-Hood Telemetry Panel
// -------------------------------------------------------------
function initTelemetryPanel() {
  const toggleBtn = document.getElementById('toggleTelemetryBtn');
  const drawer = document.getElementById('telemetryDrawer');
  const closeBtn = document.getElementById('closeTelemetryBtn');

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('active');
    toggleBtn.classList.toggle('active');
  });

  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('active');
    toggleBtn.classList.remove('active');
  });

  // Subscribe to real-time telemetry changes
  telemetry.subscribe((metrics) => {
    const compEl = document.getElementById('metricCompression');
    const apiEl = document.getElementById('metricApiLatency');
    const framesEl = document.getElementById('metricFrames');
    const resEl = document.getElementById('metricResolution');
    const encEl = document.getElementById('metricEncoder');
    const timeEl = document.getElementById('metricRenderTime');
    const sizeEl = document.getElementById('metricOutputSize');
    const logBox = document.getElementById('telemetryLogBox');

    if (compEl) compEl.textContent = `${formatBytes(metrics.rawInputBytes || 0)} → ${formatBytes(metrics.downscaledBytes || 0)}`;
    if (apiEl) apiEl.textContent = `${metrics.apiLatencyMs} ms (${metrics.aiModel})`;
    if (framesEl) framesEl.textContent = `${metrics.totalFramesRendered} @ ${metrics.fps}fps`;
    if (resEl) resEl.textContent = metrics.targetResolution;
    if (encEl) encEl.textContent = metrics.encoderMimeType.split(';')[0];
    if (timeEl) timeEl.textContent = `${(metrics.renderDurationMs / 1000).toFixed(1)}s`;
    if (sizeEl) sizeEl.textContent = formatBytes(metrics.outputSizeBytes || 0);

    if (logBox && metrics.logs.length > 0) {
      logBox.innerHTML = metrics.logs.map(l => `<div class="telemetry-log-line">${l}</div>`).join('');
    }
  });
}

function updateTelemetryImageStats() {
  const rawBytes = state.photos.reduce((acc, p) => acc + (p.file ? p.file.size : p.sizeBytes * 2), 0);
  const downscaledBytes = state.photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);

  telemetry.updateMultiple({
    imageCount: state.photos.length,
    rawInputBytes: rawBytes,
    downscaledBytes: downscaledBytes
  });
}

// -------------------------------------------------------------
// 9. Prototype Feedback Modal
// -------------------------------------------------------------
function initFeedbackModal() {
  const openBtn = document.getElementById('openFeedbackBtn');
  const modal = document.getElementById('feedbackModal');
  const closeBtn = document.getElementById('closeFeedbackBtn');
  const form = document.getElementById('feedbackForm');
  const stars = document.querySelectorAll('.star-btn');
  let currentRating = 5;

  openBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  stars.forEach(star => {
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.value, 10);
      stars.forEach(s => {
        const val = parseInt(s.dataset.value, 10);
        s.classList.toggle('selected', val <= currentRating);
      });
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitFeedbackBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const feedbackData = {
      name: document.getElementById('fbName').value,
      businessType: document.getElementById('fbBusinessType').value,
      willingToPay: document.getElementById('fbPrice').value,
      rating: currentRating,
      feedback: document.getElementById('fbText').value
    };

    await submitFeedback(feedbackData);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Feedback';
    modal.classList.remove('active');
    form.reset();
    showToast('Thank you! Your feedback helps shape ReelKar.', 'success');
  });
}

// -------------------------------------------------------------
// Helper Utilities
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
