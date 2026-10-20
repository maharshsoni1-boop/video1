/**
 * API Client for ReelKar
 * Handles communication with backend serverless functions, latency measurement,
 * and seamless fallback when running offline or without server connectivity.
 */

import { telemetry } from './telemetry.js';

/**
 * Call /api/analyze to process photos with Gemini or deterministic fallback
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export async function analyzePhotos(payload) {
  telemetry.startTimer('api');
  telemetry.log(`Sending ${payload.images.length} photos for AI analysis (${payload.language.toUpperCase()})...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s fast safety timeout

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const latencyMs = telemetry.stopTimer('api');
    telemetry.update('apiLatencyMs', latencyMs);

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    telemetry.log(`AI analysis received in ${latencyMs}ms (Mode: ${data.offlineMode ? 'Smart Fallback' : 'Gemini 2.5 Flash'})`);
    return data;

  } catch (err) {
    const latencyMs = telemetry.stopTimer('api');
    telemetry.update('apiLatencyMs', latencyMs);
    telemetry.update('isOfflineMode', true);
    telemetry.log(`API unreachable (${err.message}). Using local deterministic smart engine.`);

    // Local in-browser fallback if backend is completely offline
    return getLocalFallback(payload);
  }
}

/**
 * Submit prototype feedback
 * @param {Object} feedbackData 
 * @returns {Promise<Object>}
 */
export async function submitFeedback(feedbackData) {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    return await res.json();
  } catch (e) {
    // Non-blocking fallback
    console.warn('Feedback could not be sent to server:', e);
    return { success: true, offline: true };
  }
}

/**
 * Client-side emergency fallback if /api/analyze is totally unreachable
 */
function getLocalFallback(payload) {
  const count = payload.images ? payload.images.length : 5;
  const category = payload.productType || 'Jewellery';
  const shop = payload.shopName || 'Boutique';

  const defaultTitles = {
    jewellery: ['Royal Choker', 'Peacock Jhumka', 'Solitaire Ring', 'Antique Kadas', 'Bridal Set'],
    clothing: ['Pure Silk Saree', 'Zari Border Detail', 'Bridal Palette', 'Intricate Pallu', 'Heritage Weave'],
    food: ['Artisan Cake', 'Fresh Frosting', 'Gourmet Treats', 'Celebration Slice', 'Bespoke Dessert'],
    beauty: ['Bridal Radiance', 'HD Makeup', 'Royal Hairdo', 'Glam Transformation', 'Glass Skin Finish'],
    other: ['Handcrafted Special', 'Premium Detail', 'Artisan Finish', 'Exclusive Piece', 'Bespoke Item']
  };

  const titles = defaultTitles[category] || defaultTitles.jewellery;
  const colors = ['#d4af37', '#ffd166', '#52b788', '#e76f51', '#c4972f'];

  const photos = Array.from({ length: count }).map((_, i) => ({
    index: i,
    title: titles[i % titles.length],
    itemType: `${category} Piece ${i + 1}`,
    dominantColor: colors[i % colors.length],
    bestSuitedOccasion: 'Festive & Wedding Celebrations',
    hookScore: i === 0 ? 98 : 80
  }));

  return {
    offlineMode: true,
    bestHookIndex: 0,
    hookRationale: 'Striking front detail stops rapid scrolling in under 1 second.',
    suggestedOrder: Array.from({ length: count }, (_, i) => i),
    caption: `✨ ${shop} Special Collection ✨\n\nPure elegance handcrafted for celebrations that matter. Designed to make heads turn.\n\n📍 WhatsApp us to enquire & order with pan-India insured shipping!`,
    hashtags: ['#IndianJewellery', '#FestiveLook', '#WeddingJewels', '#GoldJewellery', '#Handcrafted', '#DesiFashion', '#ReelKar', '#SmallBusinessIndia', '#ShopLocal', '#BridalCollection', '#TrendingReels', '#InstaStyle'],
    photos
  };
}
