// フレーズタブ(ビルダー・変形・お手本リック・書き出し)。init(ctx) で index.html の状態(S,B等)を受け取る。
(function (root) {
  const T = root.ADL, P = root.ADLPhrase, ST = root.ADLStore, LK = root.ADLLicks, $ = s => document.querySelector(s);
  let C = null, D = null, playSt = -1, curId = -1, cursor = 0, undo = [], timers = [], msgT = '', liveBar = -1, liveKey = null, shownKey = null;
  const clone = x => JSON.parse(JSON.stringify(x)), bySt = (a, b) => a.st - b.st;
  const LENS = [[1, '16分'], [2, '8分'], [3, '付点8'], [4, '4分'], [6, '付点4'], [8, '2分'], [16, '全']];
  const MLENS = [[0, '自動'], [4, '1拍'], [8, '2拍'], [16, '1小節'], [32, '2小節']];
  const seg = (id, list, cur) => `<span class="seg" id="${id}">${list.map(([k, n]) => `<button data-v="${k}" aria-pressed="${String(k) === String(cur)}">${n}</button>`).join('')}</span>`;
  const total = () => D.cur.bars * 16, save = () => ST.save('phrase', D), live = () => !$('#pg-h').hidden;
  const key0 = () => D.cur.key == null ? C.S.key : D.cur.key;

  function env(k, scId) {
    const S = C.S, kk = k == null ? S.key : k, name = T.INSTR[S.inst].keys ? 'guitar' : S.inst, I = T.INSTR[name];
    if (name === 'guitar') I.strings = I.tunings[S.tuning] || I.tunings.std;
    const sc = T.SCALES[scId || S.scale], pos = T.buildPositions(I.strings, sc, kk, I.frets); let variant = null;
    if (S.sel > 0 && pos[S.sel - 1]) { const r = T.viewRange(I, S.view), vs = pos[S.sel - 1].variants; variant = vs.find(v => T.fitsView(v, r)) || vs[0] || null; }
    return { name, I, strings: I.strings, maxFret: I.frets, sc, iv: sc.iv, pos, variant };
  }
  // 再生中(キーシャッフル含む)は、フレーズを「いまのキー」に置き直した音を表示・発音に使う(保存データD.curは変えない)
  let nfMemo = null;
  const running = () => !!(root.ADLEngine && root.ADLEngine.running);
  function notesFor(key) {
    const c = D.cur; if (!c.notes.length || c.key == null || c.key === key) return c.notes;
    const S = C.S, m = nfMemo;
    if (m && m.src === c.notes && m.ck === c.key && m.key === key && m.sel === S.sel && m.view === S.view && m.sc === S.scale && m.tun === S.tuning && m.inst === S.inst) return m.res;
    const e = env(key), res = P.rekey(c.notes, c.key, key, e.strings, e.maxFret, e.variant).filter(n => n.s >= 0);
    nfMemo = { src: c.notes, ck: c.key, key, sel: S.sel, view: S.view, sc: S.scale, tun: S.tuning, inst: S.inst, res }; return res;
  }
  let lf = 0;   // お手本リックの難易度フィルタ(0=全て)
  const msg = t => { msgT = t; const m = $('#h-msg'); if (m) m.textContent = t; };
  function setNotes(list, keepUndo) {
    if (!keepUndo) { undo.push(clone(D.cur.notes)); if (undo.length > 30) undo.shift(); }
    D.cur.notes = list.filter(n => n.s >= 0 && n.st < total()).sort(bySt).map(n => ({ st: n.st, len: n.len, p: n.p, s: n.s, f: n.f }));
    if (D.cur.notes.length && D.cur.key == null) D.cur.key = C.S.key;
    save(); render();
  }
  function rekeyCur() {
    if (D.cur.key == null || D.cur.key === C.S.key) { return; }
    const e = env(); D.cur.notes = D.cur.notes.length ? P.rekey(D.cur.notes, D.cur.key, C.S.key, e.strings, e.maxFret, e.variant).filter(n => n.s >= 0) : []; D.cur.key = C.S.key; save();
  }
  function setKey(k) { C.S.key = k; document.querySelector('#key').value = k; rekeyCur(); C.draw(); render(); }

  // ---- 指板 ----
  function drawFret() {
    const e = env(), S = C.S, ns = running() && live() ? notesFor(S.key) : D.cur.notes, lab = P.degLabels(ns, running() && live() ? S.key : key0()), mx = Math.max(0, ...ns.map(n => n.f)), mn = Math.min(99, ...ns.map(n => n.f));
    const view = !ns.length ? S.view : mx <= 15 ? 'low' : mn >= e.I.frets - 14 ? 'high' : S.view;
    const cur = ns.find(n => n.st <= playSt && playSt < n.st + n.len);
    curId = cur ? cur.st : -1;
    const vr = T.viewRange(e.I, D.sec === 'guide' ? S.view : view);
    // コード別スケール追従(バッキングタブの設定と共通): いまのコードのルート・スケールで指板を出し、フレーズの度数もそのルート基準に読み替える
    const AS = D.sec !== 'guide' && C.B.autoSc && C.autoInfo ? C.autoInfo() : null, ea = AS ? env(AS.root, AS.scale) : e;
    const sel = D.sec === 'guide' ? 0 : Math.min(S.sel, ea.pos.length), lb = AS ? ns.map(n => T.DEG[T.pc(n.p - AS.root)]) : lab;
    ADLFret.render($('#h-fret'), { inst: e.name, scale: AS ? AS.scale : S.scale, key: AS ? AS.root : S.key, positions: ea.pos, sel, mode: S.mode, left: S.left, view: vr,
      over: D.sec === 'guide' ? gtOver(e, vr) : ns.map((n, i) => ({ s: n.s, f: n.f, cls: 'ph' + (cur && cur.st === n.st ? ' cur' : ''), label: lb[i] })) });
    { const fr = $('#h-fret'), sg = [e.name, S.scale, S.key, sel, S.view, AS && AS.root].join(), fm = fr.querySelector('.frame'); if (fm && sg !== fr._sg) { const r = fm.getBoundingClientRect(), c = fr.getBoundingClientRect(); fr.scrollLeft += r.left + r.width / 2 - (c.left + c.width / 2); } fr._sg = sg; }
    const inf = $('#h-asi'); if (inf) inf.textContent = AS ? `いまのコード ${AS.chord} → ${AS.name}(${AS.why})` : (C.B.autoSc ? '再生するか、バッキングタブで和音をタップすると、コード別スケールに追従します。' : '');
  }
  // ---- 格子 ----
  function gridHtml() {
    const u = D.unit, per = 16 / u, ns = D.cur.notes, lab = P.degLabels(ns, key0()); let h = '';
    for (let b = 0; b < D.cur.bars; b++) { h += `<div class="gr2"><i>${b + 1}</i>`;
      for (let c = 0; c < per; c++) { const st = b * 16 + c * u, i = ns.findIndex(n => n.st === st), sus = ns.some(n => n.st < st && st < n.st + n.len);
        h += `<button class="gc${i >= 0 ? ' on' : sus ? ' sus' : ''}${st === cursor ? ' cu' : ''}${(c * u) % 4 === 0 ? ' bt' : ''}${playSt >= st && playSt < st + u ? ' pl' : ''}" data-st="${st}">${i >= 0 ? lab[i] : sus ? '–' : ''}</button>`; }
      h += '</div>'; }
    return h;
  }
  const degText = () => P.degLabels(D.cur.notes, key0()).join(' ') || '(まだ音がありません。指板をタップして置く)';
  function listHtml(sec) {
    if (sec === 'build') return `<div class="row2">長さ ${seg('h-len', LENS, D.len)}<button class="go" data-a="rest">休符</button><button class="go" data-a="undo">↶戻す</button><button class="go" data-a="clear">全部消す</button></div>
      <div class="row2"><input id="h-name" placeholder="名前" value="${D.name || ''}" style="min-height:40px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:0 10px"><button class="go" data-a="save">自分のリックに保存</button><button class="go" data-a="exp">書き出し</button></div>
      <div id="h-mine">${mineHtml()}</div>`;
    if (sec === 'xform') return xformHtml() + '<small>モチーフ=最初のまとまり。「繰り返す」は小節数いっぱいに並べます。</small>';
    if (sec === 'guide') return guideHtml();
    if (sec === 'wiz') return wizHtml();
    return lickHtml();
  }
  const mineHtml = () => D.mine.length ? '<small>自分のリック</small>' + D.mine.map((m, i) => `<div class="wk2"><span>${m.name}<small> ${m.bars}小節・${m.sc}</small></span><span><button class="go" data-a="mload" data-i="${i}">呼ぶ</button><button class="go" data-a="mdel" data-i="${i}">消す</button></span></div>`).join('') : '<small>保存したリックはまだありません</small>';
  function xformHtml() {
    return `<div class="row2">モチーフ長 ${seg('h-ml', MLENS, D.mlen)}</div><div class="row2 xf">
      <button class="go" data-x="rep">繰り返す</button><button class="go" data-x="up">1つ上へずらす</button><button class="go" data-x="dn">1つ下へずらす</button><button class="go" data-x="up2">2つ上へ</button><button class="go" data-x="dn2">2つ下へ</button>
      <button class="go" data-x="sync">リズム:裏にずらす</button><button class="go" data-x="tight">リズム:詰める</button><button class="go" data-x="wide">リズム:広げる</button><button class="go" data-x="new">リズム:別の型</button>
      <button class="go" data-x="end">最後だけ変える</button><button class="go" data-x="pos">別ポジションに移す</button><button class="go" data-a="undo">↶戻す</button></div>`;
  }
  function lickHtml() {
    const all = LK.forScale(C.S.scale), list = lf ? all.filter(x => x.lv === lf) : all, l = D.lick ? LK.byId[D.lick] : null, pr = D.prog;
    let h = `<div class="row2" id="h-lf">${['全て', '初級', '中級', '上級'].map((n, i) => `<button class="go" data-lf="${i}" aria-pressed="${i === lf}">${n}</button>`).join('')}</div><div class="lks">${list.map(x => `<button class="lk" data-lick="${x.id}" aria-pressed="${x.id === D.lick}">${x.n}<small>${LK.LV[x.lv]}・${'●'.repeat(pr[x.id] || 0)}${'○'.repeat(3 - (pr[x.id] || 0))}</small></button>`).join('')}</div>`;
    if (!l) return h + '<small>リックを選ぶと、いまのキー・ポジションに合わせて指板に出ます。</small>';
    const st = D.step, hint = [`指板の青い音を、バッキングに合わせて<b>そのまま</b>弾く。度数: ${degText()}`, 'お手本を<b>1か所だけ</b>変える(下のボタン)。変えたら「お手本に戻す」と聞き比べる。', '名前をつけて保存。キーを変えても弾けるか試す。'][st];
    h += `<div class="lkd"><b>${l.n}</b> <small>${l.tip}</small><div class="seg" id="h-st">${LK.STAGES.map((n, i) => `<button data-v="${i}" aria-pressed="${i === st}">${n}</button>`).join('')}</div><p>${hint}</p>`;
    if (st === 1) h += xformHtml() + '<div class="row2"><button class="go" data-a="reset">お手本に戻す</button></div>';
    if (st === 2) h += `<div class="row2"><input id="h-name" placeholder="名前" value="${D.name || l.n + '(改)'}" style="min-height:40px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:0 10px"><button class="go" data-a="save">自分のリックに保存</button><button class="go" data-a="rkey">キーを変えて弾く</button></div>`;
    return h + `<div class="row2"><button class="go" data-a="next">${st < 2 ? '弾けた → 次の段階へ' : '自分のものにした ✓'}</button></div></div>`;
  }
  // ---- ガイドトーン ----
  function gtInfo() { const run = root.ADLEngine && root.ADLEngine.running, key = run && liveKey != null ? liveKey : C.S.key, prog = C.B.prog, n = C.MU.PROGS[prog].c.length;
    return { key, prog, n, bar: run && liveBar >= 0 ? liveBar : Math.min(D.gbar || 0, n - 1) }; }
  function gtOver(e, vr) {
    const g = gtInfo(), over = [], add = (pc, cls, label) => P.locate(e.strings, [pc], vr.a, vr.b).forEach(q => over.push({ s: q.s, f: q.f, cls, label }));
    const nx = (g.bar + 1) % g.n;
    if (D.gm === 'line') { const L = P.guideLine(g.prog, g.key); add(L[nx].pc, 'gtn', L[nx].deg); add(L[g.bar].pc, 'gt3', L[g.bar].deg); }
    else { P.guide(g.prog, g.key, nx).tones.forEach(t => add(t.pc, 'gtn', t.deg)); P.guide(g.prog, g.key, g.bar).tones.forEach((t, i) => add(t.pc, i ? 'gt7' : 'gt3', t.deg)); }
    return over;
  }
  function guideHtml() {
    const g = gtInfo(), nm = pc => T.noteName(pc, g.key), cur = P.guide(g.prog, g.key, g.bar), nxt = P.guide(g.prog, g.key, (g.bar + 1) % g.n), L = P.guideLine(g.prog, g.key);
    const mv = m => m === 0 ? '同じ音' : m > 0 ? '半音上' : '半音下';
    const lk = P.links(g.prog, g.key, g.bar).filter(l => Math.abs(l.move) <= 1).map(l => `<li>${cur.name}の${l.from.role}(${nm(l.from.pc)}) → ${nxt.name}の${l.to.role}(${nm(l.to.pc)}):<b>${mv(l.move)}</b></li>`).join('');
    return `<div class="row2">${Array.from({ length: g.n }, (_, b) => `<button class="go" data-gbar="${b}" aria-pressed="${b === g.bar}">${P.guide(g.prog, g.key, b).name}</button>`).join('')}</div>
      <div class="row2">表示 ${seg('h-gm', [['all', '3度と7度'], ['line', 'つなぐ線']], D.gm)} 範囲 ${seg('h-vw', [['low', '0〜15'], ['high', '8〜']], C.S.view)}</div>
      <div class="lkd"><b>${cur.name}</b>:${cur.tones.map(t => `${t.role}=${t.deg}(${nm(t.pc)})`).join(' / ')}<br><small>ピンク=3度、青緑=7度(7thでなければ5度)、白い点線=次のコードの狙い音</small>
      <ul>${lk || '<li>半音以内でつながる音はありません(全音以上の動き)</li>'}</ul>
      <p>つなぐ線(1コード1音): ${L.map(x => `${x.name}:${nm(x.pc)}${x.deg}`).join(' → ')} →(最初へ)</p>
      <p><b>練習</b>:バッキングを流し、コードが変わる<b>瞬間</b>に狙い音を弾く。次のコードに変わったら、半音で近い狙い音へ動く。慣れたら、その音から3〜4音のフレーズを足す。</p></div>`;
  }
  // ---- 4小節フレーズ作成ウィザード ----
  const WZN = ['リズムを決める', '使う音を絞る', '終わりの音を決める', '弾く'];
  const patStr = id => { const p = LKR(id), a = Array(16).fill('・'); p.forEach(([st]) => a[st] = '■'); return a.join('').replace(/(.{4})/g, '$1 '); };
  const LKR = id => P.RH.find(x => x.id === id).p;
  function wizHtml() {
    const w = D.wz, e = env(), iv = e.iv, nm = d => T.noteName(C.S.key + d, C.S.key, C.S.scale) + '(' + T.DEG[d] + ')', done = i => i < w.step;
    const sum = ['' + P.RH.find(x => x.id === w.rh).n, w.semis.map(d => T.DEG[d]).join(' '), T.DEG[w.end], ''];
    const body = [
      `<div class="lks">${P.RH.map(r => `<button class="lk" data-wz="rh" data-v="${r.id}" aria-pressed="${r.id === w.rh}">${r.n}<small style="display:block;font-family:monospace">${patStr(r.id)}</small></button>`).join('')}</div><small>1小節のリズム。1〜3小節目はこの型、4小節目は前半だけで最後の音を長く伸ばします。</small>`,
      `<div class="lks">${iv.map(d => `<button class="lk" data-wz="semi" data-v="${d}" aria-pressed="${w.semis.includes(d)}">${nm(d)}</button>`).join('')}</div><div class="row2"><button class="go" data-wz="p3">おすすめ3音(ルート・3度・5度)</button><button class="go" data-wz="pall">スケール全部</button></div><small>2〜4音に絞るほど、まとまって聞こえます。</small>`,
      `<div class="lks">${[...new Set(w.semis)].sort((a, b) => a - b).map(d => `<button class="lk" data-wz="end" data-v="${d}" aria-pressed="${d === w.end}">${nm(d)}</button>`).join('')}</div><small>ルートは最も安定、3度は明るい/暗い色がはっきり、5度は余韻が残ります。</small>`,
      `<div class="row2"><button class="go" data-wz="gen" style="background:var(--root);color:#241503;font-weight:700">${D.wzMade ? 'もう一度作る' : 'フレーズを作る'}</button></div><small>できたら上の「▶ 伴奏と一緒に」で弾く。気に入ったら「ビルダー」で保存・書き出し、「変形」でもう一工夫。</small>`];
    return `<div class="wz">${WZN.map((n, i) => `<div class="wzs${i === w.step ? ' on' : ''}"><button class="go" data-wz="go" data-v="${i}">${done(i) ? '✓ ' : ''}${i + 1}. ${n}${i !== w.step && sum[i] ? ' <small>' + sum[i] + '</small>' : ''}</button>${i === w.step ? '<div>' + body[i] + `<div class="row2">${i ? '<button class="go" data-wz="go" data-v="' + (i - 1) + '">← 戻る</button>' : ''}${i < 3 ? '<button class="go" data-wz="go" data-v="' + (i + 1) + '">次へ →</button>' : ''}</div></div>` : ''}</div>`).join('')}</div>`;
  }
  function wzGen() {
    const w = D.wz; if (!w.semis.length) return msg('使う音を1つ以上選んでください'); if (!w.semis.includes(w.end)) w.semis.push(w.end);
    loadItems(P.wizard({ rhythm: w.rh, semis: w.semis.slice(), end: w.end, bars: 4 }), 4); D.wzMade = true; D.name = 'ウィザード作'; save(); render(); msg('作りました。▶で聴いてみる'); if (!root.ADLEngine.running) solo();
  }
  function render() {
    const S = C.S, e = env(), sc = Object.entries(T.SCALES);
    $('#ph').innerHTML = `<div class="stick"><div id="h-fret"></div><div class="zm"><button data-z="out" aria-label="縮小">－</button><button data-z="fit" aria-label="全体">全</button><button data-z="in" aria-label="拡大">＋</button></div><div class="posrow"><span class="lb">ポジション</span>${seg('h-pos', ['全', ...e.pos.map(p => p.no)].map((l, i) => [i, l]), S.sel)}</div><div class="row2 trp"><button class="go" id="h-bk" data-a="bk">${root.ADLEngine && root.ADLEngine.running ? '■ 停止' : '▶ 伴奏と一緒に'}</button><button class="go" data-a="solo">♪ 音だけ</button></div></div>
      <div class="degr"><b id="h-deg">${degText()}</b></div>
      <div class="grid2"><label>キー<select id="h-key">${T.NOTE_S.map((n, i) => `<option value="${i}"${i === S.key ? ' selected' : ''}>${T.NOTE_S[i] === T.NOTE_F[i] ? n : n + '/' + T.NOTE_F[i]}</option>`).join('')}</select></label><label>スケール<select id="h-sc">${sc.map(([k, v]) => `<option value="${k}"${k === S.scale ? ' selected' : ''}>${v.n}</option>`).join('')}</select></label><label>進行<select id="h-prog">${Object.entries(C.MU.PROGS).map(([k, v]) => `<option value="${k}"${k === C.B.prog ? ' selected' : ''}>${v.n}</option>`).join('')}</select></label><label>BPM<span class="row"><input type="range" id="h-bpm" min="40" max="200" value="${C.B.bpm}"><b id="h-bpmv">${C.B.bpm}</b></span></label></div>
      <label class="asc"><input type="checkbox" id="h-asc"${C.B.autoSc ? ' checked' : ''}> コードごとにスケール追従</label><small id="h-asi"></small><small id="h-asi" class="asi"></small>
      <div class="hsec">${seg('h-sec', [['build', 'ビルダー'], ['xform', '変形'], ['lick', 'お手本'], ['guide', 'ガイドトーン'], ['wiz', 'ウィザード']], D.sec)}</div>
      <div id="h-grid">${gridHtml()}</div>
      <div class="row2"><small id="h-msg">${msgT}</small></div><div class="hpanel">${listHtml(D.sec)}</div>
      <details class="card" id="h-opt"><summary>小節・格子・音量</summary><div class="optb"><label>小節${seg('h-bars', [[1, '1'], [2, '2'], [4, '4']], D.cur.bars)}</label><label>格子${seg('h-unit', [[2, '8分'], [1, '16分']], D.unit)}</label><label>伴奏音量<span class="row"><input type="range" id="h-vband" min="0" max="100" value="${Math.round(C.B.vol.band * 100)}"></span></label><label>フレーズ音量<span class="row"><input type="range" id="h-vphrase" min="0" max="100" value="${Math.round(C.B.vol.phrase * 100)}"></span></label></div></details>
      <pre id="h-exp" hidden></pre>`;
    drawFret();
  }
  // ---- 再生 ----
  function soloStop() { timers.forEach(clearTimeout); timers = []; root.ADLAudio.panic(); setPlay(-1); }
  function solo() {
    if (!D.cur.notes.length) return msg('先に音を置いてください');
    if (root.ADLEngine.running) return msg('バッキング再生中は停止してから');
    soloStop(); const A = root.ADLAudio, c = A.resume(); A.gate(1); const t0 = c.currentTime + 0.1, sx = 60 / C.B.bpm / 4;
    D.cur.notes.forEach(n => { A.playAt(n.p, t0 + n.st * sx, 0.85, 'phrase', Math.max(0.1, n.len * sx * 0.95)); timers.push(setTimeout(() => setPlay(n.st), 100 + n.st * sx * 1000)); });
    timers.push(setTimeout(() => setPlay(-1), 150 + total() * sx * 1000));
  }
  function setPlay(x) {
    playSt = x; if (!live()) return;
    document.querySelectorAll('#h-grid .gc').forEach(b => { const st = +b.dataset.st; b.classList.toggle('pl', x >= st && x < st + D.unit); });
    const n = D.cur.notes.find(q => q.st <= x && x < q.st + q.len), id = n ? n.st : -1; if (id !== curId) drawFret();
  }
  const hook = P.makeHook(key => live() && D && D.cur.key != null ? { bars: D.cur.bars, key, notes: notesFor(key) } : null);
  function onStep(ev) {
    if (!D) return; const b = $('#h-bk'); if (b) b.textContent = ev.stop ? '▶ 伴奏と一緒に' : '■ 停止';
    if (ev.stop) { liveBar = -1; liveKey = null; shownKey = null; Promise.resolve().then(() => { if (live()) drawFret(); }); if (D.sec === 'guide' && live()) render(); return setPlay(-1); }
    if (ev.key != null && ev.key !== shownKey) { shownKey = ev.key; Promise.resolve().then(() => { if (live() && D.sec !== 'guide') drawFret(); }); }   // キーが変わったら指板のフレーズも追従
    if (ev.bar >= 0 && ev.bar !== liveBar) { liveBar = ev.bar; liveKey = ev.key; if (D.sec === 'guide' && live()) Promise.resolve().then(render); else if (C.B.autoSc && live()) Promise.resolve().then(drawFret); }
    if (ev.step >= 0) setPlay(ev.step % total());
  }
  // ---- 操作 ----
  function addNote(s, f) {
    const e = env(), p = e.strings[s] + f, t = total(), u = D.unit; let st = Math.min(cursor, t - 1), len = D.len; st = Math.floor(st / u) * u;
    const rest = D.cur.notes.filter(n => n.st !== st).map(n => (n.st < st && n.st + n.len > st) ? { ...n, len: st - n.st } : n);
    const nx = rest.filter(n => n.st > st).map(n => n.st); len = Math.max(1, Math.min(len, t - st, nx.length ? Math.min(...nx) - st : 99));
    setNotes([...rest, { st, len, p, s, f }]); cursor = Math.min(Math.ceil((st + len) / u) * u, t - u); render();
  }
  function xf(kind) {
    const e = env(), t = total(), ns = D.cur.notes.map(n => ({ st: n.st, len: n.len, p: n.p })); if (!ns.length) return msg('先に音を置いてください');
    let out; const ml = D.mlen || undefined;
    if (kind === 'pos') { S_sel(e); const e2 = env(); setNotes(P.place(P.rels(ns, key0()), C.S.key, e2.strings, e2.maxFret, e2.variant)); C.draw(); return finish('ポジション' + C.S.sel + 'に移しました'); }
    if (kind === 'rep') out = P.repeat(ns, t, ml); else if (kind === 'end') out = P.changeEnd(ns, e.iv, C.S.key);
    else if (kind[0] === 'u' || kind[0] === 'd') out = P.shiftScale(ns, e.iv, C.S.key, (kind[0] === 'u' ? 1 : -1) * (kind[2] ? 2 : 1)); else out = P.rhythm(ns, t, kind);
    setNotes(P.layout(out, e.strings, e.maxFret, e.variant)); finish('変形しました。▶で聴いてみる');
  }
  const S_sel = e => { const n = e.pos.length; C.S.sel = (C.S.sel % n) + 1; };
  function finish(t) { msg(t); if (!root.ADLEngine.running) solo(); }
  function loadItems(items, bars) {
    const e = env(); D.cur.bars = bars; D.cur.key = C.S.key; undo = []; setNotes(P.place(items, C.S.key, e.strings, e.maxFret, e.variant), true); cursor = 0; render();
  }
  function act(a, b) {
    if (a === 'bk') return $('#play').click();
    if (a === 'solo') return solo();
    if (a === 'undo') { if (undo.length) { D.cur.notes = undo.pop(); save(); render(); } return; }
    if (a === 'clear') { setNotes([]); D.cur.key = null; return; }
    if (a === 'rest') { setNotes(D.cur.notes.filter(n => n.st !== cursor)); cursor = Math.min(cursor + D.unit, total() - D.unit); return render(); }
    if (a === 'save') { const nm = ($('#h-name') || {}).value || ''; if (!D.cur.notes.length) return msg('保存する音がありません');
      D.name = nm; D.mine.push({ name: nm || 'マイリック' + (D.mine.length + 1), bars: D.cur.bars, sc: T.SCALES[C.S.scale].n, items: P.rels(D.cur.notes, key0()) });
      if (D.lick) D.prog[D.lick] = 3; save(); render(); return msg('保存しました'); }
    if (a === 'mload') { const m = D.mine[+b.dataset.i]; if (m) loadItems(m.items, m.bars); return; }
    if (a === 'mdel') { D.mine.splice(+b.dataset.i, 1); save(); return render(); }
    if (a === 'exp') { const e = env(), pre = $('#h-exp'); pre.hidden = !pre.hidden; if (pre.hidden) return;
      pre.textContent = P.exportText(D.cur, { key: C.S.key, scale: C.S.scale, scaleName: e.sc.n, bpm: C.B.bpm, title: D.name || 'フレーズ', strings: e.strings });
      document.querySelectorAll('#ph [data-a=copy]').forEach(x => x.remove()); const bt = document.createElement('button'); bt.className = 'go'; bt.textContent = 'コピー'; bt.dataset.a = 'copy'; pre.after(bt); return; }
    if (a === 'copy') { const tx = $('#h-exp').textContent; const ok = () => msg('コピーしました');
      const fb = () => { const ta = document.createElement('textarea'); ta.value = tx; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { msg('コピーできませんでした'); } ta.remove(); };
      return navigator.clipboard ? navigator.clipboard.writeText(tx).then(ok, fb) : fb(); }
    if (a === 'reset') { const l = LK.byId[D.lick]; return loadItems(LK.items(l), l.bars); }
    if (a === 'next') { const id = D.lick; D.prog[id] = Math.max(D.prog[id] || 0, D.step + 1); if (D.step < 2) D.step++; save(); return render(); }
    if (a === 'rkey') return setKey((C.S.key + 1 + Math.floor(Math.random() * 11)) % 12);
  }
  function init(ctx) {
    C = ctx; D = Object.assign({ cur: { bars: 4, key: null, notes: [] }, unit: 2, len: 2, sec: 'build', mine: [], prog: {}, mlen: 0, lick: null, step: 0, name: '', gbar: 0, gm: 'all', wz: { step: 0, rh: 'e8', semis: [0, 3, 7], end: 0 }, wzMade: false }, ST.load('phrase', {}));
    const R = $('#ph');
    R.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const par = b.parentNode.id, v = b.dataset.v;
      if (b.dataset.a) return act(b.dataset.a, b);
      if (b.dataset.x) return xf(b.dataset.x);
      if (b.dataset.gbar != null) { D.gbar = +b.dataset.gbar; save(); return render(); }
      if (b.dataset.wz) { const w = D.wz, k = b.dataset.wz;
        if (k === 'rh') w.rh = v; else if (k === 'go') w.step = +v; else if (k === 'gen') return wzGen();
        else if (k === 'semi') { const d = +v; w.semis = w.semis.includes(d) ? w.semis.filter(x => x !== d) : [...w.semis, d].sort((a, c) => a - c); if (!w.semis.includes(w.end)) w.end = w.semis[0] != null ? w.semis[0] : 0; }
        else if (k === 'end') w.end = +v;
        else if (k === 'p3') { const iv = env().iv, t = iv.includes(3) ? 3 : 4; w.semis = [0, t, 7].filter(d => iv.includes(d)); w.end = 0; }
        else if (k === 'pall') w.semis = env().iv.slice();
        save(); return render(); }
      if (b.dataset.lf != null) { lf = +b.dataset.lf; return render(); }
      if (b.dataset.lick) { const l = LK.byId[b.dataset.lick]; D.lick = l.id; D.step = 0; loadItems(LK.items(l), l.bars); return; }
      if (b.classList.contains('gc')) { cursor = +b.dataset.st; const n = D.cur.notes.find(q => q.st === cursor); if (n) { D.len = n.len; root.ADLAudio.play(n.p); } return render(); }
      if (par === 'h-len') { D.len = +v; if (D.len % 2 && D.unit === 2) D.unit = 1; save(); return render(); }
      if (par === 'h-unit') { if (+v === 2 && D.cur.notes.some(n => n.st % 2 || n.len % 2)) return msg('16分の音があるので8分格子にできません'); D.unit = +v; cursor = Math.floor(cursor / D.unit) * D.unit; save(); return render(); }
      if (par === 'h-bars') { D.cur.bars = +v; setNotes(D.cur.notes.filter(n => n.st < total()), true); cursor = Math.min(cursor, total() - D.unit); return; }
      if (par === 'h-sec') { D.sec = v; save(); return render(); }
      if (par === 'h-pos') { C.S.sel = +v; rekeyCur(); C.draw(); return render(); }
      if (par === 'h-ml') { D.mlen = +v; save(); return render(); }
      if (par === 'h-gm') { D.gm = v; save(); return render(); }
      if (par === 'h-vw') { C.S.view = v; C.draw(); return render(); }
      if (par === 'h-st') { D.step = +v; save(); return render(); } });
    R.addEventListener('change', e => { const id = e.target.id;
      if (id === 'h-key') return setKey(+e.target.value);
      if (id === 'h-asc') { C.B.autoSc = e.target.checked; document.querySelector('#asc').checked = C.B.autoSc; C.save(); C.draw(); return drawFret(); }
      if (id === 'h-sc') { C.S.scale = e.target.value; document.querySelector('#scale').value = C.S.scale; C.draw(); return render(); }
      if (id === 'h-prog') { C.B.prog = e.target.value; document.querySelector('#bprog').value = C.B.prog; C.bsync(); C.save(); } });
    R.addEventListener('input', e => { const vk = { 'h-vband': 'band', 'h-vphrase': 'phrase' }[e.target.id];
      if (vk) { C.B.vol[vk] = e.target.value / 100; root.ADLAudio.setVol(vk, C.B.vol[vk]); const o = document.querySelector('#v-' + vk); if (o) o.value = e.target.value; C.save(); return; }
      if (e.target.id === 'h-bpm') { C.B.bpm = +e.target.value; $('#h-bpmv').textContent = C.B.bpm; C.bsync(); C.save(); } if (e.target.id === 'h-name') D.name = e.target.value; });
    R.addEventListener('pointerup', e => { if (window.__pinch) return; const h = e.target.closest('.hit'); if (!h || !h.closest('#h-fret')) return; const s = +h.dataset.s, f = +h.dataset.f, st = env().strings;
      root.ADLAudio.play(st[s] + f); if (D.sec === 'build') addNote(s, f); });
  }
  const getBackup = () => ({ mine: D.mine, prog: D.prog });
  const setBackup = o => { if (!o || typeof o !== 'object') return; D.mine = Array.isArray(o.mine) ? o.mine : []; D.prog = o.prog && typeof o.prog === 'object' ? o.prog : {}; save(); };
  function show() { if (!D) return; rekeyCur(); render(); }
  root.ADLPhraseUI = { init, show, hook, onStep, getBackup, setBackup };
})(this);
