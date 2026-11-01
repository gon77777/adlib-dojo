const assert = require('assert');
const D = require('../www/core/drills.js'), T = require('../www/core/theory.js');
const G = T.INSTR.guitar.strings, fr = q => q.f;
const base = { strings: G, p: 5, dir: 'up', pat: 0, skip: 0, rhy: 0 };
// クロマチック: 各弦 p..p+3、6弦から1弦へ
let r = D.build('chroma', base); assert.strictEqual(r.seq.length, 24); assert.deepStrictEqual(r.seq.slice(0, 5).map(q => [q.s, q.f]), [[0, 5], [0, 6], [0, 7], [0, 8], [1, 5]]);
assert.deepStrictEqual(r.seq.slice(0, 4).map(q => q.fg), [1, 2, 3, 4]); r.seq.forEach(q => assert.strictEqual(q.m, G[q.s] + q.f));
assert.strictEqual(D.build('chroma', Object.assign({}, base, { dir: 'both' })).seq.length, 48); assert.strictEqual(D.build('chroma', Object.assign({}, base, { dir: 'down' })).seq[0].s, 5);
// スパイダー: 1-3-2-4
assert.deepStrictEqual(D.build('spider', Object.assign({}, base, { pat: 1 })).seq.slice(0, 4).map(fr), [5, 7, 6, 8]);
// オルタネイト: 1弦分8音=偶数(ダウン/アップがずれない)
r = D.build('alt', base); assert.strictEqual(r.seq.length, 48); assert.deepStrictEqual(r.seq.slice(0, 8).map(fr), [5, 6, 7, 8, 8, 7, 6, 5]);
// ハンマリング・プルオフ
r = D.build('hp', base); assert.deepStrictEqual(r.seq.slice(0, 7).map(q => q.art || '-'), ['-', 'H', 'H', 'H', 'P', 'P', 'P']); assert.deepStrictEqual(r.seq.slice(0, 7).map(fr), [5, 6, 7, 8, 7, 6, 5]);
// 弦移動: 隣 / 1本とばし
r = D.build('strx', base); assert.deepStrictEqual(r.seq.slice(0, 4).map(q => [q.s, q.f]), [[0, 5], [1, 5], [0, 6], [1, 6]]); assert.strictEqual(r.seq.length, 5 * 8);
r = D.build('strx', Object.assign({}, base, { skip: 1 })); assert.strictEqual(r.seq[1].s, 2); assert.strictEqual(r.seq.length, 4 * 8);
// スケール上下行: Aマイナーペンタ ポジション1
const pos = T.buildPositions(G, T.SCALES.mpent, 9, 22), v = pos[0].variants[0], N = D.notesOfVariant(v, G);
for (let i = 1; i < N.length; i++) assert.ok(N[i].m > N[i - 1].m);
r = D.build('scale3', Object.assign({}, base, { notes: N })); assert.deepStrictEqual(r.seq.slice(0, 6).map(q => q.m), [N[0], N[1], N[2], N[1], N[2], N[3]].map(q => q.m));
assert.strictEqual(r.seq.length, 3 * (N.length - 2) * 2);
r = D.build('scale4', Object.assign({}, base, { notes: N })); assert.deepStrictEqual(r.seq.slice(0, 5).map(q => q.m), [N[0], N[1], N[2], N[3], N[1]].map(q => q.m));
const last = r.seq.slice(-4).map(q => q.m); assert.deepStrictEqual(last, [N[3], N[2], N[1], N[0]].map(q => q.m));
assert.deepStrictEqual(D.build('scale3', base).seq, []);   // 音がなければ空
// リズム型: 16分、グリッドは16文字
r = D.build('rhythm', Object.assign({}, base, { notes: N, rhy: 3 })); assert.strictEqual(r.unit, 4); assert.strictEqual(r.grid.length, 16); assert.strictEqual(r.seq.length, N.length * 2 - 2);
// スピードビルダー
const sb = { sb: true, bpm: 60, max: 100, every: 2, add: 5 };
assert.strictEqual(D.bpmAt(0, sb), 60); assert.strictEqual(D.bpmAt(1, sb), 60); assert.strictEqual(D.bpmAt(2, sb), 65); assert.strictEqual(D.bpmAt(100, sb), 100); assert.strictEqual(D.bpmAt(9, { sb: false, bpm: 80 }), 80);
// 記録
const rec = {}; D.markDone(rec, 'hp', 80, '2026-11-01'); D.markDone(rec, 'hp', 70, '2026-11-02'); D.addSec(rec, 'hp', 30);
assert.deepStrictEqual(rec.hp, { n: 2, best: 80, sec: 30, last: '2026-11-02' });
// 追加メニュー: トリル・3度跳び・テクニック(ビブラート/ベンド/スライド)
r = D.build('trill', base); assert.deepStrictEqual(r.seq.slice(0, 8).map(fr), [5, 6, 5, 6, 5, 6, 5, 6]); assert.deepStrictEqual(r.seq.slice(0, 4).map(q => q.art || '-'), ['-', 'H', 'P', 'H']); assert.strictEqual(r.seq.length, 6 * 24);
r = D.build('thirds', Object.assign({}, base, { notes: N })); assert.deepStrictEqual(r.seq.slice(0, 4).map(q => q.m), [N[0], N[2], N[1], N[3]].map(q => q.m)); assert.strictEqual(r.seq.length, 4 * (N.length - 2));
for (const id of D.TECH) for (const fng of [1, 2, 3, 4]) for (const bt of [1, 2, 3]) for (const sl of [1, 2, 3, 5, 7]) for (let p = 1; p <= 12; p++) for (const strs of [G, T.INSTR.bass4.strings]) for (const dir of ['up', 'down', 'both']) {
  const q = D.build(id, { strings: strs, p, dir, fng, bt, sl }), per = (q.grid.match(/x/g) || []).length;
  assert.strictEqual(q.unit, 4); assert.strictEqual(q.grid.length, 16); assert.ok(q.seq.length > 0 && q.seq.length % per === 0, id);
  q.seq.forEach(x => { assert.ok(x.f >= 0 && x.f <= 15 && x.m === strs[x.s] + x.f && x.hold >= 4 && x.lbl, id + ' range'); }); }
r = D.build('bend', Object.assign({}, base, { fng: 3, bt: 2 })); assert.strictEqual(r.seq[0].art, 'T'); assert.strictEqual(r.seq[1].fx.bend, 2); assert.strictEqual(r.seq[0].m - r.seq[1].m, 2); assert.deepStrictEqual(new Set(r.seq.map(x => x.s)), new Set([3, 4, 5]));
assert.strictEqual(D.build('bendrel', base).seq[1].fx.rel, true); assert.ok(D.build('bendvib', base).seq[1].fx.vib > 0); assert.strictEqual(D.build('prebend', base).seq[0].fx.pre, 2);
assert.strictEqual(D.build('vib', base).seq[0].fx.vib > 0, true); r = D.build('slide', Object.assign({}, base, { sl: 3 })); assert.strictEqual(r.seq[1].m - r.seq[0].m, 3); assert.strictEqual(r.seq[0].fx.slide, 3); assert.strictEqual(r.seq[1].fx.slide, -3);
// すべてのメニューが全弦・全開始フレットで範囲内
for (const d of D.DRILLS) for (let p = 1; p <= 12; p++) { const q = D.build(d.id, Object.assign({}, base, { p, dir: 'both', notes: N })); q.seq.forEach(x => assert.ok(x.f >= 0 && x.f <= 15 && x.s < 6, d.id)); }
console.log('drills OK');
