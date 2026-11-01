const assert = require('assert');
const M = require('../www/core/music.js');
const names = (p, key, n) => Array.from({ length: n }, (_, b) => M.chordAt(p, key, b).name);
assert.deepStrictEqual(names('minor4', 9, 4), ['Am', 'F', 'C', 'G']);
assert.deepStrictEqual(names('blues12', 4, 12), ['E7','E7','E7','E7','A7','A7','E7','E7','B7','A7','E7','B7']);
assert.deepStrictEqual(M.chordAt('ii5', 0, 1).pcs, [7, 11, 2, 5]);          // G7
const spb = 0.5;                                                              // BPM120
assert.strictEqual(M.stepShift(2, spb, 0, '8'), 0);                           // ストレート
assert.ok(Math.abs(0.25 + M.stepShift(2, spb, 100, '8') - 0.5 * 2 / 3) < 1e-9); // 完全なハネ=拍の2/3
assert.strictEqual(M.stepShift(0, spb, 100, '8'), 0);                         // 表拍は動かない
assert.ok(M.stepShift(1, spb, 100, '16') > 0 && M.stepShift(2, spb, 100, '16') === 0);
for (const b of Object.values(M.BS)) assert.ok(b(M.chordAt('pop4', 0, 0)).every(([s]) => s >= 0 && s < 16));
console.log('music OK');
// キーシャッフル: 周ごとにキーが変わり、カウントインは0周目
{ const M = require('../www/core/music.js'), kf = lap => [7, 2, 9][lap % 3];
  assert.deepStrictEqual(M.lapKey(-5, 4, 0, kf), { lap: 0, key: 7 }); assert.deepStrictEqual(M.lapKey(0, 4, 0, kf), { lap: 0, key: 7 });
  assert.strictEqual(M.lapKey(63, 4, 0, kf).lap, 0); assert.deepStrictEqual(M.lapKey(64, 4, 0, kf), { lap: 1, key: 2 }); assert.strictEqual(M.lapKey(64, 4, 5, null).key, 5); }
console.log('lapKey OK');
// コード別スケール提案(ii-V-I: ドリアン→ミクソリディアン→メジャー、主音はコードのルート)
{ const M2 = require('../www/core/music.js'), T2 = require('../www/core/theory.js'), a = require('assert');
  const r = [0, 1, 2].map(b => M2.chordScale('ii5', 0, b));
  a.deepStrictEqual(r.map(x => x.scale), ['dor', 'mix', 'maj']); a.deepStrictEqual(r.map(x => x.root), [2, 7, 0]);
  a.ok(M2.chordScale('ii5', 0, 0).name.startsWith('D '));
  for (const p of Object.keys(M2.PROGS)) for (let b = 0; b < M2.PROGS[p].c.length; b++) { const c = M2.chordScale(p, 5, b); a.ok(T2.SCALES[c.scale] && c.why, p + b); }
  a.strictEqual(M2.chordScale('blues12', 0, 4).scale, 'blues'); a.strictEqual(M2.chordScale('minor4', 0, 0).scale, 'nmin'); console.log('chordScale OK'); }
// 自作進行: 検証・登録・コード生成・スケール提案(新しいコード種も含む)
{ const M3 = require('../www/core/music.js'), a = require('assert');
  const ok = M3.setCustom({ u_a: { n: 'テスト', c: [[2, 'm7b5'], [7, '7'], [0, 'm'], [0, 'sus4']] }, u_bad: { n: 'x', c: [[12, 'M']] }, u_bad2: { n: 'y', c: [] }, x_other: { n: 'z', c: [[0, 'M']] } });
  a.deepStrictEqual(Object.keys(ok), ['u_a']); a.ok(M3.PROGS.u_a && !M3.PROGS.u_bad && !M3.PROGS.x_other);
  a.strictEqual(M3.chordAt('u_a', 0, 0).name, 'Dm7♭5'); a.strictEqual(M3.chordAt('u_a', 0, 3).name, 'Csus4');
  for (let b = 0; b < 4; b++) a.ok(M3.chordScale('u_a', 7, b).scale);
  a.deepStrictEqual(M3.setCustom({}), {}); a.ok(!M3.PROGS.u_a); console.log('custom prog OK'); }
