// WebAudio基盤: Karplus-Strong 弦音 + 出力バス(drum/bass/chord/tap)。仕様書 10.1 / 11
(function (root) {
  let ctx = null, master = null, gate = null;
  const cache = new Map(), voices = [], buses = {};
  const MAX_VOICES = 24, VOL = { band: 1, phrase: 1, drum: 0.8, bass: 0.9, chord: 0.6, tap: 1 };   // band=伴奏全体(drum/bass/chordの親)、phrase=フレーズ再生音、tap=指板タップ

  function init() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createDynamicsCompressor();
    gate = ctx.createGain(); master.connect(gate); gate.connect(ctx.destination);
    for (const k in VOL) { buses[k] = ctx.createGain(); buses[k].gain.value = VOL[k]; }
    for (const k in VOL) buses[k].connect(['drum', 'bass', 'chord'].includes(k) ? buses.band : master);
    return ctx;
  }
  const getCtx = () => init();
  const bus = n => { init(); return buses[n]; };
  const setVol = (n, v) => { if (!(n in VOL)) return; VOL[n] = v; if (buses[n]) buses[n].gain.value = v; };   // 起動前でも保存済みの音量を先に設定できる
  function resume() { init(); if (ctx.state !== 'running') ctx.resume(); return ctx; }
  const setGate = v => { init(); gate.gain.cancelScheduledValues(0); gate.gain.value = v; };
  const panic = () => { init(); gate.gain.cancelScheduledValues(0); gate.gain.setTargetAtTime(0, ctx.currentTime, 0.02); };

  // 遅延線の長さを整数に丸めた分は playbackRate で補正する
  function makeBuffer(midi) {
    const sr = ctx.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12);
    const n = Math.round(sr / f), len = Math.floor(sr * (midi < 45 ? 3.2 : 2.4));
    const y = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.6 * ((Math.random() * 2 - 1) - lp); y[i] = lp; }
    const decay = midi < 45 ? 0.9985 : 0.997;
    for (let i = n; i < len; i++) y[i] = decay * 0.5 * (y[i - n] + y[i - n + 1]);
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
    const fade = Math.floor(sr * 0.25);
    for (let i = 0; i < len; i++) { y[i] /= peak; if (i > len - fade) y[i] *= (len - i) / fade; }
    const buf = ctx.createBuffer(1, len, sr); buf.copyToChannel(y, 0);
    return { buf, rate: f / (sr / (n + 0.5)) };
  }
  const get = m => { let c = cache.get(m); if (!c) { c = makeBuffer(m); cache.set(m, c); } return c; };
  const prep = list => { init(); list.forEach(get); };

  // when=開始時刻(省略で即時)、dur=指を離すまでの秒数(省略で自然減衰)
  // fx={bend:半音(押し上げ), rel:true=戻す, pre:半音(先に押し上げて戻す), slide:半音(滑らせる), vib:ゆれ幅(半音)}。音程はplaybackRateで変える
  function playAt(midi, when, vel, busName, dur, fx) {
    init(); const c = get(midi), t = when || ctx.currentTime;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = c.buf; src.playbackRate.value = c.rate; g.gain.value = 0.55 * (vel || 1);
    src.connect(g); g.connect(buses[busName || 'tap']); src.start(t);
    if (fx) { const pr = src.playbackRate, r0 = c.rate, T = dur || 1.5, st = n => Math.pow(2, n / 12);
      if (fx.pre) { pr.setValueAtTime(r0 * st(fx.pre), t); pr.setValueAtTime(r0 * st(fx.pre), t + T * 0.5); pr.linearRampToValueAtTime(r0, t + T * 0.5 + 0.3); }
      else if (fx.bend) { pr.setValueAtTime(r0, t + 0.03); pr.linearRampToValueAtTime(r0 * st(fx.bend), t + 0.35);
        if (fx.rel) { pr.setValueAtTime(r0 * st(fx.bend), t + T * 0.6); pr.linearRampToValueAtTime(r0, t + T * 0.6 + 0.35); } }
      else if (fx.slide) { pr.setValueAtTime(r0, t + T * 0.35); pr.linearRampToValueAtTime(r0 * st(fx.slide), t + T * 0.35 + 0.18); }
      if (fx.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(), top = fx.bend ? st(fx.bend) : 1, t1 = t + (fx.bend ? 0.5 : 0.25);
        lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t1); lg.gain.linearRampToValueAtTime(r0 * top * (st(fx.vib) - 1), t1 + 0.3);
        lfo.connect(lg); lg.connect(pr); lfo.start(t); lfo.stop(t + T + 0.7); } }
    if (dur) { g.gain.setTargetAtTime(0, t + dur, 0.06); src.stop(t + dur + 0.5); }
    const v = { src, g }; voices.push(v);
    if (voices.length > MAX_VOICES) { const o = voices.shift(); o.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); }
    src.onended = () => { const i = voices.findIndex(x => x.src === src); if (i >= 0) voices.splice(i, 1); };
    return v;
  }
  const play = (midi, vel) => { resume(); return playAt(midi, 0, vel, 'tap'); };
  const mute = list => list.forEach(v => v && v.g.gain.setTargetAtTime(0, ctx.currentTime, 0.02));
  root.ADLAudio = { init, ctx: getCtx, bus, setVol, resume, play, playAt, prep, mute, gate: setGate, panic };
})(this);
