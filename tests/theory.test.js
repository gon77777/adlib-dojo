const assert = require('assert');
const T = require('../www/core/theory.js');
const A = k => T.analyze(T.SCALES[k].iv);
assert.deepStrictEqual(A('dor').extra, [9]);                 // ドリアン=特徴音は6度
assert.deepStrictEqual(A('mix').extra, [10]);                // ミクソリディアン=♭7
assert.deepStrictEqual(A('blues').extra, [6]);               // ブルース=♭5
assert.strictEqual(A('mpent').quality, 'm7');
assert.deepStrictEqual(A('mpent').missing, [2, 8]);          // ペンタは2度と♭6を抜いた形
assert.deepStrictEqual(A('maj').avoid, [5]);                 // メジャーは4度が避けたい音
assert.deepStrictEqual(A('nmin').avoid, [8]);
assert.strictEqual(T.analyze([0, 1, 3, 5, 6, 8, 10]).extra.join(), '1,6');   // ロクリアン
assert.strictEqual(T.analyze([0, 2, 3, 5, 7, 8, 11]).extra.join(), '11');    // ハーモニックマイナー
assert.strictEqual(T.MODES.length, 7);
assert.deepStrictEqual(T.MODES.map(m => T.MAJ[m.from - 1]), [0, 2, 4, 5, 7, 9, 11]);
// 自作スケールでもポジションが作れる(例: ハーモニックマイナー、全音音階)
for (const iv of [[0,2,3,5,7,8,11], [0,2,4,6,8,10], [0,1,3,5,6,8,10]]) assert.ok(T.buildPositions(T.INSTR.guitar.strings, { iv }, 9, 22).length >= 6);
console.log('theory OK');
// 表記: Cキーで D♯ にならない(マイナー系は親メジャー側で♭表記)
{ const T2 = require('../www/core/theory.js'); const a = require('assert');
  a.strictEqual(T2.noteName(3, 0), 'E♭'); a.strictEqual(T2.noteName(3, 0, 'mpent'), 'E♭'); a.strictEqual(T2.noteName(10, 0, 'mpent'), 'B♭');
  a.strictEqual(T2.noteName(6, 4, 'mpent'), 'F♯'); a.strictEqual(T2.noteName(1, 4, 'mpent'), 'C♯'); a.strictEqual(T2.noteName(10, 2, 'mpent'), 'B♭'); console.log('spelling OK'); }
