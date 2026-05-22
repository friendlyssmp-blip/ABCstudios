/**
 * Retro sound effect generator (Sfxr-style synthesizer) for ABCstudio.
 * Uses Web Audio API to generate raw PCM data, encodes to mono 16-bit 22.05kHz WAV,
 * and yields a data URI format suitable for the game engine.
 * 
 * Supports: Laser, Explosion, Jump, Powerup, Hit, Blip, Random.
 */

export interface SynthParams {
  waveType: 'square' | 'sine' | 'triangle' | 'sawtooth' | 'noise';
  baseFrequency: number;
  frequencyLimit: number;
  pitchSlide: number; // Pitch envelope ramp rate
  attackTime: number; // Volume envelope
  sustainTime: number;
  decayTime: number;
  sustainVolume: number;
  vibratoDepth: number;
  vibratoSpeed: number;
  lowPassCutoff: number;
}

export const SYNTH_PRESETS: Record<string, SynthParams> = {
  laser: {
    waveType: 'sawtooth',
    baseFrequency: 880,
    frequencyLimit: 110,
    pitchSlide: -0.015,
    attackTime: 0.01,
    sustainTime: 0.1,
    decayTime: 0.15,
    sustainVolume: 0.3,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    lowPassCutoff: 10000,
  },
  explosion: {
    waveType: 'noise',
    baseFrequency: 300,
    frequencyLimit: 20,
    pitchSlide: -0.01,
    attackTime: 0.02,
    sustainTime: 0.15,
    decayTime: 0.35,
    sustainVolume: 0.4,
    vibratoDepth: 5,
    vibratoSpeed: 8,
    lowPassCutoff: 1200,
  },
  jump: {
    waveType: 'triangle',
    baseFrequency: 150,
    frequencyLimit: 600,
    pitchSlide: 0.012,
    attackTime: 0.01,
    sustainTime: 0.08,
    decayTime: 0.1,
    sustainVolume: 0.5,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    lowPassCutoff: 12000,
  },
  powerup: {
    waveType: 'sine',
    baseFrequency: 330,
    frequencyLimit: 1200,
    pitchSlide: 0.008,
    attackTime: 0.05,
    sustainTime: 0.15,
    decayTime: 0.2,
    sustainVolume: 0.6,
    vibratoDepth: 15,
    vibratoSpeed: 10,
    lowPassCutoff: 15000,
  },
  hit: {
    waveType: 'square',
    baseFrequency: 220,
    frequencyLimit: 50,
    pitchSlide: -0.02,
    attackTime: 0.01,
    sustainTime: 0.05,
    decayTime: 0.08,
    sustainVolume: 0.2,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    lowPassCutoff: 4000,
  },
  blip: {
    waveType: 'sine',
    baseFrequency: 523.25, // C5
    frequencyLimit: 523.25,
    pitchSlide: 0,
    attackTime: 0.005,
    sustainTime: 0.06,
    decayTime: 0.05,
    sustainVolume: 0.4,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    lowPassCutoff: 20000,
  },
};

/**
 * Generates an audio sample buffer (Float32Array) based on synth parameters.
 */
export function generateSamples(params: SynthParams, sampleRate = 22050): Float32Array {
  const totalDuration = params.attackTime + params.sustainTime + params.decayTime;
  const numSamples = Math.ceil(totalDuration * sampleRate);
  const samples = new Float32Array(numSamples);

  let phase = 0;
  let freq = params.baseFrequency;

  // Simple LCG random number generator for reproducible noise
  let noiseSeed = 12345;
  const getRandomNoise = () => {
    noiseSeed = (noiseSeed * 9301 + 49297) % 233280;
    return (noiseSeed / 233280) * 2 - 1;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // 1. Envelope calculation (Volume)
    let amplitude = 0;
    if (t < params.attackTime) {
      amplitude = t / params.attackTime;
    } else if (t < params.attackTime + params.sustainTime) {
      amplitude = 1.0 - (1.0 - params.sustainVolume) * ((t - params.attackTime) / params.sustainTime);
    } else {
      const decayT = t - params.attackTime - params.sustainTime;
      amplitude = params.sustainVolume * (1.0 - decayT / params.decayTime);
    }
    amplitude = Math.max(0, Math.min(1, amplitude));

    // 2. Pitch Sweep / Envelope
    if (params.pitchSlide !== 0) {
      freq += params.pitchSlide * (sampleRate / 100);
      if (params.pitchSlide < 0) {
        freq = Math.max(params.frequencyLimit, freq);
      } else {
        freq = Math.min(params.frequencyLimit, freq);
      }
    }

    // 3. Vibrato (Modulate frequency)
    let modulatedFreq = freq;
    if (params.vibratoDepth > 0) {
      modulatedFreq += Math.sin(t * params.vibratoSpeed * Math.PI * 2) * params.vibratoDepth;
    }
    modulatedFreq = Math.max(20, modulatedFreq);

    // 4. Wave oscillator
    let waveValue = 0;
    if (params.waveType === 'noise') {
      waveValue = getRandomNoise();
    } else {
      const step = modulatedFreq / sampleRate;
      phase = (phase + step) % 1.0;

      switch (params.waveType) {
        case 'square':
          waveValue = phase < 0.5 ? 0.3 : -0.3;
          break;
        case 'sine':
          waveValue = Math.sin(phase * Math.PI * 2);
          break;
        case 'triangle':
          waveValue = phase < 0.5 ? 4.0 * phase - 1.0 : 3.0 - 4.0 * phase;
          break;
        case 'sawtooth':
          waveValue = 2.0 * phase - 1.0;
          break;
      }
    }

    // 5. Build raw sample with master gain scaling
    samples[i] = waveValue * amplitude * 0.4;
  }

  // 6. Optional simple single-pole Low Pass Filter
  if (params.lowPassCutoff < sampleRate / 2) {
    const rc = 1.0 / (2.0 * Math.PI * params.lowPassCutoff);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);
    let previousSample = 0;
    for (let i = 0; i < samples.length; i++) {
      samples[i] = previousSample + alpha * (samples[i] - previousSample);
      previousSample = samples[i];
    }
  }

  return samples;
}

/**
 * Encodes array of float samples [-1.0, 1.0] to a mono 16-bit PCM WAV.
 * Returns the Base64 Data URI (data:audio/wav;base64,...)
 */
export function encodeToWavBase64(samples: Float32Array, sampleRate = 22050): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF Identifier
  writeString(view, 0, 'RIFF');
  // File size minus "RIFF" and "WAVE" label chunk (36 + data size)
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');

  // Format chunk header
  writeString(view, 12, 'fmt ');
  // Chunk size (16 for PCM)
  view.setUint32(16, 16, true);
  // Audio format (1 = uncompressed PCM)
  view.setUint16(20, 1, true);
  // Channel count (1 = mono)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sampleRate * channelCount * bytesPerSample) => sampleRate * 1 * 2
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channelCount * bytesPerSample) => 2
  view.setUint16(32, 2, true);
  // Bits per sample => 16
  view.setUint16(34, 16, true);

  // Data chunk header
  writeString(view, 36, 'data');
  // Data chunk size in bytes
  view.setUint32(40, samples.length * 2, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample float score
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  // Convert array buffer to base64
  const uint8 = new Uint8Array(buffer);
  let binary = '';
  const len = uint8.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(uint8).toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
