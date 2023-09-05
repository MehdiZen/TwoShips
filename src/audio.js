import {randFloatSpread} from './math.js';

const audioContext = new AudioContext();
const {sampleRate} = audioContext;

// A4 is 69.
const toFreq = (note) => 2 ** ((note - 69) / 12) * 440;

const playSound = (buffer, destination = audioContext.destination) => {
  const source = new AudioBufferSourceNode(audioContext, {buffer});
  source.connect(destination);
  source.start();
};

const generateAudioBuffer = (fn, duration, volume) => {
  const length = duration * sampleRate;

  const buffer = new AudioBuffer({length, sampleRate});
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    channel[i] = fn(i / sampleRate, i, channel) * volume;
  }

  return buffer;
};

const generateNotes = (fn, duration, volume) =>
  new Proxy(
      {},
      {
        get(target, property) {
          const sound =
          target[property] ||
          generateAudioBuffer(fn(toFreq(property)), duration, volume);
          target[property] = sound;
          return sound;
        },
      },
  );

// Oscillators
// f: frequency, t: parameter.
const sin = (f) => (t) => Math.sin(t * 2 * Math.PI * f);

const saw = (f) => (t) => {
  const n = ((t % (1 / f)) * f) % 1;
  return -1 + 2 * n;
};

const tri = (f) => (t) => {
  const n = ((t % (1 / f)) * f) % 1;
  return n < 0.5 ? -1 + 2 * (2 * n) : 1 - 2 * (2 * n);
};

const square = (f) => (t) => {
  const n = ((t % (1 / f)) * f) % 1;
  return n > 0.5 ? 1 : -1;
};

const decay = (d) => () => (t) => Math.exp(-t * d);

// Brown noise.
// https://github.com/Tonejs/Tone.js/blob/dev/Tone/source/Noise.ts
const noise = () => {
  let lastOut = 0;

  return () => {
    const white = randFloatSpread(1);
    const value = (lastOut + 0.02 * white) / 1.02;
    lastOut = value;
    return value * 3.5;
  };
};

// Operators.
const add = (a, b) => (f) => {
  const af = a(f);
  const bf = b(f);

  return (t, i, a) => af(t, i, a) + bf(t, i, a);
};

const mul = (a, b) => (f) => {
  const af = a(f);
  const bf = b(f);

  return (t, i, a) => af(t, i, a) * bf(t, i, a);
};

const scale = (fn, n) => (f) => {
  const fnf = fn(f);
  return (t, i, a) => n * fnf(t, i, a);
};

const slide = (fn, slide) => (f) => (t, i, a) =>
  fn(f + (i / a.length) * slide)(t, i, a);

const pitchJump = (fn, pitchJump, pitchJumpTime) => (f) => (t, i, a) =>
  fn(f + (t > pitchJumpTime ? pitchJump : 0))(t, i, a);

const adsr = (attack, decay, sustain, release, sustainVolume) => {
  const length = attack + decay + sustain + release;

  return () => (t) => {
    if (t < attack) {
      return t / attack;
    }

    if (t < attack + decay) {
      return 1 - ((t - attack) / decay) * (1 - sustainVolume);
    }

    if (t < length - release) {
      return sustainVolume;
    }

    if (t < length) {
      return ((length - t) / release) * sustainVolume;
    }

    return 0;
  };
};

// Reverb
const wet = new GainNode(audioContext, {gain: 0.3});
const dry = new GainNode(audioContext, {gain: 1 - wet.gain.value});
const convolver = new ConvolverNode(audioContext);
const destination = new GainNode(audioContext);

destination.connect(dry).connect(audioContext.destination);
destination.connect(convolver).connect(wet).connect(audioContext.destination);

// https://github.com/Tonejs/Tone.js/blob/dev/Tone/effect/Reverb.ts
(async () => {
  const decay = 1.5;
  const preDelay = 0.01;
  const duration = decay + preDelay;

  const offlineContext = new OfflineAudioContext(
      1,
      duration * sampleRate,
      sampleRate,
  );

  const gainNode = new GainNode(offlineContext, {gain: 0});
  gainNode.gain
      .setValueAtTime(1, preDelay)
      .exponentialRampToValueAtTime(0.01, duration);

  const offlineBufferSource = new AudioBufferSourceNode(offlineContext, {
    buffer: generateAudioBuffer(noise(), duration, 1),
  });

  offlineBufferSource.connect(gainNode).connect(offlineContext.destination);
  offlineBufferSource.start();

  convolver.buffer = await offlineContext.startRendering();
})();

const play = (sound) => playSound(sound, destination);

const shoot = generateNotes(mul(mul(saw, noise), decay(24)), 0.5, 1);
export var playShoot = () => play(shoot[16]);

const jump = generateNotes(
    mul(
        mul(square, pitchJump(square, toFreq(36) - toFreq(31), 0.1)),
        adsr(0.003, 0.05, 0.01, 0.03, 0.5),
    ),
    0.3,
    0.2,
);
export var playJump = () => play(jump[31]);

const enemyDeath = generateNotes(
    mul(
        mul(saw, pitchJump(square, toFreq(27) - toFreq(15), 0.1)),
        adsr(0.001, 0.3, 0.4, 0.3, 0.7),
    ),
    1,
    0.4,
);
export var playEnemyDeath = () => play(enemyDeath[15]);


addEventListener('click', () => audioContext.resume(), {once: true});
