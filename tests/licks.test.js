const assert = require('assert');
const T = require('../www/core/theory.js'), P = require('../www/core/phrase.js'), K = require('../www/data/licks.js');
assert.strictEqual(K.LIST.length, 47); assert.strictEqual(new Set(K.LIST.map(x => x.id)).size, 47);
for (const l of K.LIST) {
  const sc = T.SCALES[l.sc], it = K.items(l);
  assert.ok(it.every(n => n.st >= 0 && n.len > 0 && n.st + n.len <= l.bars * 16), l.id);
  assert.ok(it.every((n, i) => !i || n.st >= it[i - 1].st + it[i - 1].len), l.id + ' 重なり');
  assert.ok(it.every(n => sc.iv.includes(T.pc(n.r))), l.id + ' スケール外');
  for (const inst of ['guitar', 'bass4', 'bass5']) for (let k = 0; k < 12; k++) {
    const I = T.INSTR[inst], ns = P.place(it, k, I.strings, I.frets);
    assert.ok(ns.every(n => n.s >= 0 && I.strings[n.s] + n.f === n.p), `${l.id} ${inst} key${k}`);
    assert.deepStrictEqual(ns.map(n => n.p - ns[0].p), it.map(n => n.r - it[0].r)); }
}
assert.ok(K.forScale('blues').some(x => x.sc === 'mpent') && K.forScale('Mpent').every(x => x.sc === 'Mpent'));
assert.ok(['mpent', 'blues', 'Mpent'].every(g => K.LIST.filter(x => x.sc === g).length >= 8));
console.log('licks OK (' + K.LIST.length + ')');
