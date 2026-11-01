// バッキングの音楽データと純粋関数(進行・パターン・スウィング)。ブラウザとNode両対応。
(function (root) {
  const T = root.ADL || require('./theory.js');
  const QI = { M: [0,4,7], m: [0,3,7], '7': [0,4,7,10], m7: [0,3,7,10], M7: [0,4,7,11], m7b5: [0,3,6,10], dim: [0,3,6], sus4: [0,5,7] };
  const QS = { M: '', m: 'm', '7': '7', m7: 'm7', M7: 'M7', m7b5: 'm7♭5', dim: 'dim', sus4: 'sus4' };
  // c=[ルートからの半音, 種類]。キー=その進行の主音
  const PROGS = {
    minor4: { n: 'i-♭VI-♭III-♭VII(マイナー)', c: [[0,'m'],[8,'M'],[3,'M'],[10,'M']] },
    pop4:   { n: 'I-V-vi-IV(ポップ)', c: [[0,'M'],[7,'M'],[9,'m'],[5,'M']] },
    blues12:{ n: '12小節ブルース', c: [[0,'7'],[0,'7'],[0,'7'],[0,'7'],[5,'7'],[5,'7'],[0,'7'],[0,'7'],[7,'7'],[5,'7'],[0,'7'],[7,'7']] },
    ii5:    { n: 'ii-V-I', c: [[2,'m7'],[7,'7'],[0,'M7'],[0,'M7']] },
    minor7: { n: 'im7-ivm7-V7-im7', c: [[0,'m7'],[5,'m7'],[7,'7'],[0,'m7']] }
  };
  const all16 = Array.from({ length: 16 }, (_, i) => i);
  const DR = {
    rock8:  { n: 'ロック8ビート', k: [0,8], s: [4,12], h: [0,2,4,6,8,10,12,14] },
    rock16: { n: '16ビート', k: [0,6,10], s: [4,12], h: all16 },
    shuffle:{ n: 'シャッフル(スウィング100%推奨)', k: [0,8], s: [4,12], h: [0,2,4,6,8,10,12,14] },
    funk:   { n: 'ファンク', k: [0,3,10], s: [4,12], h: all16 },
    ballad: { n: 'バラード', k: [0,10], s: [8], h: [0,4,8,12] }
  };
  const third = ch => ch.iv[1];
  const BS = {   // [step, ルートからの半音, 長さstep]
    root4:  () => [[0,0,4],[4,0,4],[8,0,4],[12,0,4]],
    root8:  () => [0,2,4,6,8,10,12,14].map(s => [s, 0, 2]),
    fifth:  () => [[0,0,4],[4,0,4],[8,7,4],[12,0,4]],
    octave: () => [0,2,4,6,8,10,12,14].map((s, i) => [s, i % 2 ? 12 : 0, 2]),
    walk:   ch => [[0,0,4],[4,third(ch),4],[8,7,4],[12,third(ch),4]]
  };
  const COMP = {  // [step, 長さstep]
    whole:  [[0, 15]],
    quarter:[[0,3],[4,3],[8,3],[12,3]],
    eighth: [0,2,4,6,8,10,12,14].map(s => [s, 1.5]),
    stab:   [[2,1.5],[6,1.5],[10,1.5],[14,1.5]]
  };
  const NAMES = {
    bass: { root4: 'ルート4分', root8: 'ルート8分', fifth: 'ルート+5度', octave: 'オクターブ', walk: '簡易ウォーキング' },
    comp: { whole: '全音符', quarter: '4分', eighth: '8分', stab: '裏拍スタブ' }
  };
  function chordAt(prog, key, bar) {
    const list = PROGS[prog].c, c = list[((bar % list.length) + list.length) % list.length];
    const r = (key + c[0]) % 12, iv = QI[c[1]];
    return { r, q: c[1], iv, name: T.noteName(r, key) + QS[c[1]], pcs: iv.map(i => (r + i) % 12) };
  }
  // コードごとのスケール提案。返り値{root(スケールの主音=コードのルート),scale,name,why,chord}。
  // 基本: m7=ドリアン / M7=メジャー / 7=ミクソリディアン / m=マイナーペンタ / M=メジャーペンタ。進行ごとの例外はOVR。
  const QSC = {
    m7: ['dor', 'マイナー7thの定番。特徴音の♮6が明るさを出す。'], M7: ['maj', 'メジャー7thの響き。4度は長く伸ばさない。'],
    '7': ['mix', '7thコードの定番。特徴音の♭7がコードと同じ音。'], m: ['mpent', '外しにくい5音。迷ったらこれ。'], M: ['Mpent', '明るく外しにくい5音。'],
    m7b5: ['nmin', 'ハーフディミニッシュ。ナチュラルマイナーで近い響きに。♭5(コードの5度)を狙うと決まる。'], dim: ['blues', '不安定なコード。ブルーススケールの♭5を軸に短く通り過ぎる。'], sus4: ['Mpent', '4度が3度の代わりに鳴る。メジャーペンタで広く響く。']
  };
  const OVR = { blues12: { '7': ['blues', 'ブルース進行は、どのコードの上でもブルーススケール(♭5を通過音に)。'] }, minor4: { 0: ['nmin', '主和音(i)の上はナチュラルマイナー。♭6と2度が使える。'] } };
  function chordScale(prog, key, bar) {
    const list = PROGS[prog].c, i = ((bar % list.length) + list.length) % list.length, ch = chordAt(prog, key, bar), o = OVR[prog] || {};
    const r = o[i] || o[ch.q] || QSC[ch.q] || QSC.M, sc = r[0];
    return { root: ch.r, scale: sc, chord: ch.name, name: T.noteName(ch.r, key, sc) + ' ' + T.SCALES[sc].n, why: r[1] };
  }
  // スウィング: 8分=裏の8分(step%4が2,3)を最大で拍の2/3位置(3連)まで遅らせる。16分=奇数stepを遅らせる
  function stepShift(step, spb, swing, mode) {
    const s = ((step % 16) + 16) % 16, a = swing / 100;
    return mode === '16' ? (s % 2 === 1 ? a * spb / 12 : 0) : (s % 4 >= 2 ? a * spb / 6 : 0);
  }
  // step→{lap(進行を何周したか), key}。カウントイン(step<0)は0周目。keyFor(lap)があればキーシャッフル。
  function lapKey(step, nBars, key, keyFor) { const lap = step < 0 ? 0 : Math.floor(Math.floor(step / 16) / nBars); return { lap, key: keyFor ? keyFor(lap) : key }; }
  // ---- 自作進行(ids は 'u_' 始まり)。c=[[ルートからの半音0〜11, 種類],…] 1〜16小節 ----
  const validProg = p => !!p && typeof p.n === 'string' && Array.isArray(p.c) && p.c.length >= 1 && p.c.length <= 16 &&
    p.c.every(x => Array.isArray(x) && Number.isInteger(x[0]) && x[0] >= 0 && x[0] < 12 && Object.prototype.hasOwnProperty.call(QI, x[1]));
  function setCustom(map) {   // 既存の自作を消して、正しいものだけ登録。登録できた分を返す
    Object.keys(PROGS).filter(k => k.startsWith('u_')).forEach(k => delete PROGS[k]);
    const ok = {}; Object.entries(map || {}).forEach(([k, v]) => { if (k.startsWith('u_') && validProg(v)) { ok[k] = { n: v.n.slice(0, 30), c: v.c.map(x => [x[0], x[1]]) }; PROGS[k] = ok[k]; } });
    return ok;
  }
  const api = { QI, QS, validProg, setCustom, chordScale, PROGS, DR, BS, COMP, NAMES, chordAt, stepShift, lapKey };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLMusic = api;
})(this);
