// 基礎練習メニューの譜面生成(純粋関数)。ブラウザとNode両対応。
// 音の項目: {s:弦の添字(0=最低音弦), f:フレット, fg:指番号(1〜4), art:'H'|'P', m:midi}
(function (root) {
  const TK = root.ADLTasks || require('./tasks.js');
  const DRILLS = [
    { id: 'chroma', n: 'クロマチック', desc: '1-2-3-4の指で、フレットを1つずつ。弦を順に移っていく。', opts: ['p', 'dir'] },
    { id: 'spider', n: 'スパイダー', desc: '指の順番を入れ替えて弾く。指の独立が鍛えられる。', opts: ['p', 'dir', 'pat'] },
    { id: 'alt', n: 'オルタネイト', desc: '1-2-3-4-4-3-2-1を、ダウン・アップを崩さずに弾く。', opts: ['p', 'dir'], pick: true },
    { id: 'scale3', n: 'スケール上下行(3音ずつ)', desc: '3音ずつ、1音ずらしながら上り、下る。スケールは練習タブの設定。', opts: [], scale: true },
    { id: 'scale4', n: 'スケール上下行(4音ずつ)', desc: '4音ずつ、1音ずらしながら上り、下る。スケールは練習タブの設定。', opts: [], scale: true },
    { id: 'strx', n: '弦移動', desc: '隣の弦と交互に弾く。ピックを持つ手の練習。', opts: ['p', 'dir', 'skip'] },
    { id: 'hp', n: 'ハンマリング・プルオフ', desc: '最初の1音だけ弾き、あとは左手だけ。H=ハンマリング、P=プルオフ。', opts: ['p', 'dir'] },
    { id: 'trill', n: 'トリル(2本の指の往復)', desc: '1-2、2-3、3-4の指で、同じ2音を往復。最初の1音だけ弾き、あとは左手だけ(H/P)。音の粒をそろえる。', opts: ['p', 'dir'] },
    { id: 'thirds', n: 'スケール3度跳び', desc: 'スケールを1音飛ばしで上り、下る(1-3、2-4、3-5…)。フレーズが「スケール順」から抜け出す練習。スケールは練習タブの設定。', opts: [], scale: true },
    { id: 'vib', n: 'ビブラート', desc: '同じ音を2拍のばして、指ごと弦をゆらす。ゆれの幅と速さをそろえる。まず薬指(3)から。ゆらしすぎて音程が上がりっぱなしにならないように。高音弦3本で練習。', opts: ['p', 'dir', 'fng'], grid: true, tech: true },
    { id: 'bend', n: 'チョーキング(ターゲット音つき)', desc: 'まず「ターゲット音」を聴き、同じ高さまで弦を押し上げる。1拍めのターゲットと、2拍のばした音を同じ音程にそろえる。薬指(3)で押し、人差し指・中指を添える。', opts: ['p', 'dir', 'fng', 'bt'], grid: true, tech: true },
    { id: 'bendrel', n: 'チョーク&リリース', desc: '弦を押し上げてのばし、ゆっくり元の音に戻す。戻すときも音程が止まらないように。', opts: ['p', 'dir', 'fng', 'bt'], grid: true, tech: true },
    { id: 'prebend', n: 'プリベンド', desc: '弾く前に弦を押し上げておき、弾いてからゆっくり元の高さに戻す。押し上げる量が毎回同じになるように。', opts: ['p', 'dir', 'fng', 'bt'], grid: true, tech: true },
    { id: 'bendvib', n: 'チョーキング+ビブラート', desc: '押し上げた音で、ビブラートをかける。ギターソロの泣きの基本。ターゲット音の高さを保ったままゆらす。', opts: ['p', 'dir', 'fng', 'bt'], grid: true, tech: true },
    { id: 'slide', n: 'スライド', desc: '指を離さず、同じ指でフレットを滑らせる。着いた音を押さえ直さない。下りも同じ指で。', opts: ['p', 'dir', 'sl'], grid: true, tech: true },
    { id: 'rhythm', n: 'リズム型', desc: 'スケールの音を、決まったリズムで弾く。16分刻みで進む。', opts: ['rhy'], scale: true, grid: true }
  ];
  const TECH = ['vib', 'bend', 'bendrel', 'prebend', 'bendvib', 'slide'], BTN = { 1: '半音', 2: '全音', 3: '1音半' };
  const PATS = [[1, 2, 3, 4], [1, 3, 2, 4], [1, 4, 2, 3], [1, 2, 4, 3], [2, 1, 4, 3]];
  const RHY = TK.RHY;
  const byId = Object.fromEntries(DRILLS.map(d => [d.id, d]));
  const order = (n, dir) => { const up = Array.from({ length: n }, (_, i) => i), dn = up.slice().reverse(); return dir === 'down' ? dn : dir === 'both' ? up.concat(dn) : up; };
  // 変種の音を、音の高さの順・同じ高さは低い弦を優先して並べる
  function notesOfVariant(v, strings) { const seen = new Set(), o = [];
    v.notes.map(q => ({ s: q.s, f: q.f, m: strings[q.s] + q.f })).sort((a, b) => a.m - b.m || a.s - b.s).forEach(q => { if (!seen.has(q.m)) { seen.add(q.m); o.push(q); } });
    return o; }
  const at = (strings, s, f, extra) => Object.assign({ s, f, m: strings[s] + f }, extra);
  // c={strings,p,dir,pat,skip,rhy,notes}
  function build(id, c) {
    const n = c.strings.length, p = c.p, mk = (s, k, extra) => at(c.strings, s, p + k - 1, Object.assign({ fg: k }, extra));
    const seq = []; let grid = null, unit = 0;
    if (id === 'chroma') order(n, c.dir).forEach(s => [1, 2, 3, 4].forEach(k => seq.push(mk(s, k))));
    else if (id === 'spider') order(n, c.dir).forEach(s => PATS[c.pat || 0].forEach(k => seq.push(mk(s, k))));
    else if (id === 'alt') order(n, c.dir).forEach(s => [1, 2, 3, 4, 4, 3, 2, 1].forEach(k => seq.push(mk(s, k))));
    else if (id === 'hp') order(n, c.dir).forEach(s => [[1, ''], [2, 'H'], [3, 'H'], [4, 'H'], [3, 'P'], [2, 'P'], [1, 'P']].forEach(([k, a]) => seq.push(mk(s, k, a ? { art: a } : {}))));
    else if (id === 'strx') { const gap = c.skip ? 2 : 1, ss = Array.from({ length: Math.max(0, n - gap) }, (_, i) => i), os = c.dir === 'down' ? ss.slice().reverse() : c.dir === 'both' ? ss.concat(ss.slice().reverse()) : ss;
      os.forEach(s => [1, 2, 3, 4].forEach(k => { seq.push(mk(s, k)); seq.push(mk(s + gap, k)); })); }
    else if (id === 'scale3' || id === 'scale4') { const g = id === 'scale3' ? 3 : 4, N = c.notes || [];
      if (N.length > g) { for (let i = 0; i + g <= N.length; i++) for (let j = 0; j < g; j++) seq.push(N[i + j]);
        for (let i = N.length - 1; i - g + 1 >= 0; i--) for (let j = 0; j < g; j++) seq.push(N[i - j]); } }
    else if (id === 'trill') order(n, c.dir).forEach(s => [[1, 2], [2, 3], [3, 4]].forEach(([a, b]) => { for (let i = 0; i < 8; i++) seq.push(mk(s, i % 2 ? b : a, i === 0 ? {} : { art: i % 2 ? 'H' : 'P' })); }));
    else if (id === 'thirds') { const N = c.notes || [];
      if (N.length > 3) { for (let i = 0; i + 2 < N.length; i++) { seq.push(N[i]); seq.push(N[i + 2]); } for (let i = N.length - 1; i >= 2; i--) { seq.push(N[i]); seq.push(N[i - 2]); } } }
    else if (TECH.includes(id)) { const m = Math.min(3, n), ts = order(m, c.dir).map(i => n - m + i), fng = c.fng || 3, bt = c.bt || 2, sl = c.sl || 3, f0 = Math.min(p + fng - 1, 15 - bt), P = (s, f, extra) => at(c.strings, s, f, extra);
      unit = 4;
      if (id === 'vib') { grid = 'x.......x.......'; ts.forEach(s => [0, 1].forEach(() => seq.push(P(s, Math.min(p + fng - 1, 15), { fg: fng, art: 'V', fx: { vib: 0.35 }, hold: 8, lbl: 'ビブラート' })))); }
      else if (id === 'prebend') { grid = 'x.......x.......'; ts.forEach(s => [0, 1].forEach(() => seq.push(P(s, f0, { fg: fng, art: 'PB', bt, fx: { pre: bt }, hold: 8, lbl: `プリベンド(${BTN[bt]}押し上げてから弾く→ゆっくり戻す)` })))); }
      else if (id === 'slide') { grid = 'x.......x.......'; const s0 = Math.min(p, 15 - sl);
        ts.forEach(s => { seq.push(P(s, s0, { fg: 1, art: 'S', fx: { slide: sl }, hold: 8, lbl: `スライドアップ(+${sl}フレット)` })); seq.push(P(s, s0 + sl, { fg: 1, art: 'S', fx: { slide: -sl }, hold: 8, lbl: `スライドダウン(−${sl}フレット)` })); }); }
      else { grid = 'x...x...........';   // チョーキング系: ターゲット音(1拍)→ベンド(2拍)
        const fx = id === 'bend' ? { bend: bt } : id === 'bendrel' ? { bend: bt, rel: true } : { bend: bt, vib: 0.4 }, lbl = { bend: 'チョーキング', bendrel: 'チョーク&リリース', bendvib: 'チョーキング+ビブラート' }[id] + `(${BTN[bt]})`;
        ts.forEach(s => { seq.push(P(s, f0 + bt, { art: 'T', hold: 4, lbl: 'ターゲット音(この高さまで上げる)' })); seq.push(P(s, f0, { fg: fng, art: 'B', bt, fx, hold: 8, lbl })); }); } }
    else if (id === 'rhythm') { const N = c.notes || []; N.forEach(q => seq.push(q)); for (let i = N.length - 2; i > 0; i--) seq.push(N[i]); grid = RHY[c.rhy || 0].g; unit = 4; }
    return { seq, grid, unit };
  }
  const bpmAt = (bars, o) => o.sb ? Math.min(o.max, o.bpm + Math.floor(bars / o.every) * o.add) : o.bpm;
  function markDone(rec, id, bpm, day) { const e = rec[id] = rec[id] || { n: 0, best: 0, sec: 0, last: '' }; e.n++; e.best = Math.max(e.best, bpm); e.last = day; return rec; }
  function addSec(rec, id, sec) { const e = rec[id] = rec[id] || { n: 0, best: 0, sec: 0, last: '' }; e.sec += sec; return rec; }
  const api = { BTN, TECH, DRILLS, PATS, RHY, byId, build, notesOfVariant, bpmAt, markDone, addSec };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLDrills = api;
})(this);
