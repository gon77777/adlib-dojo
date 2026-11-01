const assert = require('assert');
const Q = require('../www/core/fretquiz.js'), T = require('../www/core/theory.js');
const G = T.INSTR.guitar.strings;
// 音の位置: 6弦5フレット=A、5弦3フレット=C
assert.strictEqual(Q.noteAt(G, 0, 5), 9); assert.strictEqual(Q.noteAt(G, 1, 3), 0);
// ルート: Gは6弦3、5弦10、4弦5
assert.deepStrictEqual(Q.rootFrets(G, 7, 0, 12), [3]); assert.deepStrictEqual(Q.rootFrets(G, 7, 1, 12), [10]); assert.deepStrictEqual(Q.rootFrets(G, 7, 2, 12), [5]);
// 4度上: 同じフレット、3弦→2弦だけ+1。実音で4度(5半音)になる
for (let s = 0; s < 5; s++) for (let f = 0; f <= 12; f++) { const r = Q.fourthUp(G, s, f, 22);
  if (r) { assert.strictEqual(Q.pc(Q.noteAt(G, r.s, r.f) - Q.noteAt(G, s, f)), 5); assert.strictEqual(r.f, s === 3 ? f + 1 : f); } }
assert.strictEqual(Q.fourthUp(G, 5, 3, 22), null);
// オクターブ: 全て12半音上
for (let s = 0; s < 4; s++) for (let f = 0; f <= 12; f++) Q.octaves(G, s, f, 22).forEach(o => assert.strictEqual(G[o.s] + o.f - (G[s] + f), 12));
assert.deepStrictEqual(Q.octaves(G, 0, 5, 22).map(o => [o.s, o.f]), [[2, 7], [3, 2]]);   // 6弦A→4弦7、3弦2
// E-F, B-Cは半音(自然音の並び)
assert.strictEqual(Q.pc(Q.noteAt(G, 0, 1) - Q.noteAt(G, 0, 0)), 1); assert.strictEqual(Q.pc(Q.noteAt(G, 1, 3) - Q.noteAt(G, 1, 2)), 1);   // 6弦E→F、5弦B→C
// 出題: 範囲内・直前と重複しない・間違いが優先される
const st = {}; Q.record(st, 'n0:5', false, 4000); Q.record(st, 'n0:5', false, 4000);
let hit = 0; for (let i = 0; i < 400; i++) { const q = Q.makeQuestion({ strings: G, maxFret: 12, strSet: [0, 1, 2], mode: 'name', stats: st, last: 'n0:3' });
  assert.ok(q.f >= 0 && q.f <= 12 && q.s <= 2 && q.id !== 'n0:3'); if (q.id === 'n0:5') hit++; }
assert.ok(hit > 400 / 39 * 2, '苦手が優先される ' + hit);
for (const mode of ['name', 'find', 'mix']) for (let i = 0; i < 50; i++) { const q = Q.makeQuestion({ strings: G, maxFret: 12, strSet: [0, 1, 2, 3, 4, 5], mode }); assert.ok(q.id && q.p >= 0 && q.p < 12); }
// 判定
assert.ok(Q.judge({ type: 'name', p: 9 }, { p: 9 }, G)); assert.ok(!Q.judge({ type: 'name', p: 9 }, { p: 8 }, G));
assert.ok(Q.judge({ type: 'find', s: 1, p: 7 }, { s: 1, f: 10 }, G)); assert.ok(!Q.judge({ type: 'find', s: 1, p: 7 }, { s: 2, f: 5 }, G));
// 記録: 正解で miss が減り、時間が記録される
const s2 = {}; Q.record(s2, 'a', false, 1000); Q.record(s2, 'a', true, 2000);
assert.strictEqual(s2.a.miss, 1); assert.strictEqual(s2.a.n, 2); assert.strictEqual(Q.summary(s2).rate, 50); assert.deepStrictEqual(Q.summary(s2).worst, ['a']);
assert.strictEqual(Q.label('n0:3', 6), '6弦3フレット');
console.log('fretquiz OK');
// ルート地図(教本R14の数字と一致)
const R = { 0: [[4, 0], [5, 1], [7, 3], [9, 5], [11, 7], [0, 8], [2, 10]], 1: [[9, 0], [11, 2], [0, 3], [2, 5], [4, 7], [5, 8], [7, 10]], 2: [[2, 0], [4, 2], [5, 3], [7, 5], [9, 7], [11, 9], [0, 10]] };
for (const s in R) R[s].forEach(([k, f]) => assert.strictEqual(Q.noteAt(G, +s, f), k, s + ':' + f));
console.log('rootmap OK');
