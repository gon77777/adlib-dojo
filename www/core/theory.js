// 楽器・スケール・ポジション自動生成(仕様書 4.1 / 4.4)。ブラウザとNode両対応。
(function (root) {
  const NOTE_S = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const NOTE_F = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
  const FLAT_KEYS = [0, 1, 3, 5, 6, 8, 10];   // 親メジャーがこのキーなら♭表記(Cは♭側: E♭・B♭・A♭が実用上多い)
  const DEG = ['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];
  const INSTR = {
    guitar: { n: 'ギター', frets: 22, strings: [40,45,50,55,59,64],
      tunings: { std: [40,45,50,55,59,64], dropD: [38,45,50,55,59,64], halfDown: [39,44,49,54,58,63] } },
    bass4:  { n: 'ベース4弦', frets: 20, strings: [28,33,38,43] },
    bass5:  { n: 'ベース5弦', frets: 20, strings: [23,28,33,38,43] },
    keys:   { n: '鍵盤', keys: true, range: [48, 84] }
  };
  // iv=半音の並び、base=ポジションの土台(6音以上は親の形に追加音を重ねる)、ch=特徴音(半音)
  const SCALES = {
    mpent: { n: 'マイナーペンタ', iv: [0,3,5,7,10], tip: '迷ったらこれ。ナチュラルマイナーから2度と♭6を抜いた5音で、外しにくい。(R3)' },
    Mpent: { n: 'メジャーペンタ', iv: [0,2,4,7,9], tip: 'メジャーから4度と7度を抜いた5音。明るく、外しにくい。(R3)' },
    blues: { n: 'ブルース', iv: [0,3,5,6,7,10], base: [0,3,5,7,10], ch: [6], tip: 'マイナーペンタに♭5(ブルーノート)を足した形。♭5は長く伸ばさず通り過ぎる。(R4)' },
    nmin:  { n: 'ナチュラルマイナー', iv: [0,2,3,5,7,8,10], tip: '暗い7音。ペンタに2度と♭6が加わる。(R3)' },
    dor:   { n: 'ドリアン', iv: [0,2,3,5,7,9,10], ch: [9], tip: 'マイナーなのに明るさがある。特徴音は6度(♮6)。1回入れてすぐ安定音へ。(R5・R6)' },
    mix:   { n: 'ミクソリディアン', iv: [0,2,4,5,7,9,10], ch: [10], tip: 'メジャーに♭7。ロックやブルースの7thコードに合う。特徴音は♭7。(R5・R6)' },
    maj:   { n: 'メジャー', iv: [0,2,4,5,7,9,11], tip: '明るい7音。4度はコードの3度とぶつかりやすいので長く伸ばさない。(R7)' }
  };
  const pc = x => ((x % 12) + 12) % 12;
  // 表記(♯/♭)は「親メジャーキー」で決める。Cマイナー系=E♭メジャー側なので E♭・B♭ になり、D♯ にならない。
  // 親メジャー: マイナー系(mpent/blues/nmin)=主音+3、ドリアン=主音+10、ミクソ=主音+5、それ以外=主音。scは省略可(主音をそのまま親とみなす)。
  const PARENT = { mpent: 3, blues: 3, nmin: 3, dor: 10, mix: 5 };
  const useFlat = (key, sc) => FLAT_KEYS.includes(pc(key + (PARENT[sc] || 0)));
  const noteName = (p, key, sc) => (useFlat(key, sc) ? NOTE_F : NOTE_S)[pc(p)];

  // 各弦に連続したN音(5音=2、7音=3)。次の弦は「前の弦の最高音より高い最初のスケール音」から。
  function buildPositions(strings, sc, key, maxFret) {
    const base = sc.base || sc.iv;
    const N = base.length <= 5 ? 2 : 3;
    const extra = sc.base ? sc.iv.filter(x => !sc.base.includes(x)) : [];
    const inBase = p => base.includes(pc(p - key));
    const sp = [];
    for (let p = 12; p <= 110; p++) if (inBase(p)) sp.push(p);
    const out = [];
    for (let k = 0; k < base.length; k++) {
      let a = pc(key + base[k] - strings[0]);
      if (a === 0) a = 12;
      const variants = [];
      for (const shift of [0, 12]) {
        let i = sp.indexOf(strings[0] + a + shift), prevMax = -1;
        const notes = [];
        for (let s = 0; s < strings.length; s++) {
          if (s > 0) i = sp.findIndex(p => p > prevMax && p >= strings[s]);
          for (let j = 0; j < N; j++) { const p = sp[i + j]; notes.push({ s, f: p - strings[s], p }); }
          prevMax = sp[i + N - 1];
        }
        const lo = Math.min(...notes.map(n => n.f)), hi = Math.max(...notes.map(n => n.f));
        if (hi > maxFret) continue;
        strings.forEach((open, s) => {
          for (let f = lo; f <= hi; f++) if (extra.includes(pc(open + f - key))) notes.push({ s, f, p: open + f, extra: true });
        });
        notes.forEach(n => { n.d = pc(n.p - key); });
        variants.push({ lo, hi, notes });
      }
      out.push({ no: k + 1, variants });
    }
    return out;
  }
  // 指板全体のスケール音(0〜maxFret)
  function allNotes(strings, sc, key, maxFret) {
    const res = [];
    strings.forEach((open, s) => {
      for (let f = 0; f <= maxFret; f++) {
        const d = pc(open + f - key);
        if (sc.iv.includes(d)) res.push({ s, f, p: open + f, d });
      }
    });
    return res;
  }
  // 表示範囲: low=0〜15、high=最終フレットまでの15フレット分(ギター8〜22、ベース6〜20)
  const viewRange = (inst, v) => v === 'high' ? { a: inst.frets - 14, b: inst.frets } : { a: 0, b: 15 };
  const fitsView = (variant, r) => variant.lo >= r.a && variant.hi <= r.b;
  // ---- 理論: コード、モード、初見スケールの自動分析(仕様書 13) ----
  const CH = { M: [0,4,7], m: [0,3,7], '7': [0,4,7,10], m7: [0,3,7,10], M7: [0,4,7,11], m7b5: [0,3,6,10], dim: [0,3,6], sus4: [0,5,7] };
  const CHS = { M: '', m: 'm', '7': '7', m7: 'm7', M7: 'M7', m7b5: 'm7♭5', dim: 'dim', sus4: 'sus4' };
  const MAJ = [0,2,4,5,7,9,11], MIN = [0,2,3,5,7,8,10];
  const MODES = [
    { n: 'アイオニアン(メジャー)', from: 1, ch: '―', sc: 'maj' }, { n: 'ドリアン', from: 2, ch: '♮6', sc: 'dor' },
    { n: 'フリジアン', from: 3, ch: '♭2', sc: null }, { n: 'リディアン', from: 4, ch: '♯4', sc: null },
    { n: 'ミクソリディアン', from: 5, ch: '♭7', sc: 'mix' }, { n: 'エオリアン(ナチュラルマイナー)', from: 6, ch: '♭6', sc: 'nmin' },
    { n: 'ロクリアン', from: 7, ch: '♭5・♭2', sc: null }
  ];
  function analyze(iv) {
    const has = x => iv.includes(x), ref = has(3) && !has(4) ? MIN : MAJ;
    const third = has(3) ? 3 : has(4) ? 4 : null, fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : null, sev = has(10) ? 10 : has(11) ? 11 : null;
    const tones = [0, third, fifth, sev].filter(x => x != null);
    let q = '';
    if (third === 4 && fifth === 7) q = sev === 10 ? '7' : sev === 11 ? 'M7' : 'M';
    else if (third === 3 && fifth === 7) q = sev === 10 ? 'm7' : sev === 11 ? 'mM7' : 'm';
    else if (third === 3 && fifth === 6) q = sev === 10 ? 'm7♭5' : 'dim';
    else if (third === 4 && fifth === 8) q = 'aug';
    return { n: iv.length, ref: ref === MIN ? 'ナチュラルマイナー' : 'メジャー', extra: iv.filter(x => !ref.includes(x)), missing: ref.filter(x => !iv.includes(x)),
      tones, quality: q, avoid: iv.filter(d => !tones.includes(d) && tones.includes((d + 11) % 12)), third };
  }
  const api = { CH, CHS, MAJ, MODES, analyze, viewRange, fitsView, NOTE_S, NOTE_F, DEG, INSTR, SCALES, pc, noteName, useFlat, buildPositions, allNotes };
  if (typeof module !== 'undefined') module.exports = api; else root.ADL = api;
})(this);
