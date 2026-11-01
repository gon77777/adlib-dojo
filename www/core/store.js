// 記録(仕様書 4.7 / 14)。純粋関数+localStorage。
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addTime = (log, day, sec) => { log[day] = (log[day] || 0) + sec; return log; };
  function streak(log, today) { let n = 0; const d = new Date(today);
    if (!(log[dayKey(d)] > 0)) d.setDate(d.getDate() - 1);          // 今日まだ練習していなければ昨日から数える
    while (log[dayKey(d)] > 0) { n++; d.setDate(d.getDate() - 1); } return n; }
  function lastDays(log, today, n) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); out.push({ day: dayKey(d), dow: d.getDay(), sec: log[dayKey(d)] || 0 }); } return out; }
  function markDone(done, lv, scale, pos) { ((done[lv] = done[lv] || {})[scale] = done[lv][scale] || {})[pos] = Date.now(); return done; }
  const doneCount = (done, lv, scale) => Object.keys(((done[lv] || {})[scale]) || {}).length;
  const markWeak = (weak, scale) => { weak[scale] = (weak[scale] || 0) + 1; return weak; };
  const weakTop = (weak, n) => Object.entries(weak).sort((a, b) => b[1] - a[1]).slice(0, n);
  const exportAll = (log, done, weak, fq, dr, ph, st) => JSON.stringify({ v: 1, log, done, weak, fq: fq || {}, dr: dr || {}, ph: ph || {}, st: st || {} });   // st=アプリ設定(自作進行・音量・キー・スケールなど)
  function importAll(text) { const o = JSON.parse(text);
    if (!o || o.v !== 1 || typeof o.log !== 'object' || typeof o.done !== 'object' || typeof o.weak !== 'object') throw new Error('形式が違います');
    return { log: o.log, done: o.done, weak: o.weak, fq: (o.fq && typeof o.fq === 'object') ? o.fq : {}, dr: (o.dr && typeof o.dr === 'object') ? o.dr : {}, ph: (o.ph && typeof o.ph === 'object' && !Array.isArray(o.ph)) ? o.ph : {}, st: (o.st && typeof o.st === 'object' && !Array.isArray(o.st)) ? o.st : {} }; }
  const load = (k, d) => { try { return JSON.parse(root.localStorage.getItem('adl_' + k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { root.localStorage.setItem('adl_' + k, JSON.stringify(v)); } catch (e) {} };
  const api = { dayKey, addTime, streak, lastDays, markDone, doneCount, markWeak, weakTop, exportAll, importAll, load, save };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLStore = api;
})(this);
