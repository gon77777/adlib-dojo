// 教本の章立て。kind を指定した章は、その種類の項目が自動で並ぶ。
(function (B) {
  B.LS('c-road', '入門ロードマップ', { ids: ['g-road'] });
  B.LS('c-rule', '共通ルール', { kind: 'rule' });
  B.LS('c-thought', 'かっこよく聞こえる考え方', { kind: 'thought' });
  B.LS('c-tech', 'テクニック用語辞典', { kind: 'tech' });
  B.LS('c-prac', '練習のしかた', { ids: ['g-prac'] });
})(typeof module !== 'undefined' ? require('../core/book.js') : ADLBook);
