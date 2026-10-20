/**
 * Turbo Mode Speed Benchmark Test for ReelKar
 */

import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;

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

async function testTurboSpeed() {
  console.log('⚡ Benchmark: Testing Turbo Mode Speed on 5 photos...');

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

    // Load sample photos
    await cdp.eval(`document.getElementById('tryDemoPhotosBtn').click()`);
    await sleep(2000);

    // Verify Turbo mode is active
    const activeSpeed = await cdp.eval(`document.querySelector('.speed-mode-btn.active')?.dataset.speed`);
    console.log('Active Speed Mode:', activeSpeed);

    const summaryBar = await cdp.eval(`document.getElementById('actionBarTitle').textContent`);
    console.log('Summary Bar:', summaryBar);

    console.log('\nStarting reel generation in Turbo Mode...');
    const t0 = performance.now();
    await cdp.eval(`document.getElementById('generateReelBtn').click()`);

    // Poll until complete
    let done = false;
    for (let s = 0; s < 40; s++) {
      await sleep(1000);
      const isVisible = await cdp.eval(`document.getElementById('resultSection').style.display !== 'none'`);
      const percent = await cdp.eval(`document.getElementById('progressPercentText')?.textContent || ''`);
      const stage = await cdp.eval(`document.getElementById('stepRenderText')?.textContent || ''`);
      console.log(`[${s + 1}s] Progress: ${percent} - ${stage}`);
      if (isVisible) {
        done = true;
        break;
      }
    }

    const totalBenchmarkMs = Math.round(performance.now() - t0);
    console.log(`\n========================================`);
    console.log(`⚡ TURBO BENCHMARK FINISHED in ${(totalBenchmarkMs / 1000).toFixed(1)}s!`);

    const summary = await cdp.eval(`document.getElementById('resultTelemetrySummary').textContent`);
    const videoUrl = await cdp.eval(`document.getElementById('outputVideo').src`);
    console.log(`Summary: ${summary}`);
    console.log(`Video Blob URL: ${videoUrl}`);
    console.log(`========================================\n`);

    if (!done || !videoUrl.startsWith('blob:')) {
      throw new Error('Benchmark failed to produce video in time');
    }

  } finally {
    chromeProc.kill();
  }
}

testTurboSpeed().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
