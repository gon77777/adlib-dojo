// 先読みスケジューラ + ドラム/ベース/コード合成(仕様書 9・10.2・11)
(function (root) {
  const A = root.ADLAudio, M = root.ADLMusic;
  let prepLap = -1, run = false, timer = null, worker = null, step = 0, nextT = 0, queue = [], get, onStep, noise = null;

  const noiseBuf = ctx => noise || (noise = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b; })());
  function env(g, t, peak, dur) { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); }
  function kick(t, v) {
    const c = A.ctx(), o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    env(g, t, v, 0.25); o.connect(g); g.connect(A.bus('drum')); o.start(t); o.stop(t + 0.3);
  }
  function noiseHit(t, type, freq, v, dur) {
    const c = A.ctx(), n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = noiseBuf(c); f.type = type; f.frequency.value = freq; env(g, t, v, dur);
    n.connect(f); f.connect(g); g.connect(A.bus('drum')); n.start(t); n.stop(t + dur + 0.02);
  }
  function snare(t, v) {
    noiseHit(t, 'bandpass', 1800, v * 0.9, 0.15);
    const c = A.ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = 180; env(g, t, v * 0.5, 0.1); o.connect(g); g.connect(A.bus('drum')); o.start(t); o.stop(t + 0.12);
  }
  const hat = (t, v, open) => noiseHit(t, 'highpass', 7000, v, open ? 0.25 : 0.04);
  function bass(t, midi, dur) {
    const c = A.ctx(), f = c.createBiquadFilter(), g = c.createGain(), fr = 440 * Math.pow(2, (midi - 69) / 12);
    f.type = 'lowpass'; f.frequency.value = 400;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.005); g.gain.setTargetAtTime(0, t + dur, 0.04);
    ['sine', 'sawtooth'].forEach((type, i) => { const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = fr; og.gain.value = i ? 0.25 : 0.8;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.3); });
    f.connect(g); g.connect(A.bus('bass'));
  }
  const wrap = (r, base, lo) => lo + ((((r - lo) % 12) + 12) % 12);

  function play(st, when, c) {
    const sx = ((st % 16) + 16) % 16;
    if (st < 0) { if (sx % 4 === 0) hat(when, sx === 0 ? 0.9 : 0.55, false); return; }
    const bar = Math.floor(st / 16), lk = M.lapKey(st, M.PROGS[c.prog].c.length, c.key, c.keyFor), ch = M.chordAt(c.prog, lk.key, bar), d = M.DR[c.drum];
    if (d.k.includes(sx)) kick(when, 0.9);
    if (d.s.includes(sx)) snare(when, 0.7);
    if (d.h.includes(sx)) hat(when, sx % 4 === 0 ? 0.5 : 0.3, false);
    const root = wrap(ch.r, 0, 28), sixt = 60 / c.bpm / 4;
    if (c.hook) c.hook(st, when, lk.key, sixt);   // フレーズ同時再生などの外部フック
    M.BS[c.bass](ch).forEach(([s, semi, len]) => { if (s === sx) bass(when, root + semi, len * sixt * 0.95); });
    M.COMP[c.comp].forEach(([s, len]) => { if (s !== sx) return;
      const r0 = wrap(ch.r, 0, 52);
      ch.iv.forEach((i, k) => A.playAt(r0 + i, when + k * 0.012, 0.55, 'chord', len * sixt)); });
  }
  function prep(c, key) {
    const n = M.PROGS[c.prog].c.length, list = new Set();
    for (let b = 0; b < n; b++) { const ch = M.chordAt(c.prog, key, b); ch.iv.forEach(i => list.add(wrap(ch.r, 0, 52) + i)); }
    A.prep([...list]);
  }
  function tick() {
    const ctx = A.ctx(), c = get();
    while (nextT < ctx.currentTime + 0.12) {
      const spb = 60 / c.bpm, when = nextT + M.stepShift(step, spb, c.swing, c.swMode);
      play(step, when, c);
      const lk = M.lapKey(step, M.PROGS[c.prog].c.length, c.key, c.keyFor);
      if (c.keyFor && prepLap !== lk.lap) { prepLap = lk.lap; prep(c, c.keyFor(lk.lap + 1)); }   // 次の周のキーの音を先に用意
      queue.push({ lap: lk.lap, key: lk.key, t: when, step, bar: step < 0 ? -1 : Math.floor(step / 16) % M.PROGS[c.prog].c.length, beat: Math.floor((((step % 16) + 16) % 16) / 4) });
      nextT += spb / 4; step++;
    }
  }
  function frame() {
    if (!run) return;
    const ctx = A.ctx(), lat = (ctx.outputLatency || ctx.baseLatency || 0) + ((get().offset || 0) / 1000);
    while (queue.length && queue[0].t - lat <= ctx.currentTime) onStep(queue.shift());
    requestAnimationFrame(frame);
  }
  function startTimer() {   // 画面状態に左右されにくいWorkerのタイマー。使えなければsetInterval
    try {
      const url = URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),25)']));
      worker = new Worker(url); worker.onmessage = tick;
    } catch (e) { timer = setInterval(tick, 25); }
  }
  function start(getCfg, cb) {
    if (run) return;
    const ctx = A.resume(); get = getCfg; onStep = cb; A.gate(1);
    const c = get(); prep(c, c.key); prepLap = -1;
    step = -16 * c.count; nextT = ctx.currentTime + 0.1; queue = []; run = true;
    startTimer(); requestAnimationFrame(frame);
  }
  function stop() {
    if (!run) return;
    run = false; if (worker) { worker.terminate(); worker = null; } if (timer) { clearInterval(timer); timer = null; }
    A.panic(); queue = []; onStep({ stop: true });
  }
  root.ADLEngine = { start, stop, get running() { return run; } };
})(this);
