/**
 * Multi-Style Verification Test for ReelKar
 * Tests all 4 style presets: Royal Gold, Festive, Minimal Luxe, and Bold Reel.
 */

import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;

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
        if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
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

async function testAllStyles() {
  console.log('Testing all 4 presets: Royal Gold, Festive, Minimal Luxe, Bold Reel...');

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,1000',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--no-sandbox'
  ]);

  try {
    const wsUrl = await getWebSocketUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.ready;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    // Load demo photos
    await cdp.eval(`document.getElementById('tryDemoPhotosBtn').click()`);
    await sleep(2000);

    const styles = [
      { id: 'royal-gold', name: 'Royal Gold' },
      { id: 'festive', name: 'Festive' },
      { id: 'minimal-luxe', name: 'Minimal Luxe' },
      { id: 'bold-reel', name: 'Bold Reel' }
    ];

    for (const style of styles) {
      console.log(`\n=== Testing Style: ${style.name} (${style.id}) ===`);
      
      // Select style card
      await cdp.eval(`{
        const card = document.querySelector('.style-card[data-id="${style.id}"]');
        if (card) card.click();
      }`);
      await sleep(400);

      // Click Generate Reel
      await cdp.eval(`document.getElementById('generateReelBtn').click()`);

      // Wait for rendering to complete
      let rendered = false;
      for (let sec = 0; sec < 35; sec++) {
        await sleep(1000);
        const isVisible = await cdp.eval(`document.getElementById('resultSection').style.display !== 'none'`);
        if (isVisible) {
          rendered = true;
          break;
        }
      }

      if (!rendered) {
        throw new Error(`Style ${style.name} failed to render in time`);
      }

      const videoUrl = await cdp.eval(`document.getElementById('outputVideo').src`);
      const summary = await cdp.eval(`document.getElementById('resultTelemetrySummary').textContent`);
      console.log(`✓ ${style.name} rendered successfully!`);
      console.log(`  - Video URL: ${videoUrl}`);
      console.log(`  - Telemetry: ${summary}`);

      // Capture screenshot of result
      const shot = await cdp.send('Page.captureScreenshot');
      fs.writeFileSync(`assets/screenshot_style_${style.id}.png`, Buffer.from(shot.data, 'base64'));

      // Switch back to studio for next style test
      await cdp.eval(`document.getElementById('makeAnotherBtn').click()`);
      await sleep(800);
    }

    console.log('\n🌟 ALL 4 STYLE PRESETS TESTED & VERIFIED IN REAL BROWSER! 🌟');

  } finally {
    chromeProc.kill();
  }
}

testAllStyles().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
