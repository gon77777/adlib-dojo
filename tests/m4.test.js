const assert = require('assert');
const T = require('../www/core/theory.js'), K = require('../www/core/tasks.js'), S = require('../www/core/store.js');
// すべてのレベル×スケールで、例外なく文章が作れて、直前と同じお題が連続しない
for (let lv = 1; lv <= 5; lv++) for (const id of Object.keys(T.SCALES)) {
  let last = null;
  for (let i = 0; i < 30; i++) {
    const t = K.pick({ lv, sc: T.SCALES[id], scId: id, key: 4, posNo: 1 + i % 5, nPos: 5 }, last);
    assert.ok(t.text.length > 5 && !/undefined|NaN/.test(t.text), id + ' ' + t.text);
    if (t.grid) assert.strictEqual(t.grid.length, 16);
    if (i) assert.notStrictEqual(t.id, last); last = t.id;
  }
}
assert.ok(K.pick({ lv: 5, sc: T.SCALES.dor, key: 2, posNo: 1, nPos: 7, rnd: () => 0.5 }, null).text.length > 0);
// 記録
const d = (s) => new Date(s + 'T12:00:00');
const log = { '2026-10-30': 60, '2026-10-31': 120, '2026-11-01': 30 };
assert.strictEqual(S.streak(log, d('2026-11-01')), 3);
assert.strictEqual(S.streak({ '2026-10-31': 5 }, d('2026-11-01')), 1);   // 今日まだでも昨日から数える
assert.strictEqual(S.streak({ '2026-10-29': 5 }, d('2026-11-01')), 0);
assert.strictEqual(S.lastDays(log, d('2026-11-01'), 7).length, 7);
const done = {}; S.markDone(done, 1, 'mpent', 1); S.markDone(done, 1, 'mpent', 2); S.markDone(done, 1, 'mpent', 1);
assert.strictEqual(S.doneCount(done, 1, 'mpent'), 2);
const back = S.importAll(S.exportAll(log, done, { dor: 2 }));
assert.deepStrictEqual(back.weak, { dor: 2 });
assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {}, { a: { n: 1 } })).fq, { a: { n: 1 } }); assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {})).fq, {});
assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {}, {}, { hp: { n: 1 } })).dr, { hp: { n: 1 } }); assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {})).dr, {});
assert.throws(() => S.importAll('{"v":2}'));
console.log('m4 OK');
assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {}, {}, {}, { mine: [1] })).ph, { mine: [1] }); assert.deepStrictEqual(S.importAll(S.exportAll(log, done, {})).ph, {});
// お題の指板連動: n2/root/end/appr/char は hl(度数)を返し、すべてスケール内
{ const T2 = require('../www/core/theory.js'), K2 = require('../www/core/tasks.js'); let seen = new Set();
  for (const id of Object.keys(T2.SCALES)) for (let lv = 1; lv <= 5; lv++) for (let i = 0; i < 40; i++) {
    const t = K2.pick({ lv, sc: T2.SCALES[id], scId: id, key: 0, posNo: 1, nPos: 5 }, null);
    if (t.hl) { seen.add(t.id); assert.ok(t.hl.every(d => T2.SCALES[id].iv.includes(d)), t.id + ' hl'); if (t.id === 'n2') assert.ok(t.solo && t.hl.length === 2); } }
  assert.ok(['n2', 'root', 'end', 'appr', 'char'].every(x => seen.has(x)), [...seen].join()); console.log('task hl OK'); }
// バックアップに設定(自作進行・音量)を含める。古い書き出し(stなし)も読める
{ const S2 = require('../www/core/store.js'), a2 = require('assert'), st = { key: 4, cp: { u_x: { n: '自作', c: [[0, 'M']] } }, bk: { vol: { band: 0.5, phrase: 0.7 } } };
  a2.deepStrictEqual(S2.importAll(S2.exportAll({}, {}, {}, {}, {}, {}, st)).st, st); a2.deepStrictEqual(S2.importAll(S2.exportAll({}, {}, {})).st, {});
  a2.deepStrictEqual(S2.importAll('{"v":1,"log":{},"done":{},"weak":{},"st":[1]}').st, {}); console.log('backup settings OK'); }
