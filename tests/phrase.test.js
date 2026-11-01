const assert = require('assert');
const T = require('../www/core/theory.js'), P = require('../www/core/phrase.js');
const G = T.INSTR.guitar.strings, MAXF = 22, rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; });
const ok = ns => ns.every(n => n.s >= 0 && G[n.s] + n.f === n.p);

// 指板への割り当て: 音高が一致し、近い場所にまとまる
{ const ns = P.layout([{ st: 0, len: 2, p: 60 }, { st: 2, len: 2, p: 63 }, { st: 4, len: 2, p: 65 }], G, MAXF);
  assert.ok(ok(ns)); assert.ok(Math.max(...ns.map(n => n.f)) - Math.min(...ns.map(n => n.f)) <= 5); }
// 度数素材 → 指板(Cマイナーペンタ ポジション1の形に収まる)
{ const pos = T.buildPositions(G, T.SCALES.mpent, 0, MAXF)[0].variants[0];
  const ns = P.place([0, 3, 5, 7, 10].map((r, i) => ({ st: i * 2, len: 2, r })), 0, G, MAXF, pos);
  assert.ok(ok(ns)); const set = new Set(pos.notes.map(q => q.s + ':' + q.f)); assert.ok(ns.every(n => set.has(n.s + ':' + n.f)));
  assert.deepStrictEqual(ns.map(n => (n.p - ns[0].p)), [0, 3, 5, 7, 10]); }
// キー変更: 度数が保たれる。範囲外は s=-1
{ const a = P.place([0, 3, 7].map((r, i) => ({ st: i * 2, len: 2, r })), 0, G, MAXF), b = P.rekey(a, 0, 2, G, MAXF);
  assert.ok(ok(b)); assert.deepStrictEqual(b.map(n => T.pc(n.p - 2)), [0, 3, 7]); assert.deepStrictEqual(b.map(n => n.p - b[0].p), [0, 3, 7]); }
// 変形
const base = [{ st: 0, len: 2, p: 60 }, { st: 2, len: 2, p: 63 }, { st: 4, len: 4, p: 65 }];
{ assert.strictEqual(P.motifLen(base), 8);
  const r = P.repeat(base, 32); assert.strictEqual(r.length, 12); assert.strictEqual(r[3].st, 8); assert.ok(r.every(n => n.st + n.len <= 32));
  assert.deepStrictEqual(P.shiftScale(base, T.SCALES.mpent.iv, 0, 1).map(n => n.p), [63, 65, 67]);
  assert.deepStrictEqual(P.shiftScale(base, T.SCALES.mpent.iv, 0, -1).map(n => n.p), [58, 60, 63]);
  assert.deepStrictEqual(P.rhythm(base, 64, 'sync').map(n => n.st), [2, 4, 6]);
  const w = P.rhythm(base, 64, 'wide'); assert.deepStrictEqual(w.map(n => n.st), [0, 4, 8]); assert.strictEqual(w[2].len, 8);
  const t = P.rhythm(base, 16, 'tight'); assert.ok(t.length > 3 && t.every(n => n.st < 16));
  const nw = P.rhythm(base, 64, 'new', rng(3)); assert.ok(nw.length && nw.every(n => [60, 63, 65].includes(n.p) && n.st < 64));
  const e = P.changeEnd(base, T.SCALES.mpent.iv, 0, rng(1)); assert.deepStrictEqual(e.slice(0, 2), base.slice(0, 2)); assert.notStrictEqual(e[2].p, 65);
  assert.ok([0, 3, 4, 7].includes(T.pc(e[2].p))); }
// 書き出し
{ const ph = { bars: 1, key: 0, notes: P.layout([{ st: 0, len: 2, p: 60 }, { st: 2, len: 2, p: 63 }, { st: 4, len: 4, p: 67 }], G, MAXF) };
  assert.deepStrictEqual(P.degLabels(ph.notes, 0), ['1', '♭3', '5']);
  const tx = P.exportText(ph, { key: 0, scale: 'mpent', scaleName: 'マイナーペンタ', bpm: 100, strings: G });
  assert.ok(tx.includes('1  ♭3 5') || /1\s+♭3\s+5/.test(tx)); assert.ok(tx.includes('TAB') && tx.includes('音名') && /C\s+E♭\s+G/.test(tx));
  assert.strictEqual(tx.split('\n').filter(l => /^[A-Za-z♭♯ ]{1,2}\|/.test(l)).length, 6); }
// ガイドトーン
{ const g = P.guide('ii5', 0, 1); assert.strictEqual(g.name, 'G7'); assert.deepStrictEqual(g.tones.map(t => [t.pc, t.deg, t.role]), [[11, '3', '3度'], [5, '♭7', '7度']]);
  const l = P.links('ii5', 0, 1).find(x => x.from.pc === 5 && x.to.pc === 4); assert.strictEqual(l.from.pc, 5); assert.strictEqual(l.to.pc, 4); assert.strictEqual(l.move, -1);   // G7の7度F → CM7の3度E
  assert.strictEqual(P.guide('pop4', 0, 0).tones[1].role, '5度');
  const gl = P.guideLine('ii5', 0); assert.deepStrictEqual(gl.map(x => x.pc), [5, 5, 4, 4]); assert.ok(gl.every(x => Math.abs(x.move) <= 1));
  const bl = P.guideLine('blues12', 7); assert.ok(bl.every(x => Math.abs(x.move) <= 2));
  const loc = P.locate(G, [4], 0, 12); assert.ok(loc.every(q => (G[q.s] + q.f) % 12 === 4) && loc.length >= 6); }
// ウィザード
{ for (const id of P.RH.map(x => x.id)) { const it = P.wizard({ rhythm: id, semis: [0, 3, 7], end: 3 }, rng(7));
    assert.ok(it.every(n => n.st >= 0 && n.st + n.len <= 64)); const L = it[it.length - 1]; assert.strictEqual(L.st, 56); assert.strictEqual(L.len, 8); assert.strictEqual(T.pc(L.r), 3);
    assert.ok(it.every(n => [0, 3, 7].includes(T.pc(n.r)))); }
  const it = P.wizard({ rhythm: 'e8', semis: [0, 7], end: 0, bars: 2 }, rng(2)); assert.ok(it.every(n => n.st < 32)); assert.ok(ok(P.place(it, 0, G, MAXF))); }
// 再生フック: ループ・移調
{ const got = [], h = P.makeHook(() => ({ bars: 1, key: 0, notes: [{ st: 0, len: 2, p: 60, s: 1, f: 1 }, { st: 8, len: 4, p: 64, s: 1, f: 5 }, { st: 4, len: 1, p: 1, s: -1, f: -1 }] }), (p, w, d) => got.push([p, w, d]));
  h(16, 1.5, 0, 0.1); h(24, 2, 0, 0.1); h(20, 2, 0, 0.1); h(32, 3, 2, 0.1);
  assert.deepStrictEqual(got.map(x => x[0]), [60, 64, 62]); assert.strictEqual(got[0][1], 1.5); assert.ok(Math.abs(got[1][2] - 0.38) < 1e-9); }
console.log('phrase OK');
// キーシャッフル: makeHookはget(key)の結果を使い、移調済みの音をそのまま鳴らす
{ const got = [], hk = P.makeHook(k => ({ bars: 1, key: k, notes: [{ st: 0, len: 2, p: 60 + k, s: 0 }] }), (p, w, d) => got.push(p));
  hk(0, 0, 5, 0.1); hk(16, 0, 9, 0.1); assert.deepStrictEqual(got, [65, 69]); console.log('hook key OK'); }
