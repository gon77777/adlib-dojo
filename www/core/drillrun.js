// 基礎練習のスケジューラ(ブラウザ専用)。音は Web Audio の時刻で予約し、点滅は少し遅らせて表示する。
(function (root) {
  const A = root.ADLAudio, D = root.ADLDrills;
  let run = false, timer = null, nextT = 0, i = 0, noteIdx = 0, queue = [], get, onEv;
  function click(t, accent) { const c = A.ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1760 : 1175; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g); g.connect(A.bus('drum')); o.start(t); o.stop(t + 0.05); }
  function tick() {
    const ctx = A.ctx(), c = get(), unit = c.unit, perBar = 4 * unit;
    while (nextT < ctx.currentTime + 0.12) {
      const bars = i < 0 ? 0 : Math.floor(i / perBar), bpm = D.bpmAt(bars, c), stepDur = 60 / bpm / unit, when = nextT;
      if (i < 0) { if ((i + 4 * unit) % unit === 0) click(when, true); queue.push({ t: when, cin: true, beat: Math.floor((i + 4 * unit) / unit) }); }
      else {
        if (c.click && i % unit === 0) click(when, i % perBar === 0);
        const gate = c.grid ? c.grid[i % 16] === 'x' : true, item = gate && c.seq.length ? c.seq[noteIdx % c.seq.length] : null;
        if (item) { if (c.sound) A.playAt(item.m, when, 0.85, 'tap', stepDur * (item.hold || 2), item.fx); noteIdx++; }
        queue.push({ t: when, i, item, bpm, bar: bars, pick: (c.grid ? i : noteIdx - 1) % 2 === 0 ? 'down' : 'up' });
      }
      nextT += stepDur; i++;
    }
  }
  function frame() { if (!run) return; const ctx = A.ctx(), lat = (ctx.outputLatency || ctx.baseLatency || 0) + ((get().offset || 0) / 1000);
    while (queue.length && queue[0].t - lat <= ctx.currentTime) onEv(queue.shift()); requestAnimationFrame(frame); }
  function start(getCfg, cb) { if (run) return; const ctx = A.resume(); get = getCfg; onEv = cb; A.gate(1);
    i = -4 * get().unit; noteIdx = 0; nextT = ctx.currentTime + 0.1; queue = []; run = true; timer = setInterval(tick, 25); requestAnimationFrame(frame); }
  function stop() { if (!run) return; run = false; clearInterval(timer); timer = null; queue = []; onEv({ stop: true }); }
  root.ADLDrill = { start, stop, get running() { return run; } };
})(this);
