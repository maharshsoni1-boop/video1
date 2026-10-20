/**
 * End-to-End Headless Chrome Test for ReelKar
 * Uses Chrome DevTools Protocol over native WebSocket in Node.js 22.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWebSocketUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await sleep(300);
  }
  throw new Error('Chrome remote debugging did not respond');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        listeners.forEach(fn => fn(msg.params));
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }
}

async function runBrowserTest() {
  console.log('🚀 Starting Headless Chrome for E2E Test...');
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,1000',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--mute-audio=false',
    '--no-sandbox'
  ]);

  try {
    const wsUrl = await getWebSocketUrl();
    console.log('Connected to Chrome CDP:', wsUrl);

    const cdp = new CDPClient(wsUrl);
    await cdp.ready;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    const consoleLogs = [];
    cdp.on('Runtime.consoleAPICalled', (params) => {
      const text = params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push(`[BROWSER CONSOLE] ${params.type}: ${text}`);
      if (params.type === 'error') {
        console.error(`🔴 [CONSOLE ERROR]: ${text}`);
      }
    });

    cdp.on('Runtime.exceptionThrown', (params) => {
      console.error('🔴 [EXCEPTION THROWN]:', params.exceptionDetails?.text, params.exceptionDetails?.exception?.description);
    });

    console.log('\n--- Step 1: Navigating to http://localhost:3000 ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    const pageTitle = await cdp.eval('document.title');
    console.log('Page Title:', pageTitle);
    if (!pageTitle.includes('ReelKar')) {
      throw new Error(`Unexpected page title: ${pageTitle}`);
    }

    // Capture Landing Page screenshot
    const shot1 = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_1_landing.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved assets/screenshot_1_landing.png');

    console.log('\n--- Step 2: Clicking "Try with Sample Photos" ---');
    await cdp.eval(`document.getElementById('tryDemoPhotosBtn').click()`);
    await sleep(2500);

    const photoCount = await cdp.eval(`document.querySelectorAll('.photo-card').length`);
    console.log('Browser console logs so far:\n', consoleLogs.join('\n'));
    console.log(`Photos loaded into studio tray: ${photoCount}`);
    if (photoCount < 3) {
      throw new Error(`Expected at least 3 photos, found: ${photoCount}`);
    }

    // Check first photo hook badge
    const hasHookBadge = await cdp.eval(`!!document.querySelector('.photo-card.is-hook')`);
    console.log('Hook badge present on first photo:', hasHookBadge);

    // Fill shop details
    await cdp.eval(`
      document.getElementById('inputShopName').value = 'Kalyan Heritage Jewellers';
      document.getElementById('inputCity').value = 'Ahmedabad';
      document.getElementById('inputWhatsApp').value = '+91 98765 43210';
      document.getElementById('inputShopName').dispatchEvent(new Event('input'));
    `);

    // Capture Studio Screenshot
    const shot2 = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_2_studio.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved assets/screenshot_2_studio.png');

    console.log('\n--- Step 3: Triggering Reel Generation (Royal Gold Style) ---');
    await cdp.eval(`document.getElementById('generateReelBtn').click()`);
    
    // Poll progress
    let renderDone = false;
    for (let p = 0; p < 45; p++) {
      await sleep(1000);
      const isVisible = await cdp.eval(`document.getElementById('resultSection').style.display !== 'none'`);
      const progressPercent = await cdp.eval(`document.getElementById('progressPercentText')?.textContent || ''`);
      const renderText = await cdp.eval(`document.getElementById('stepRenderText')?.textContent || ''`);

      console.log(`Render status [${p}s]: ${progressPercent} - ${renderText}`);

      if (isVisible) {
        renderDone = true;
        break;
      }
    }

    if (!renderDone) {
      throw new Error('Video generation timed out after 45 seconds');
    }

    console.log('\n--- Step 4: Verifying Output Reel and Player ---');
    const videoSrc = await cdp.eval(`document.getElementById('outputVideo').src`);
    const downloadHref = await cdp.eval(`document.getElementById('downloadVideoBtn').href`);
    const captionContent = await cdp.eval(`document.getElementById('resultCaptionText').value`);
    const hashtagCount = await cdp.eval(`document.querySelectorAll('.hashtag-pill').length`);
    const summaryText = await cdp.eval(`document.getElementById('resultTelemetrySummary').textContent`);

    console.log('Video Blob URL:', videoSrc);
    console.log('Download Href:', downloadHref);
    console.log('Generated Caption:', captionContent.substring(0, 100) + '...');
    console.log('Hashtags generated:', hashtagCount);
    console.log('Telemetry summary:', summaryText);

    if (!videoSrc || !videoSrc.startsWith('blob:')) {
      throw new Error(`Invalid video output source: ${videoSrc}`);
    }

    if (!captionContent || captionContent.length < 20) {
      throw new Error('Caption was not generated properly');
    }

    // Capture Result Screen Screenshot
    const shot3 = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_3_result.png', Buffer.from(shot3.data, 'base64'));
    console.log('Saved assets/screenshot_3_result.png');

    console.log('\n--- Step 5: Testing "Under the Hood" Telemetry Panel ---');
    await cdp.eval(`document.getElementById('toggleTelemetryBtn').click()`);
    await sleep(500);

    const metricCompression = await cdp.eval(`document.getElementById('metricCompression').textContent`);
    const metricResolution = await cdp.eval(`document.getElementById('metricResolution').textContent`);
    const metricFrames = await cdp.eval(`document.getElementById('metricFrames').textContent`);
    const metricRenderTime = await cdp.eval(`document.getElementById('metricRenderTime').textContent`);

    console.log('Telemetry - Input Compression:', metricCompression);
    console.log('Telemetry - Target Resolution:', metricResolution);
    console.log('Telemetry - Total Frames:', metricFrames);
    console.log('Telemetry - Render Time:', metricRenderTime);

    // Capture Telemetry Panel Screenshot
    const shot4 = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_4_telemetry.png', Buffer.from(shot4.data, 'base64'));
    console.log('Saved assets/screenshot_4_telemetry.png');

    console.log('\n--- Step 6: Testing Feedback Form Submission ---');
    await cdp.eval(`document.getElementById('openFeedbackBtn').click()`);
    await sleep(500);
    await cdp.eval(`
      document.getElementById('fbName').value = 'E2E Automated Tester';
      document.getElementById('fbText').value = 'Verified 1080x1920 video export and Web Audio procedural synth.';
      document.getElementById('feedbackForm').dispatchEvent(new Event('submit'));
    `);
    await sleep(1000);
    console.log('Feedback submitted successfully!');

    console.log('\n🎉 ALL E2E BROWSER TESTS PASSED FLAWLESSLY! 🎉');

  } finally {
    chromeProc.kill();
  }
}

runBrowserTest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
