/**
 * Image Utilities for ReelKar
 * - Client-side downscaling (max 768px, JPEG 0.72) to stay well under Vercel's 4.5MB limit
 * - Color sampling (dominant palette extraction from image)
 * - Safe image loading with orientation correction
 */

import { CONFIG } from './config.js';

/**
 * Load a File, Blob, or URL into an HTMLImageElement
 * @param {File|Blob|string} source 
 * @returns {Promise<HTMLImageElement>}
 */
export async function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image. Ensure it is a valid JPG/PNG/WebP format.'));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    } else {
      reject(new Error('Unsupported image source type'));
    }
  });
}

/**
 * Downscale an image file to max dimension (e.g. 768px) and compress to JPEG 0.72
 * Returns base64 DataURL and metadata
 * @param {File|Blob|HTMLImageElement|string} source 
 * @returns {Promise<{ dataUrl: string, base64: string, width: number, height: number, sizeBytes: number }>}
 */
export async function downscaleImage(source) {
  const img = source instanceof HTMLImageElement ? source : await loadImage(source);

  const maxDim = CONFIG.IMAGE_PROCESSING.MAX_DIMENSION;
  let { naturalWidth: width, naturalHeight: height } = img;

  if (!width || !height) {
    width = img.width || 800;
    height = img.height || 1000;
  }

  // Calculate scaled dimensions
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Fill background to prevent transparent PNG turning black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, 0, 0, width, height);

  const quality = CONFIG.IMAGE_PROCESSING.JPEG_QUALITY;
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1];
  const sizeBytes = Math.round((base64.length * 3) / 4);

  return {
    dataUrl,
    base64,
    width,
    height,
    sizeBytes
  };
}

/**
 * Extract dominant color from image using canvas sampling
 * @param {HTMLImageElement|string} source 
 * @returns {Promise<{ hex: string, r: number, g: number, b: number, isDark: boolean }>}
 */
export async function extractDominantColor(source) {
  const img = source instanceof HTMLImageElement ? source : await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 64, 64);

  const imgData = ctx.getImageData(0, 0, 64, 64).data;
  let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;

  for (let i = 0; i < imgData.length; i += 16) { // sample every 4th pixel
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    // Ignore near-black and near-white extremes
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness > 25 && brightness < 235) {
      rTotal += r;
      gTotal += g;
      bTotal += b;
      count++;
    }
  }

  if (count === 0) {
    return { hex: '#d4af37', r: 212, g: 175, b: 55, isDark: false };
  }

  const r = Math.round(rTotal / count);
  const g = Math.round(gTotal / count);
  const b = Math.round(bTotal / count);
  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114);

  return { hex, r, g, b, isDark: lum < 128 };
}

/**
 * Format bytes into human readable string (KB / MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
