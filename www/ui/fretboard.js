// SVG指板(仕様書 8.2)。表示範囲 o.view={a,b}。a=0ならナット+開放弦、a>0なら途中のフレットから表示。
(function (root) {
  const T = root.ADL, W = 1000, L = 60, R = 16, MARK = [3, 5, 7, 9, 12, 15, 17, 19, 21];

  function render(el, o) {
    const inst = T.INSTR[o.inst], sc = T.SCALES[o.scale], n = inst.strings.length, { a, b } = o.view;
    const open = a === 0, first = open ? 1 : a, x0 = open ? L : 14, fw = (W - x0 - R) / (b - first + 1);
    const span = (n - 1) * 38, top = 30, H = 52 + span, y = s => 30 + (n - 1 - s) * 38, X = x => (o.left ? W - x : x);
    const left = f => x0 + (f - first) * fw, fx = f => (f === 0 ? L / 2 : left(f) + fw / 2);
    let h = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="指板">`;
    h += `<rect x="${Math.min(X(x0), X(W - R))}" y="${top - 16}" width="${W - x0 - R}" height="${span + 32}" class="board"/>`;
    for (let f = first; f <= b + 1; f++) h += `<line x1="${X(left(f))}" x2="${X(left(f))}" y1="${top - 16}" y2="${top + span + 16}" class="${open && f === first ? 'nut' : 'fret'}"/>`;
    for (let s = 0; s < n; s++) h += `<line x1="${X(open ? 8 : 4)}" x2="${X(W - R)}" y1="${y(s)}" y2="${y(s)}" class="str" stroke-width="${(0.8 + (n - 1 - s) * 0.45).toFixed(2)}"/>`;
        MARK.forEach(f => { if (f < first || f > b) return;
      (f === 12 ? [top + span * 0.25, top + span * 0.75] : [top + span / 2]).forEach(c => h += `<circle cx="${X(fx(f))}" cy="${c}" r="5" class="inlay"/>`); });
    for (let f = first; f <= b; f++) h += `<text x="${X(fx(f))}" y="${H - 4}" class="fn">${f}</text>`;

    // ポジション: この範囲に完全に収まる形だけを枠と明るい音にする
    const pos = o.sel > 0 ? o.positions[o.sel - 1] : null, inPos = new Set(), frames = [];
    if (pos) pos.variants.filter(v => T.fitsView(v, o.view)).forEach(v => { frames.push(v); v.notes.forEach(q => inPos.add(q.s + ':' + q.f)); });
    frames.forEach(v => { const x1 = v.lo === 0 ? 2 : left(v.lo) + 2, x2 = left(v.hi) + fw - 2;
      h += `<rect x="${Math.min(X(x1), X(x2))}" y="${top - 20}" width="${x2 - x1}" height="${span + 40}" rx="10" class="frame"/>`; });

    T.allNotes(inst.strings, sc, o.key, b).filter(q => q.f >= (open ? 0 : a) && (!o.vis || o.vis(q))).forEach(q => {
      const root_ = q.d === 0, ch = (sc.ch || []).includes(q.d), on = !pos || inPos.has(q.s + ':' + q.f);
      const cls = 'dot' + (root_ ? ' root' : ch ? ' char' : '') + (on && (!o.lit || o.lit.includes(q.d)) ? '' : ' off') + (o.lit && o.lit.includes(q.d) ? ' lit' : '') + (o.ct && o.ct.includes(T.pc(q.p)) ? ' ct' : '');
      const label = o.mode === 'note' ? T.noteName(q.p, o.key, o.scale) : o.mode === 'deg' ? T.DEG[q.d] : '';
      h += `<g class="${cls}"><circle cx="${X(fx(q.f))}" cy="${y(q.s)}" r="${root_ ? 16 : 14}"/><text x="${X(fx(q.f))}" y="${y(q.s) + 5}">${label}</text></g>`;
    });
    (o.over || []).filter(m => m.f >= (open ? 0 : a) && m.f <= b).forEach(m => h += `<g class="dot ${m.cls || ''}"><circle cx="${X(fx(m.f))}" cy="${y(m.s)}" r="15"/><text x="${X(fx(m.f))}" y="${y(m.s) + 5}">${m.label || ''}</text></g>`);   // 重ね表示(フレーズ・ガイドトーン)
    // 弦×フレットのタップ領域(スケール外でも鳴る)
    for (let s = 0; s < n; s++) for (let f = open ? 0 : a; f <= b; f++) {
      const x1 = f === 0 ? 0 : left(f), w = f === 0 ? L : fw;
      h += `<rect x="${Math.min(X(x1), X(x1 + w))}" y="${y(s) - 19}" width="${w}" height="38" class="hit" data-s="${s}" data-f="${f}"/>`;
    }
    el.innerHTML = h + '</svg>';
  }
  // 指板クイズ・ルート地図用の素の指板。o={strings,view:{a,b},left,marks:[{s,f,cls,label}]}。SVG文字列を返す。
  function plain(o) {
    const n = o.strings.length, { a, b } = o.view, open = a === 0, first = open ? 1 : a, x0 = open ? L : 14, fw = (W - x0 - R) / (b - first + 1);
    const H = 52 + (n - 1) * 38, y = s => 30 + (n - 1 - s) * 38, X = x => (o.left ? W - x : x);   // TAB譜と同じ向き(1弦=最高音弦が上)
    const left = f => x0 + (f - first) * fw, fx = f => (f === 0 ? L / 2 : left(f) + fw / 2), span = (n - 1) * 38;
    let h = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="指板">`;
    h += `<rect x="${Math.min(X(x0), X(W - R))}" y="14" width="${W - x0 - R}" height="${span + 32}" class="board"/>`;
    for (let f = first; f <= b + 1; f++) h += `<line x1="${X(left(f))}" x2="${X(left(f))}" y1="14" y2="${span + 46}" class="${open && f === first ? 'nut' : 'fret'}"/>`;
    for (let s = 0; s < n; s++) h += `<line x1="${X(open ? 8 : 4)}" x2="${X(W - R)}" y1="${y(s)}" y2="${y(s)}" class="str" stroke-width="${(0.8 + (n - 1 - s) * 0.45).toFixed(2)}"/>`;
    MARK.forEach(f => { if (f < first || f > b) return; (f === 12 ? [30 + span * 0.25, 30 + span * 0.75] : [30 + span / 2]).forEach(c => h += `<circle cx="${X(fx(f))}" cy="${c}" r="5" class="inlay"/>`); });
    for (let f = first; f <= b; f++) h += `<text x="${X(fx(f))}" y="${H - 4}" class="fn">${f}</text>`;
    (o.marks || []).forEach(m => h += `<g class="dot ${m.cls || ''}" data-k="${m.s}:${m.f}"><circle cx="${X(fx(m.f))}" cy="${y(m.s)}" r="${m.cls && m.cls.includes('root') ? 16 : 14}"/><text x="${X(fx(m.f))}" y="${y(m.s) + 5}">${m.label || ''}</text></g>`);
    for (let s = 0; s < n; s++) for (let f = open ? 0 : a; f <= b; f++) {
      const x1 = f === 0 ? 0 : left(f), w = f === 0 ? L : fw;
      h += `<rect x="${Math.min(X(x1), X(x1 + w))}" y="${y(s) - 19}" width="${w}" height="38" class="hit" data-s="${s}" data-f="${f}"/>`; }
    return h + '</svg>';
  }
  root.ADLFret = { render, plain };
})(this);
