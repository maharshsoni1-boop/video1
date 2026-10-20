/**
 * Procedural Web Audio API Engine for ReelKar
 * Generates original, royalty-free background music synchronized to each visual style.
 * Connects directly to MediaStreamAudioDestinationNode for video recording.
 */

export class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.destinationNode = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.scheduledNodes = [];
    this.timerIds = [];
  }

  /**
   * Initialize or resume the Web Audio context
   */
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.destinationNode = this.ctx.createMediaStreamDestination();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);

      // Route to both speaker output (preview) and stream destination (recorder)
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.destinationNode);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Get the audio stream track for MediaRecorder
   */
  getAudioTrack() {
    this.init();
    const tracks = this.destinationNode.stream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.75, t + 0.05);
    }
  }

  stop() {
    this.isPlaying = false;
    this.timerIds.forEach(id => clearTimeout(id));
    this.timerIds = [];

    this.scheduledNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.scheduledNodes = [];
  }

  /**
   * Play procedural music for a specific style mood and total duration
   * @param {string} mood - 'royal' | 'festive' | 'minimal' | 'bold'
   * @param {number} durationSec - total reel duration in seconds (e.g. 15s)
   */
  play(mood = 'royal', durationSec = 15) {
    this.init();
    this.stop();
    this.isPlaying = true;

    const startTime = this.ctx.currentTime + 0.05;

    switch (mood) {
      case 'festive':
        this._scheduleFestive(startTime, durationSec);
        break;
      case 'royal':
        this._scheduleRoyal(startTime, durationSec);
        break;
      case 'bold':
        this._scheduleBold(startTime, durationSec);
        break;
      case 'minimal':
      default:
        this._scheduleMinimal(startTime, durationSec);
        break;
    }

    // Schedule master fade out at the very end
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, startTime);
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, startTime + Math.max(0, durationSec - 1.2));
    this.masterGain.gain.linearRampToValueAtTime(0, startTime + durationSec);
  }

  // -------------------------------------------------------------
  // 1. ROYAL GOLD: Deep Sub Pad + Singing Bowl Harmonic Chimes
  // -------------------------------------------------------------
  _scheduleRoyal(t0, duration) {
    const ctx = this.ctx;
    const bpm = 80;
    const beat = 60 / bpm;

    // Rich warm drone pad (F minor / Ab major chords)
    const chords = [
      [174.61, 220.00, 261.63, 349.23], // F3, A3, C4, F4
      [130.81, 164.81, 196.00, 261.63], // C3, E3, G3, C4
      [146.83, 174.61, 220.00, 293.66], // D3, F3, A3, D4
      [116.54, 146.83, 174.61, 233.08]  // Bb2, D3, F3, Bb3
    ];

    const chordDuration = beat * 4;
    const totalBars = Math.ceil(duration / chordDuration);

    for (let bar = 0; bar < totalBars; bar++) {
      const chordTime = t0 + bar * chordDuration;
      if (chordTime >= t0 + duration) break;

      const chord = chords[bar % chords.length];
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, chordTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, chordTime);

        gain.gain.setValueAtTime(0.0001, chordTime);
        gain.gain.linearRampToValueAtTime(0.045, chordTime + 1.0);
        gain.gain.setValueAtTime(0.045, chordTime + chordDuration - 0.8);
        gain.gain.linearRampToValueAtTime(0.0001, chordTime + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(chordTime);
        osc.stop(chordTime + chordDuration);
        this.scheduledNodes.push(osc, gain);
      });

      // Temple chime bell on downbeats
      this._triggerChime(chordTime, 880);
      this._triggerChime(chordTime + beat * 2, 1318.5);
    }
  }

  // -------------------------------------------------------------
  // 2. FESTIVE: Synthesized Dholak / Tabla Rhythm + Raag Tanpura
  // -------------------------------------------------------------
  _scheduleFestive(t0, duration) {
    const ctx = this.ctx;
    const bpm = 112; // Upbeat celebratory tempo
    const beat = 60 / bpm;
    const sixteenth = beat / 4;

    // Tanpura Drone in Sa-Pa (C# - G#)
    const droneFreqs = [138.59, 207.65, 277.18]; // C#3, G#3, C#4
    droneFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 80, t0);

      gain.gain.setValueAtTime(0.035, t0);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t0);
      osc.stop(t0 + duration);
      this.scheduledNodes.push(osc, gain);
    });

    // Indian Percussion (Tabla Bayan bass pitch-bend + Dayan sharp rim)
    const totalSixteenths = Math.floor(duration / sixteenth);
    // 16-step rhythmic groove (Dha Dhin Dhin Dha / Ti-Te Ka-Ta)
    const bayanHits = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0];
    const dayanHits = [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0];

    for (let step = 0; step < totalSixteenths; step++) {
      const stepTime = t0 + step * sixteenth;
      if (stepTime >= t0 + duration) break;
      const patternIdx = step % 16;

      if (bayanHits[patternIdx]) {
        this._triggerBayanBass(stepTime);
      }
      if (dayanHits[patternIdx]) {
        this._triggerDayanStroke(stepTime, patternIdx % 4 === 0 ? 0.08 : 0.04);
      }
    }

    // Festive celebratory melodic arpeggio (Raag Bhupali pentatonic: C#, D#, F, G#, A#)
    const melodyScale = [277.18, 311.13, 349.23, 415.30, 466.16, 554.37];
    const notesPerBeat = 2;
    const melodySteps = Math.floor(duration / (beat / notesPerBeat));

    for (let m = 0; m < melodySteps; m++) {
      const mTime = t0 + m * (beat / notesPerBeat);
      if (mTime >= t0 + duration - 0.5) break;

      // Melodic motif
      const noteIdx = [0, 2, 3, 4, 3, 2, 1, 0, 3, 4, 5, 4, 3, 2, 0, 2][m % 16];
      const freq = melodyScale[noteIdx];
      this._triggerPluck(mTime, freq, 0.05);
    }
  }

  // -------------------------------------------------------------
  // 3. MINIMAL LUXE: Soft Rhodes Chord Pulses + Mellow Sine
  // -------------------------------------------------------------
  _scheduleMinimal(t0, duration) {
    const ctx = this.ctx;
    const bpm = 90;
    const beat = 60 / bpm;

    // Atmospheric chords (E maj7 / A maj7)
    const chordProgression = [
      [164.81, 246.94, 329.63, 493.88], // E3, B3, E4, B4
      [220.00, 277.18, 329.63, 440.00], // A3, C#4, E4, A4
      [185.00, 277.18, 369.99, 440.00], // F#3, C#4, F#4, A4
      [246.94, 311.13, 369.99, 493.88]  // B3, D#4, F#4, B4
    ];

    const chordLen = beat * 2;
    const bars = Math.ceil(duration / chordLen);

    for (let i = 0; i < bars; i++) {
      const time = t0 + i * chordLen;
      if (time >= t0 + duration) break;

      const chord = chordProgression[i % chordProgression.length];
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + chordLen - 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + chordLen);
        this.scheduledNodes.push(osc, gain);
      });

      // Soft ambient click/shaker
      this._triggerShaker(time, 0.02);
      this._triggerShaker(time + beat, 0.015);
    }
  }

  // -------------------------------------------------------------
  // 4. BOLD REEL: 808 Trap Kick + Snappy Snare + Synth Bass
  // -------------------------------------------------------------
  _scheduleBold(t0, duration) {
    const bpm = 128;
    const beat = 60 / bpm;
    const sixteenth = beat / 4;
    const totalSteps = Math.floor(duration / sixteenth);

    for (let s = 0; s < totalSteps; s++) {
      const stepTime = t0 + s * sixteenth;
      if (stepTime >= t0 + duration) break;
      const mod16 = s % 16;

      // 808 Kick on beats 1, 4.5, 7, 11
      if (mod16 === 0 || mod16 === 6 || mod16 === 10) {
        this._trigger808Kick(stepTime);
      }

      // Snappy Snare on beats 4 and 12
      if (mod16 === 4 || mod16 === 12) {
        this._triggerSnare(stepTime);
      }

      // Trap Hi-Hats every 2 steps
      if (s % 2 === 0) {
        this._triggerHiHat(stepTime, s % 8 === 0 ? 0.04 : 0.02);
      }
    }

    // Driving Bassline synth
    const bassSteps = Math.floor(duration / (beat / 2));
    const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42]; // A1 notes

    for (let b = 0; b < bassSteps; b++) {
      const bTime = t0 + b * (beat / 2);
      if (bTime >= t0 + duration - 0.4) break;
      const freq = bassNotes[b % bassNotes.length];
      this._triggerSynthBass(bTime, freq, beat / 2);
    }
  }

  // --- Sound Synthesizer Modules ---

  _triggerChime(time, freq) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 2.5);
    this.scheduledNodes.push(osc, gain);
  }

  _triggerBayanBass(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Tabla bayan pitch modulation: starts around 90Hz and swoops down to 55Hz
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(55, time + 0.18);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.22);
    this.scheduledNodes.push(osc, gain);
  }

  _triggerDayanStroke(time, vol = 0.05) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(260, time + 0.06);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.08);
    this.scheduledNodes.push(osc, gain);
  }

  _triggerPluck(time, freq, vol = 0.04) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.2);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.25);
    this.scheduledNodes.push(osc, gain);
  }

  _trigger808Kick(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.09);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.35);
    this.scheduledNodes.push(osc, gain);
  }

  _triggerSnare(time) {
    const ctx = this.ctx;
    // White noise buffer
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.12);
    this.scheduledNodes.push(noise, gain);
  }

  _triggerHiHat(time, vol = 0.03) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.04);
    this.scheduledNodes.push(noise, gain);
  }

  _triggerShaker(time, vol = 0.02) {
    this._triggerHiHat(time, vol);
  }

  _triggerSynthBass(time, freq, dur) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);

    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur);
    this.scheduledNodes.push(osc, gain);
  }
}
