// 指板の覚え方: ルート地図・指板クイズの純粋ロジック。ブラウザとNode両対応。
(function (root) {
  const pc = x => ((x % 12) + 12) % 12;
  const noteAt = (strings, s, f) => pc(strings[s] + f);
  // strSet=弦の添字の配列(0=最低音弦)
  const cells = (strings, maxFret, strSet) => { const o = [];
    strSet.forEach(s => { for (let f = 0; f <= maxFret; f++) o.push({ s, f, p: noteAt(strings, s, f) }); }); return o; };
  const rootFrets = (strings, key, s, maxFret) => { const o = [];
    for (let f = 0; f <= maxFret; f++) if (noteAt(strings, s, f) === pc(key)) o.push(f); return o; };
  // 1つ上の弦の4度上。通常は同じフレット、2弦(G→B)だけ1フレット上。
  function fourthUp(strings, s, f, maxFret) {
    if (s + 1 >= strings.length) return null;
    const g = f + 5 - (strings[s + 1] - strings[s]);
    return g >= 0 && g <= maxFret ? { s: s + 1, f: g } : null;
  }
  // オクターブ上の形: 2本上の弦と3本上の弦
  function octaves(strings, s, f, maxFret) { const o = [];
    [2, 3].forEach(k => { if (s + k >= strings.length) return;
      const g = f + 12 - (strings[s + k] - strings[s]); if (g >= 0 && g <= maxFret) o.push({ s: s + k, f: g, k }); });
    return o; }
  // 統計: {id:{n,ok,miss,ms}}。miss=間違えると+2、正解すると-1。ms=平均反応(移動平均)
  const weight = e => !e ? 1.5 : 1 + e.miss * 2 + (e.ms > 3000 ? 1 : 0) + (e.ms > 6000 ? 1 : 0);
  function record(stats, id, ok, ms) {
    const e = stats[id] = stats[id] || { n: 0, ok: 0, miss: 0, ms: 0 };
    e.ms = e.n ? Math.round(e.ms * 0.6 + ms * 0.4) : Math.round(ms);
    e.n++; if (ok) { e.ok++; e.miss = Math.max(0, e.miss - 1); } else e.miss += 2;
    return stats; }
  const idOf = q => q.type === 'name' ? `n${q.s}:${q.f}` : `f${q.s}:${q.p}`;
  function weighted(list, rnd) { const w = list.map(x => x.w), sum = w.reduce((a, b) => a + b, 0); let r = rnd() * sum;
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i].q; } return list[list.length - 1].q; }
  // mode: 'name' | 'find' | 'mix'。直前と同じ問題は出さない。間違い・遅い所を優先。
  function makeQuestion(o) {
    const rnd = o.rnd || Math.random, type = o.mode === 'mix' ? (rnd() < 0.5 ? 'name' : 'find') : o.mode, st = o.stats || {};
    let qs;
    if (type === 'name') qs = cells(o.strings, o.maxFret, o.strSet).map(c => ({ type, s: c.s, f: c.f, p: c.p }));
    else { qs = []; o.strSet.forEach(s => { for (let p = 0; p < 12; p++) qs.push({ type, s, p }); }); }
    const list = qs.map(q => ({ q, w: weight(st[idOf(q)]) })).filter(x => idOf(x.q) !== o.last);
    const q = weighted(list.length ? list : qs.map(q => ({ q, w: 1 })), rnd); q.id = idOf(q); return q;
  }
  const judge = (q, a, strings) => q.type === 'name' ? a.p === q.p : (a.s === q.s && noteAt(strings, a.s, a.f) === q.p);
  function summary(stats) { const es = Object.entries(stats); let n = 0, ok = 0, t = 0;
    es.forEach(([, e]) => { n += e.n; ok += e.ok; t += e.ms * e.n; });
    const worst = es.filter(([, e]) => e.miss > 0).sort((a, b) => b[1].miss - a[1].miss || b[1].ms - a[1].ms).slice(0, 5).map(([id]) => id);
    return { n, ok, rate: n ? Math.round(ok / n * 100) : 0, avgMs: n ? Math.round(t / n) : 0, worst }; }
  const label = (id, nStr) => { const m = id.match(/^([nf])(\d+):(\d+)$/); if (!m) return id; const str = nStr - +m[2];
    return m[1] === 'n' ? `${str}弦${m[3]}フレット` : `${str}弦の音${m[3]}`; };
  const api = { pc, noteAt, cells, rootFrets, fourthUp, octaves, weight, record, idOf, makeQuestion, judge, summary, label };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLFQ = api;
})(this);
