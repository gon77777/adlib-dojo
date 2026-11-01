// 受け入れ基準: Cマイナーペンタ(標準チューニング)のポジションが添付図と一致する
const assert = require('assert');
const T = require('../www/core/theory.js');
const g = T.INSTR.guitar.strings;
const pos = T.buildPositions(g, T.SCALES.mpent, 0, 22);
const frets = (p, v = 0) => {
  const r = {};
  p.variants[v].notes.forEach(n => (r[n.s] = r[n.s] || []).push(n.f));
  return Object.values(r).map(a => a.sort((x, y) => x - y).join(','));
};
assert.strictEqual(pos.length, 5);
assert.deepStrictEqual(frets(pos[0]), ['8,11', '8,10', '8,10', '8,10', '8,11', '8,11']);
assert.deepStrictEqual(frets(pos[1]), ['11,13', '10,13', '10,13', '10,12', '11,13', '11,13']);
const bl = T.buildPositions(g, T.SCALES.blues, 0, 22);
assert.ok(bl[0].variants[0].notes.some(n => n.extra));
assert.strictEqual(T.buildPositions(T.INSTR.bass4.strings, T.SCALES.dor, 2, 20).length, 7);
console.log('positions OK');
// 12フレット以降の切り替え: すべてのポジションが低域/高域どちらかの表示範囲に完全に収まる
const G = T.INSTR.guitar;
const cases = Object.entries(T.INSTR).filter(([, i]) => i.strings).flatMap(([id, i]) => id === 'guitar'
  ? Object.entries(G.tunings).map(([t, st]) => [id + ':' + t, { frets: i.frets, strings: st }]) : [[id, i]]);
for (const [iid, inst] of cases) for (const [sid, sc] of Object.entries(T.SCALES)) for (let key = 0; key < 12; key++) {
  const lo = T.viewRange(inst, 'low'), hi = T.viewRange(inst, 'high');
  T.buildPositions(inst.strings, sc, key, inst.frets).forEach(p => {
    assert.ok(p.variants.length > 0, iid + sid + key);
    p.variants.forEach(v => assert.ok(T.fitsView(v, lo) || T.fitsView(v, hi), `${iid} ${sid} key${key} pos${p.no} ${v.lo}-${v.hi}`));
  });
}
assert.deepStrictEqual(T.viewRange(T.INSTR.guitar, 'high'), { a: 8, b: 22 });
console.log('view OK');
