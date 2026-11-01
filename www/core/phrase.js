// 実践フレーズの純粋ロジック(音の割り当て・変形・書き出し・ガイドトーン・ウィザード)。ブラウザとNode両対応。
// フレーズ={bars,key,notes:[{st(16分単位の開始),len,p(MIDI),s,f}]}。度数ベースの素材は{st,len,r(ルートからの半音)}。
(function (root) {
  const T = root.ADL || require('./theory.js'), M = root.ADLMusic || require('./music.js');
  const pc = T.pc, bySt = (a, b) => a.st - b.st;
  const cands = (strings, maxFret, p) => { const o = []; strings.forEach((open, s) => { const f = p - open; if (f >= 0 && f <= maxFret) o.push({ s, f }); }); return o; };
  const vset = v => v ? new Set(v.notes.map(q => q.s + ':' + q.f)) : null;

  // ---- 指板への割り当て(動きが最小になる弦・フレットをViterbiで選ぶ。variantがあればその形を優先) ----
  function layout(notes, strings, maxFret, variant) {
    const inV = vset(variant), sorted = notes.slice().sort(bySt);
    const cs = sorted.map(n => { let c = cands(strings, maxFret, n.p); if (inV) { const k = c.filter(x => inV.has(x.s + ':' + x.f)); if (k.length) c = k; } return c; });
    const idx = cs.map((c, i) => c.length ? i : -1).filter(i => i >= 0), dp = [], cost = (a, b) => Math.abs(a.f - b.f) + 2 * Math.abs(a.s - b.s);
    idx.forEach((i, k) => dp.push(cs[i].map(c => {
      if (!k) return { c, v: 0, from: -1 };
      let best = 1e9, from = 0; dp[k - 1].forEach((q, j) => { const v = q.v + cost(q.c, c); if (v < best) { best = v; from = j; } });
      return { c, v: best, from }; })));
    const pick = new Array(sorted.length).fill(null);
    if (dp.length) { let j = dp[dp.length - 1].reduce((b, q, i, a) => q.v < a[b].v ? i : b, 0);
      for (let k = dp.length - 1; k >= 0; k--) { pick[idx[k]] = dp[k][j].c; j = dp[k][j].from; } }
    return sorted.map((n, i) => Object.assign({}, n, pick[i] ? { s: pick[i].s, f: pick[i].f } : { s: -1, f: -1 }));
  }
  // 度数素材 → 指板。オクターブはvariantの形に一番収まる所(なければcenterフレット付近)を選ぶ
  function place(items, key, strings, maxFret, variant, center) {
    const inV = vset(variant), c0 = center != null ? center : variant ? (variant.lo + variant.hi) / 2 : 7;
    let best = null;
    for (let k = 1; k <= 8; k++) {
      const base = key + 12 * k; let play = 0, inv = 0, fs = 0;
      items.forEach(n => { const c = cands(strings, maxFret, base + n.r); if (!c.length) return; play++;
        if (inV && c.some(x => inV.has(x.s + ':' + x.f))) inv++; fs += Math.min(...c.map(x => Math.abs(x.f - c0))); });
      const score = play * 1000 + inv * 100 - fs; if (!best || score > best.score) best = { score, base };
    }
    return layout(items.map(n => ({ st: n.st, len: n.len, p: best.base + n.r })), strings, maxFret, variant);
  }
  // 現在の音 → ルートからの半音(最低音の下のルートを0とする)
  function rels(notes, key) {
    if (!notes.length) return [];
    const m = Math.min(...notes.map(n => n.p)), R = m - pc(m - key);
    return notes.map(n => ({ st: n.st, len: n.len, r: n.p - R }));
  }
  // キー変更・別ポジションへ移す(同じ度数・リズムのまま置き直す)
  const rekey = (notes, from, to, strings, maxFret, variant, center) => place(rels(notes, from), to, strings, maxFret, variant, center);

  // ---- 変形(どれも新しいnotesを返す。最後にlayoutで指板へ) ----
  const ladder = (iv, key) => { const a = []; for (let p = 12; p <= 100; p++) if (iv.includes(pc(p - key))) a.push(p); return a; };
  const snap = (a, p) => { let bi = 0, bd = 1e9; a.forEach((q, i) => { const d = Math.abs(q - p); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const motifLen = notes => { const e = Math.max(0, ...notes.map(n => n.st + n.len)); return [4, 8, 16, 32, 64].find(x => x >= e) || 64; };
  const end0 = n => n.st + n.len;
  const clip = (list, total) => list.filter(n => n.st >= 0 && n.st < total).map(n => ({ st: n.st, len: Math.max(1, Math.min(n.len, total - n.st)), p: n.p }));
  function repeat(notes, total, mlen) {
    mlen = mlen || motifLen(notes);
    const m = notes.filter(n => n.st < mlen).map(n => ({ st: n.st, len: Math.min(n.len, mlen - n.st), p: n.p })), out = [];
    for (let o = 0; o < total; o += mlen) m.forEach(n => out.push({ st: o + n.st, len: n.len, p: n.p }));
    return clip(out, total);
  }
  function shiftScale(notes, iv, key, k) {
    const a = ladder(iv, key);
    return notes.map(n => ({ st: n.st, len: n.len, p: a[Math.max(0, Math.min(a.length - 1, snap(a, n.p) + k))] }));
  }
  const RH = [   // 1小節のリズム型 [開始, 長さ](16分単位)
    { id: 'q4', n: '4分×4', p: [[0,4],[4,4],[8,4],[12,4]] },
    { id: 'e8', n: '8分の連続', p: [0,2,4,6,8,10,12,14].map(s => [s, 2]) },
    { id: 'syn', n: '3-3-2(シンコペ)', p: [[0,3],[3,3],[6,2],[8,3],[11,3],[14,2]] },
    { id: 'push', n: '8分+4分', p: [[0,2],[2,2],[4,4],[8,2],[10,2],[12,4]] },
    { id: 'ls', n: '長短(付点)', p: [[0,6],[6,2],[8,6],[14,2]] },
    { id: 'off', n: '裏から入る', p: [[2,2],[4,2],[6,2],[8,4],[12,2],[14,2]] },
    { id: 's16', n: '16分まじり', p: [[0,1],[1,1],[2,2],[4,4],[8,1],[9,1],[10,2],[12,4]] },
    { id: 'sp', n: '間をあける', p: [[0,6],[6,2],[8,8]] }
  ];
  function rhythm(notes, total, kind, rnd) {
    rnd = rnd || Math.random; const ns = notes.slice().sort(bySt), ml = motifLen(ns);
    if (kind === 'sync') return clip(ns.map(n => ({ st: n.st + 2, len: n.len, p: n.p })), total);
    if (kind === 'wide') return clip(ns.map(n => ({ st: n.st * 2, len: n.len * 2, p: n.p })), total);
    if (kind === 'tight') { const h = ns.map(n => ({ st: Math.floor(n.st / 2), len: Math.max(1, Math.ceil(n.len / 2)), p: n.p })); return repeat(h, total, Math.max(2, ml / 2)); }
    // new: 同じ音の並びに別のリズムを当てる
    const ps = ns.filter(n => n.st < ml).map(n => n.p), pat = RH[Math.floor(rnd() * RH.length)].p, on = [];
    for (let o = 0; o < ml; o += 16) pat.forEach(([s, l]) => { if (o + s < ml) on.push({ st: o + s, len: Math.min(l, ml - o - s) }); });
    return repeat(on.map((x, i) => ({ st: x.st, len: x.len, p: ps[i % ps.length] })), total, ml);
  }
  // 最後の音だけ変える(ルート・3度・5度のどれか、無ければ隣のスケール音)
  function changeEnd(notes, iv, key, rnd) {
    rnd = rnd || Math.random; const ns = notes.slice().sort(bySt); if (!ns.length) return ns;
    const L = ns[ns.length - 1], a = ladder(iv, key), o = [];
    for (let d = -5; d <= 5; d++) { const p = L.p + d; if (d && a.includes(p) && [0, 3, 4, 7].includes(pc(p - key))) o.push(p); }
    if (!o.length) { const i = snap(a, L.p); [i - 1, i + 1].forEach(j => a[j] != null && o.push(a[j])); }
    ns[ns.length - 1] = { st: L.st, len: L.len, p: o[Math.floor(rnd() * o.length)] };
    return ns;
  }

  // ---- 度数・書き出し ----
  function degLabels(notes, key) {
    if (!notes.length) return [];
    const m = Math.min(...notes.map(n => n.p)), R = m - pc(m - key);
    return notes.map(n => T.DEG[pc(n.p - key)] + "'".repeat(Math.floor((n.p - R) / 12)));
  }
  const unitOf = notes => notes.every(n => n.st % 2 === 0 && n.len % 2 === 0) ? 2 : 1;
  const padE = (s, w) => { s = String(s); while ([...s].length < w) s += ' '; return s; };
  function grid(ph, key, f) {   // f(note)→セル文字。休符'.'、のばし'-'
    const u = unitOf(ph.notes), ns = ph.notes.slice().sort(bySt), lab = degLabels(ns, key), rows = [], per = 16 / u;
    for (let b = 0; b < ph.bars; b++) { let line = '';
      for (let c = 0; c < per; c++) { const st = b * 16 + c * u, i = ns.findIndex(n => n.st === st);
        line += padE(i >= 0 ? f(ns[i], lab[i]) : ns.some(n => n.st < st && st < end0(n)) ? '-' : '.', 3) + ((c + 1) * u % 4 === 0 ? ' ' : ''); }
      rows.push(line.trimEnd()); }
    const hd = []; for (let c = 0; c < per; c++) hd.push(padE(u === 2 ? ['1','&','2','&','3','&','4','&'][c] : ['1','e','&','a','2','e','&','a','3','e','&','a','4','e','&','a'][c], 3) + ((c + 1) * u % 4 === 0 ? ' ' : ''));
    return { head: hd.join('').trimEnd(), rows };
  }
  function tab(ph, strings) {
    const u = unitOf(ph.notes), per = 16 / u, ns = ph.notes.filter(n => n.s >= 0), out = [];
    for (let b0 = 0; b0 < ph.bars; b0 += 2) {
      for (let s = strings.length - 1; s >= 0; s--) { let line = padE(T.NOTE_F[T.pc(strings[s])], 2) + '|';
        for (let b = b0; b < Math.min(ph.bars, b0 + 2); b++) { for (let c = 0; c < per; c++) { const n = ns.find(x => x.st === b * 16 + c * u && x.s === s); line += n ? String(n.f).padEnd(3, '-') : '---'; } line += '|'; }
        out.push(line); }
      out.push('');
    }
    return out.join('\n').trimEnd();
  }
  function exportText(ph, o) {   // o={key,scaleName,bpm,title,strings}
    const key = o.key, d = grid(ph, key, (n, l) => l), nm = grid(ph, key, n => T.noteName(n.p, key, o.scale));
    const L = [`【${o.title || 'フレーズ'}】 ${T.noteName(key, key, o.scale)} ${o.scaleName || ''}  ${ph.bars}小節` + (o.bpm ? `  BPM${o.bpm}` : ''), '',
      '度数 (-:のばす .:休み  \' は1オクターブ上)', '      ' + d.head, ...d.rows.map((r, i) => `${i + 1}小節 ${r}`), '', '音名', ...nm.rows.map((r, i) => `${i + 1}小節 ${r}`)];
    if (o.strings) L.push('', 'TAB', tab(ph, o.strings));
    return L.join('\n');
  }

  // ---- ガイドトーン ----
  const sd = (a, b) => ((b - a + 18) % 12) - 6;   // a→bの最短の動き(−6〜5半音)
  function guide(prog, key, bar) {
    const ch = M.chordAt(prog, key, bar), iv = ch.iv, t = [{ pc: pc(ch.r + iv[1]), deg: T.DEG[iv[1]], role: '3度' }];
    t.push(iv[3] != null ? { pc: pc(ch.r + iv[3]), deg: T.DEG[iv[3]], role: '7度' } : { pc: pc(ch.r + iv[2]), deg: T.DEG[iv[2]], role: '5度' });
    return { bar, name: ch.name, r: ch.r, tones: t };
  }
  function links(prog, key, bar) {   // このコードの狙い音 → 次のコードの狙い音(動きが小さい順)
    const n = M.PROGS[prog].c.length, a = guide(prog, key, bar), b = guide(prog, key, (bar + 1) % n), o = [];
    a.tones.forEach(x => b.tones.forEach(y => o.push({ from: x, to: y, move: sd(x.pc, y.pc) })));
    return o.sort((p, q) => Math.abs(p.move) - Math.abs(q.move));
  }
  function guideLine(prog, key) {   // 全コードを半音以内でつなぐ一本の線(3度スタートで貪欲に)
    const n = M.PROGS[prog].c.length, out = [];
    for (let b = 0; b < n; b++) { const g = guide(prog, key, b); let t = g.tones[0];
      if (b) { const p = out[b - 1].pc; t = g.tones.reduce((x, y) => Math.abs(sd(p, y.pc)) < Math.abs(sd(p, x.pc)) ? y : x); }
      out.push({ bar: b, name: g.name, pc: t.pc, deg: t.deg, role: t.role, move: b ? sd(out[b - 1].pc, t.pc) : 0 }); }
    out[0].move = sd(out[n - 1].pc, out[0].pc);
    return out;
  }
  const locate = (strings, pcs, a, b) => { const o = []; strings.forEach((open, s) => { for (let f = a; f <= b; f++) if (pcs.includes(pc(open + f))) o.push({ s, f }); }); return o; };

  // ---- 4小節フレーズ作成ウィザード(リズム→使う音→終わりの音→生成) ----
  // o={rhythm:id, semis:[使う音(ルートからの半音)], end:終わりの音(半音), bars}。返り値は度数素材(placeで指板へ)
  function wizard(o, rnd) {
    rnd = rnd || Math.random; const bars = o.bars || 4, pat = RH.find(x => x.id === o.rhythm).p, semis = [...new Set(o.semis.concat([o.end]))].sort((a, b) => a - b);
    const L = []; [0, 12].forEach(k => semis.forEach(s => L.push(s + k)));
    const W = [-2, -1, -1, 1, 1, 2, 0], clampI = i => Math.max(0, Math.min(L.length - 1, i));
    const walk = (i0, n) => { const r = []; let i = i0; for (let k = 0; k < n; k++) { if (k) { let d = W[Math.floor(rnd() * W.length)]; if (!d && k > 1 && r[k - 1] === r[k - 2]) d = 1; let j = i + d; if (j < 0 || j >= L.length) j = i - d; i = clampI(j); } r.push(i); } return r; };   // 端に当たったら反対へ跳ね返る
    const first = pat.filter(x => x[0] < 8), A = walk(L.indexOf(0) >= 0 ? L.indexOf(0) : 0, pat.length), A2 = A.map(i => clampI(i + (rnd() < 0.5 ? 1 : -1)));
    const items = []; let lastI = 0;
    for (let b = 0; b < bars; b++) {
      if (b === bars - 1) { const seq = walk(lastI, first.length);
        first.forEach(([s, l], k) => items.push({ st: b * 16 + s, len: l, r: L[seq[k]] }));
        const ref = first.length ? L[seq[seq.length - 1]] : L[lastI], e = L.map((v, i) => [Math.abs(v - ref) + (pc(v) === pc(o.end) ? 0 : 99), v]).sort((x, y) => x[0] - y[0])[0][1];
        items.push({ st: b * 16 + 8, len: 8, r: e }); }
      else { const seq = b === 0 ? A : b % 2 ? A : A2; pat.forEach(([s, l], k) => items.push({ st: b * 16 + s, len: l, r: L[seq[k]] })); lastI = seq[seq.length - 1]; }
    }
    return items;
  }
  // 再生フック(engineのc.hookに渡す)。フレーズを進行にあわせてループ再生。キーシャッフル時は移調する。
  function makeHook(get, play) {
    play = play || ((p, w, d) => root.ADLAudio.playAt(p, w, 0.85, 'phrase', d));
    return (st, when, key, sixt) => { const ph = get(key); if (!ph || !ph.notes.length) return;   // get(key): UI側が現在のキーに置き直した{bars,key,notes}を返せる
      const x = st % (ph.bars * 16), sh = ph.key == null ? 0 : sd(ph.key, key);
      ph.notes.forEach(n => { if (n.st === x && n.s !== -1) play(n.p + sh, when, Math.max(0.1, n.len * sixt * 0.95)); }); };
  }
  const api = { layout, place, rels, rekey, ladder, motifLen, repeat, shiftScale, rhythm, changeEnd, RH, degLabels, unitOf, exportText, tab, guide, links, guideLine, locate, sd, wizard, makeHook };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLPhrase = api;
})(this);
