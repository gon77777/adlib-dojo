// SVG鍵盤(仕様書 8.5)。ルート/特徴音/スケール音/コードトーンの輪/オクターブ範囲の枠は指板と同じルール。
(function (root) {
  const T = root.ADL, W = 1000, H = 210, BLACK = [1, 3, 6, 8, 10];
  function render(el, o) {
    const [lo, hi] = T.INSTR.keys.range, sc = T.SCALES[o.scale];
    const whites = []; for (let m = lo; m <= hi; m++) if (!BLACK.includes(m % 12)) whites.push(m);
    const ww = W / whites.length, bw = ww * 0.6, wx = m => whites.indexOf(m) * ww;
    const pos = o.sel > 0 ? [lo + 12 * (o.sel - 1), lo + 12 * (o.sel - 1) + 11] : null;
    const xOf = m => BLACK.includes(m % 12) ? wx(m - 1) + ww - bw / 2 + bw / 2 : wx(m) + ww / 2;   // 黒鍵は左隣の白鍵の右端をまたぐ
    let h = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="鍵盤">`;
    whites.forEach(m => { h += `<rect class="key wk" data-m="${m}" x="${wx(m)}" y="6" width="${ww}" height="${H - 12}" rx="3"/>`; });
    for (let m = lo; m <= hi; m++) if (BLACK.includes(m % 12)) h += `<rect class="key bk" data-m="${m}" x="${wx(m - 1) + ww - bw / 2}" y="6" width="${bw}" height="${(H - 12) * 0.62}" rx="3"/>`;
    if (pos) { const x1 = wx(pos[0]), x2 = wx(pos[1] - (BLACK.includes(pos[1] % 12) ? 1 : 0)) + ww; h += `<rect x="${x1 + 1}" y="2" width="${x2 - x1 - 2}" height="${H - 4}" rx="8" class="frame"/>`; }
    for (let m = lo; m <= hi; m++) {
      const d = T.pc(m - o.key); if (!sc.iv.includes(d) || (o.vis && !o.vis({ d, p: m }))) continue;
      const root_ = d === 0, ch = (sc.ch || []).includes(d), on = !pos || (m >= pos[0] && m <= pos[1]), blk = BLACK.includes(m % 12);
      const label = o.mode === 'note' ? T.noteName(m, o.key, o.scale) : o.mode === 'deg' ? T.DEG[d] : '';
      const cls = 'dot' + (root_ ? ' root' : ch ? ' char' : '') + (on && (!o.lit || o.lit.includes(d)) ? '' : ' off') + (o.lit && o.lit.includes(d) ? ' lit' : '') + (o.ct && o.ct.includes(T.pc(m)) ? ' ct' : ''), cy = blk ? 100 : 168;
      h += `<g class="${cls}" style="pointer-events:none"><circle cx="${xOf(m)}" cy="${cy}" r="${root_ ? 16 : 14}"/><text x="${xOf(m)}" y="${cy + 5}">${label}</text></g>`;
    }
    el.innerHTML = h + '</svg>';
  }
  root.ADLKeys = { render };
})(this);
