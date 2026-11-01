// 教本のデータ登録と検証(仕様書 12.5)。データ駆動: data/*.js に1項目足すだけで増える。
(function (root) {
  const items = {}, chapters = [];
  const REQ = { rule: ['what', 'how', 'ex', 'task'], thought: ['do', 'why', 'ex'], tech: ['cat', 'how', 'use', 'warn', 'hear', 'ph', 'diff'], guide: ['body'] };
  const add = (k, id, n, o) => { if (items[id]) throw new Error('重複: ' + id); items[id] = Object.assign({ k, id, n }, o); };
  function validate() {
    const e = [];
    Object.values(items).forEach(it => REQ[it.k].forEach(f => { const v = it[f];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) e.push(`${it.id}: ${f} が空`); }));
    chapters.forEach(c => (c.ids || []).forEach(id => { if (!items[id]) e.push(`章${c.id}: ${id} が存在しない`); }));
    return e;
  }
  const list = c => c.ids ? c.ids.map(id => items[id]).filter(Boolean) : Object.values(items).filter(i => i.k === c.kind);
  const api = { items, chapters, list, validate,
    RL: (id, n, o) => add('rule', id, n, o), KG: (id, n, o) => add('thought', id, n, o),
    TQ: (id, n, yomi, o) => add('tech', id, n, Object.assign({ yomi }, o)), GD: (id, n, body) => add('guide', id, n, { body }),
    LS: (id, n, spec) => chapters.push(Object.assign({ id, n }, spec)) };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLBook = api;
})(this);
