/**
 * Telemetry & Pipeline Performance Tracker for ReelKar
 * Captures real-time metrics for the "Under the Hood" technical inspection panel.
 */

class TelemetryTracker {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.metrics = {
      imageCount: 0,
      rawInputBytes: 0,
      downscaledBytes: 0,
      compressionRatio: '0%',
      apiLatencyMs: 0,
      aiModel: 'Gemini 2.5 Flash',
      isOfflineMode: false,
      totalFramesRendered: 0,
      fps: 30,
      targetResolution: '1080x1920 (9:16)',
      encoderMimeType: 'unknown',
      renderDurationMs: 0,
      outputSizeBytes: 0,
      audioSampleRate: '44.1 kHz',
      audioTracks: 1,
      startTime: 0,
      status: 'idle',
      logs: []
    };
    this.timers = {};
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.metrics);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners?.forEach(fn => {
      try { fn(this.metrics); } catch (e) {}
    });
  }

  log(message) {
    const time = new Date().toLocaleTimeString();
    this.metrics.logs.unshift(`[${time}] ${message}`);
    if (this.metrics.logs.length > 50) this.metrics.logs.pop();
    this.notify();
  }

  startTimer(id) {
    this.timers[id] = performance.now();
  }

  stopTimer(id) {
    if (this.timers[id]) {
      const elapsed = Math.round(performance.now() - this.timers[id]);
      delete this.timers[id];
      return elapsed;
    }
    return 0;
  }

  update(key, value) {
    this.metrics[key] = value;
    this.notify();
  }

  updateMultiple(obj) {
    Object.assign(this.metrics, obj);
    this.notify();
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

export const telemetry = new TelemetryTracker();
