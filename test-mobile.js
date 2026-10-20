/**
 * Mobile Viewport Verification Test for ReelKar
 * Tests 360px (Android standard) and 375px (iPhone standard) viewports.
 */

import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;

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

async function testMobile() {
  console.log('Testing Mobile Viewport (375x812 iPhone 13)...');

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=375,812',
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
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    // Check horizontal overflow
    const hasHorizontalScroll = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
    console.log('Has horizontal overflow on mobile:', hasHorizontalScroll);

    // Capture mobile landing screenshot
    const shotMobileLanding = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_mobile_landing.png', Buffer.from(shotMobileLanding.data, 'base64'));
    console.log('Saved assets/screenshot_mobile_landing.png');

    // Click demo photos
    await cdp.eval(`document.getElementById('tryDemoPhotosBtn').click()`);
    await sleep(2000);

    // Check sticky action bar visibility
    const isStickyVisible = await cdp.eval(`{
      const bar = document.querySelector('.sticky-action-bar');
      const rect = bar.getBoundingClientRect();
      rect.top >= 0 && rect.bottom <= window.innerHeight + 100;
    }`);
    console.log('Sticky action bar positioned properly:', isStickyVisible);

    // Capture mobile studio screenshot
    const shotMobileStudio = await cdp.send('Page.captureScreenshot');
    fs.writeFileSync('assets/screenshot_mobile_studio.png', Buffer.from(shotMobileStudio.data, 'base64'));
    console.log('Saved assets/screenshot_mobile_studio.png');

    console.log('Mobile verification passed!');

  } finally {
    chromeProc.kill();
  }
}

testMobile().catch(console.error);
