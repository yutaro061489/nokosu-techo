import { h, append } from '../dom.js';
import { pageHead } from '../components.js';

const MERITS = [
  { title: '1日1問でいい', text: 'わからない問いは飛ばして、あとで書き足せます。' },
  { title: '見せる相手と時期を選べる', text: '人ごと・項目ごとに選べて、見え方をその場で確かめられます。' },
  { title: '家族の手続きまで', text: '書いた口座や保険から、期限つきの手続きリストができます。' },
];

const STEPS = [
  { img: 'guide-1', text: '画面下の「手帖」を押すと、手帖の目次が開きます。ホームの「今日の1問」から、その場で答えることもできます。' },
  { img: 'guide-2', text: '9つのカテゴリが並んでいます。右側に記入した数が出るので、書きやすいところから選んでください。' },
  { img: 'guide-3', text: 'カテゴリを開いて、上の切り替えで「1問ずつ」を選ぶと、1問ずつ表示されます。答えにくい質問は「あとで」で飛ばせます。入力した内容は自動で保存されます。', note: { title: '番号や暗証番号は書きません', text: '口座は「〇〇銀行に口座がある」と、あることだけ書けば十分です。パスワードもここには書かず、保管場所のヒントだけを残します。' } },
  { img: 'guide-4', text: '「家族・大切な人」に登録した人ごとに「見せる時期」を選びます。カテゴリごとに変えることもできます。はじめは家族に「亡くなったあと」が入っています。' },
  { img: 'guide-5', text: '人ごとの欄で「見え方を確かめる」を開くと、その人が見る内容だけが表示されます。時期を切り替えて確かめ、そのまま「受け渡しシート」として印刷できます。' },
  { img: 'guide-6', text: 'もしものときは、ご家族が「もしものとき」を開いて亡くなった日を入れます。期限つきの手続きリストができ、終わったものに印をつけられます。' },
];

const FAQ = [
  { q: '暗証番号を忘れたら？', a: 'ロックしたままでは開けず、手帖を消すしかありません。番号は紙に書いて、通帳などと同じ場所に置いてください。データの控え（ファイル）があれば、消したあとで戻せます。' },
  { q: 'この手帖に法的な効力はありますか？', a: 'ありません。財産の分け方を決めたい場合は遺言書を作ってください。遺言書があるか、どこにあるかを手帖に書いておくと、ご家族が見つけやすくなります。' },
  { q: '家族もアプリを入れる必要がありますか？', a: 'いりません。「誰に・いつ見せるか」の人ごとの欄で「見え方を確かめる」を開き、受け渡しシートを印刷して渡すか、「ファイルで渡す」で送れます。ファイルは届いたときに読めるので、亡くなったあとに渡したいものは印刷して封をするのがおすすめです。' },
  { q: 'データはどこに保存されますか？', a: 'お使いの端末のブラウザの中だけです。運営者を含め、ほかの人には送られません。機種を変える前やブラウザの履歴を消す前には、「印刷・控え」からデータを書き出してください。' },
  { q: 'パスワードを書いておいてもいいですか？', a: 'この手帖には書かないでください。紙のメモや金庫など、どこに保管しているかのヒントだけを残します。スマホのロック解除の保管場所は「スマホのスペアキー」カードに書いて印刷できます。' },
];

export function renderGuide(main) {
  append(main,
    pageHead('使い方', null),

    h('section', { class: 'guide-sec', 'aria-labelledby': 'merit-title' },
      h('h2', { class: 'guide-h2', id: 'merit-title', text: 'できること' }),
      h('img', { class: 'guide-photo', src: 'img/hero.jpg', alt: 'ソファで母と娘がスマホをのぞきこんで笑っている', width: 1200, height: 670 }),
      h('div', { class: 'guide-merits' }, MERITS.map((m) => h('div', { class: 'guide-merit' },
        h('h3', { class: 'guide-pill', text: m.title }),
        h('p', { text: m.text }))))),

    h('section', { class: 'guide-sec', 'aria-labelledby': 'steps-title' },
      h('h2', { class: 'guide-h2', id: 'steps-title', text: '書きはじめるまで' }),
      h('ol', { class: 'guide-steps' }, STEPS.map((s, i) => h('li', { class: 'guide-step' },
        h('figure', { class: 'guide-shot' },
          h('img', { src: `img/${s.img}.png`, alt: `手順${i + 1}の画面`, width: 375, height: 667, loading: 'lazy' })),
        h('div', { class: 'guide-step-body' },
          h('span', { class: 'guide-num', 'aria-hidden': 'true', text: String(i + 1) }),
          h('p', { text: s.text }),
          s.note ? h('div', { class: 'guide-note' },
            h('p', { class: 'guide-note-title', text: s.note.title }),
            h('p', { text: s.note.text })) : null))))),

    h('div', { class: 'guide-cta' },
      h('a', { class: 'btn btn-primary', href: '#/note', text: '書きはじめる' })),

    h('section', { class: 'guide-sec', 'aria-labelledby': 'faq-title' },
      h('h2', { class: 'guide-h2', id: 'faq-title', text: 'よくある質問' }),
      h('div', { class: 'guide-faq' }, FAQ.map((f) => h('details', { class: 'faq' },
        h('summary', { class: 'faq-q', text: f.q }),
        h('p', { class: 'faq-a', text: f.a }))))),
  );
}
