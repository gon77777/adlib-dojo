const assert = require('assert');
const B = require('../www/core/book.js');
['rules', 'thoughts', 'guides', 'tech', 'tech2', 'lessons'].forEach(f => require('../www/data/' + f + '.js'));
assert.deepStrictEqual(B.validate(), []);
for (let i = 1; i <= 20; i++) assert.ok(B.items['R' + i], 'R' + i);
for (let i = 1; i <= 12; i++) assert.ok(B.items['K' + i], 'K' + i);
// お題が参照するルールIDがすべて存在する
require('../www/core/tasks.js').TK.forEach(t => (t.rid || []).forEach(r => assert.ok(B.items[r], t.id + ' -> ' + r)));
assert.ok(Object.values(B.items).filter(i => i.k === 'tech').length >= 30);
console.log('book OK (' + Object.keys(B.items).length + ' items)');
