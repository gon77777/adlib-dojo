// お題エンジン(仕様書 7)。TK定義 → pick(ctx) で1件生成。ブラウザ/Node両対応。
(function (root) {
  const T = root.ADL || require('./theory.js');
  const RHY = [
    { n: '8分の連打', g: 'x.x.x.x.x.x.x.x.' },
    { n: '付点8分+16分', g: 'x..xx..xx..xx..x' },
    { n: 'シンコペーション(裏から入る)', g: '..x...x...x...x.' },
    { n: '3-3-2', g: 'x..x..x.x..x..x.' },
    { n: '4分だけ', g: 'x...x...x...x...' },
    { n: '2拍フレーズ+2拍休符', g: 'x.xxx.x.........' }
  ];
  const TECH = ['ハンマリングオン', 'プルオフ', 'スライド', 'ビブラート', 'チョーキング'];
  const nm = (c, d) => T.noteName(c.key + d, c.key, c.scId) + '(' + T.DEG[d] + ')';
  const third = c => (c.sc.iv.includes(3) ? 3 : 4);
  const pick = (a, r) => a[Math.floor(r() * a.length)];
  const TK = [
    { id: 'n2', lv: [1, 2], kind: 'notes', rid: ['R1'], gen: c => { const b = c.sc.iv.includes(7) ? 7 : c.sc.iv[2];
      return { hl: [0, b], solo: true, text: `ポジション${c.posNo}の2音、${nm(c, 0)}と${nm(c, b)}だけで4小節弾く。`, tip: '音を絞ると、リズムと音の長さに集中できる。' }; } },
    { id: 'root', lv: [1], kind: 'notes', rid: ['R1'], gen: c => ({ hl: [0], solo: true, text: `ルート(${nm(c, 0)})だけで4小節。長さとリズムを変えて飽きさせない。`, tip: 'ルートは家。まず指板で全部のルートを探そう。' }) },
    { id: 'end', lv: [1, 2, 3, 4, 5], kind: 'end', rid: ['R12'], gen: c => { const d = pick([0, third(c), 7].filter(x => c.sc.iv.includes(x)), c.rnd);
      return { hl: [d], text: `4小節弾いて、最後は${nm(c, d)}で終わる。`, tip: '最後の音で印象が決まる。ルート・3度・5度は着地しやすい。' }; } },
    { id: 'rest', lv: [1, 2, 3], kind: 'rest', rid: [], gen: c => ({ text: `${2 + Math.floor(c.rnd() * 3)}拍目は必ず休む。弾かない拍を作る。`, tip: '休符は音と同じくらい大事。詰め込まない勇気。' }) },
    { id: 'rhy', lv: [2, 3, 4, 5], kind: 'rhythm', rid: [], gen: c => { const r = pick(RHY, c.rnd);
      return { text: `このリズム「${r.n}」を毎小節に使う。音は何でもOK。`, grid: r.g, tip: 'リズムを先に決めてから音を乗せる。' }; } },
    { id: 'motif', lv: [2, 3, 4, 5], kind: 'motif', rid: [], gen: () => ({ text: '1小節のフレーズを作り、2回繰り返す。3回目は最後の音だけ変える。', tip: '同じ型を繰り返すと、聞き手に「フレーズ」として伝わる。' }) },
    { id: 'call', lv: [2, 3, 4, 5], kind: 'call', rid: [], gen: () => ({ text: '2小節弾いて、次の2小節は休む。休みの間に頭の中で「返事」を歌い、次の2小節で弾く。', tip: '質問と答えの形にすると、自然に聞こえる。' }) },
    { id: 'conn', lv: [3], kind: 'range', rid: [], cond: c => c.nPos > 1, gen: c => { const b = c.posNo % c.nPos + 1;
      return { text: `ポジション${c.posNo}の高い音から、スライドでポジション${b}へ。戻りはプルオフで。`, tip: '隣のポジションとは共通する音がある。そこで乗り換える。' }; } },
    { id: 'tech', lv: [3, 4, 5], kind: 'tech', rid: [], gen: c => ({ text: `4小節のうち、${pick(TECH, c.rnd)}を1回だけ使う。`, tip: '使いすぎない。1回だから目立つ。' }) },
    { id: 'climb', lv: [4], kind: 'range', rid: ['R11'], gen: () => ({ text: '低い弦から高い弦まで登るフレーズを作り、一番高い音(山)を1つ決めて、また下りてくる。', tip: '山を1つ作ると、歌っているように聞こえる。' }) },
    { id: 'two', lv: [4], kind: 'range', rid: [], cond: c => c.nPos > 1, gen: c => { const a = 1 + Math.floor(c.rnd() * c.nPos), b = a % c.nPos + 1;
      return { text: `同じフレーズを、ポジション${a}で1回、ポジション${b}で1回弾く。`, tip: '同じ音でも場所が違うと、音色と指の動きが変わる。' }; } },
    { id: 'char', lv: [5], kind: 'notes', rid: ['R6'], cond: c => !!c.sc.ch, gen: c => ({ hl: [c.sc.ch[0], 0, third(c)], text: `特徴音${nm(c, c.sc.ch[0])}を1回だけ入れて、すぐ${nm(c, 0)}か${nm(c, third(c))}に着地する。`, tip: '入れすぎない。1回だから個性として聞こえる。' }) },
    { id: 'ct', lv: [5], kind: 'chord', rid: ['R2'], gen: () => ({ text: '小節の頭(1拍目)は必ずコードトーン。バッキングを鳴らし、コードが変わるたびに狙う音を変える。', tip: '指板の白い輪がコードトーン。拍頭に置くと安定する。' }) },
    { id: 'appr', lv: [2, 3, 4, 5], kind: 'appr', rid: ['R18'], gen: c => { const d = pick([0, third(c), 7].filter(x => c.sc.iv.includes(x)), c.rnd);
      return { hl: [d], text: `目標の音${nm(c, d)}を決め、半音上か半音下から入って解決させる。これを2回。`, tip: '外しても、半音なら次の音で解決する。半音=隣のフレット。' }; } },
    { id: 'one', lv: [2, 3, 4, 5], kind: 'one', rid: ['R19'], gen: c => { const n = c.nStr || 6, s = c.only >= 0 ? c.only : Math.floor(c.rnd() * n);
      return { text: `${n - s}弦だけでアドリブする。ほかの弦は使わない。`, tip: `ルートから ${c.sc.iv.slice(1).map(x => '+' + x).join('・')} フレットがこのスケールの音。練習タブの「1本だけ」で、ほかの弦を隠せる。` }; } },
    { id: 'scaf', lv: [3, 4, 5], kind: 'scaf', rid: ['R20'], gen: () => ({ text: '練習タブの「足場外し」をオンにしてバッキングを鳴らす。表示が減っても止まらずに弾く。', tip: '全部の音→ルートだけ→コードトーンだけ→表示なし、と減っていく。減ったら、ルートからの距離で音を探す。' }) },
    { id: 'shuf', lv: [4, 5], kind: 'shuf', rid: ['R20'], gen: () => ({ text: 'バッキングタブの「キーシャッフル」をオンにして、周が変わるたびにルートを探してから弾き始める。', tip: '形の暗記では通用しない。ルートからの関係で弾く練習になる。' }) },
    { id: 'avoid', lv: [5], kind: 'notes', rid: ['R7'], gen: () => ({ text: 'コードの半音上の音は長く伸ばさず、通り過ぎるだけにする。', tip: 'ぶつかる音は経過音なら使える。' }) }
  ];
  function pickTask(c, lastId) {
    c.rnd = c.rnd || Math.random;
    let list = TK.filter(t => t.lv.includes(c.lv) && (!t.cond || t.cond(c)));
    const f = list.filter(t => t.id !== lastId); if (f.length) list = f;
    const t = pick(list, c.rnd), o = t.gen(c);
    return Object.assign({ id: t.id, kind: t.kind, rid: t.rid, lv: c.lv }, o);
  }
  const api = { TK, RHY, pick: pickTask };
  if (typeof module !== 'undefined') module.exports = api; else root.ADLTasks = api;
})(this);
