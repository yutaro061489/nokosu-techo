import { h, append, icon, nextId, confirmDialog, announce } from '../dom.js';
import { pageHead, fieldInput, pageHero } from '../components.js';
import {
  getPeople, personRelation, uid, letterTimingLabel, personName,
} from '../logic.js';

// 手紙はどれも「亡くなったあと」に渡る。ここで選ぶのは、受け取った人に開けてほしいとき
const TIMINGS = [
  { value: 'date', label: '日付を決める' },
  { value: 'event', label: '出来事を決める' },
  { value: 'after', label: '特に決めない' },
];
const EVENTS = ['結婚', '出産', '成人', '入学', '卒業', '就職', '還暦', '家を建てたとき', 'つらいことがあったとき'];

export function renderLetters(main, ctx) {
  const { store } = ctx;
  // 書きかけのまま何も書かれなかった手紙は、一覧に戻ったときに片づける
  const written = (l) => String(l.title || '').trim() || String(l.body || '').trim();
  if (!store.state.letters.every(written)) store.update((s) => { s.letters = s.letters.filter(written); });
  const letters = store.state.letters;
  const toLabel = (l) => {
    if (!l.to) return '宛先なし';
    const name = personName(store.state, l.to);
    return name ? `${name}さんへ` : '宛先の人が削除されています';
  };
  append(main, 
    pageHero({ img: 'letters', photo: 'photo-letters', photoAlt: '木のテーブルで封筒に宛名を書く手' }, '手紙', null),
    h('button', {
      type: 'button', class: 'btn btn-primary',
      onclick: () => {
        const id = uid();
        const first = getPeople(store.state)[0];
        store.update((s) => {
          s.letters.push({ id, to: first ? first.id : '', timing: 'after', date: '', event: '', title: '', body: '', createdAt: new Date().toISOString() });
        }, { immediate: true });
        ctx.navigate(`#/letters/${encodeURIComponent(id)}`);
      },
    }, icon('plus'), h('span', { text: '手紙を書く' })),
    letters.length
      ? h('ul', { class: 'letter-list' }, letters.map((l) => h('li', null,
        h('a', { class: 'letter-card', href: `#/letters/${encodeURIComponent(l.id)}` },
          h('span', { class: 'letter-to', text: toLabel(l) }),
          h('span', { class: 'letter-title', text: l.title || '（題名なし）' }),
          h('span', { class: 'letter-timing', text: letterTimingLabel(l) })))))
      : h('p', { class: 'page-note', text: '亡くなったあと、家族に渡る手紙です。' }),
  );
}

export function renderLetterEdit(main, ctx, letterId) {
  const { store } = ctx;
  const letter = store.state.letters.find((l) => l.id === letterId);
  if (!letter) {
    append(main, pageHead('手紙が見つかりません', '削除されたか、別の端末で書かれた手紙です。'),
      h('a', { class: 'btn btn-secondary', href: '#/letters', text: '手紙の一覧へ戻る' }));
    return;
  }
  const people = getPeople(store.state);
  const set = (key) => (v) => store.update((s) => {
    const l = s.letters.find((x) => x.id === letterId);
    if (l) l[key] = v;
  });

  const timingName = nextId('tm');
  const whenSlot = h('div', { class: 'when-slot' });
  const renderWhen = () => {
    const l = store.state.letters.find((x) => x.id === letterId);
    if (l.timing === 'date') {
      whenSlot.replaceChildren(fieldInput({ key: 'date', label: '開けてほしい日', type: 'date' }, l.date, set('date')));
    } else if (l.timing === 'event') {
      const listId = nextId('ev');
      whenSlot.replaceChildren(fieldInput({ key: 'event', label: '出来事', type: 'text', placeholder: '例：結婚' }, l.event, set('event'), {
        after: h('datalist', { id: listId }, EVENTS.map((e) => h('option', { value: e }))),
      }));
      whenSlot.querySelector('input').setAttribute('list', listId);
    } else {
      whenSlot.replaceChildren();
    }
  };
  renderWhen();

  const toId = nextId('to');
  append(main, 
    h('p', { class: 'crumb' }, h('a', { href: '#/letters', text: '手紙の一覧へ戻る', dataset: { back: '手紙' } })),
    pageHead('手紙を書く', null),
    h('div', { class: 'letter-form' },
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: toId, text: '宛先' }),
        people.length
          ? h('select', { id: toId, class: 'input', value: people.some((p) => p.id === letter.to) ? letter.to : '', onchange: (e) => set('to')(e.target.value) },
            h('option', { value: '', text: '選んでください' }),
            people.map((p) => h('option', { value: p.id, text: `${p.name}（${personRelation(p)}）` })))
          : h('p', { class: 'q-note' }, '宛先にする人を先に登録してください。', h('a', { href: '#/note/family', text: '家族・大切な人を登録する' }))),
      h('fieldset', { class: 'field' },
        h('legend', { class: 'field-label', text: 'いつ開けてほしいか' }),
        h('div', { class: 'choices choices-inline' }, TIMINGS.map((t) => {
          const id = nextId('ti');
          return h('label', { class: 'choice', for: id },
            h('input', {
              type: 'radio', id, name: timingName, value: t.value, checked: letter.timing === t.value,
              onchange: () => { set('timing')(t.value); renderWhen(); },
            }),
            h('span', { class: 'choice-label', text: t.label }));
        }))),
      whenSlot,
      h('p', { class: 'q-note', text: '手紙は「亡くなったあと」の受け渡しシートに、開けてほしい日や出来事と一緒に印字されます。' }),
      fieldInput({ key: 'title', label: '題名', type: 'text', placeholder: '例：結婚するあなたへ' }, letter.title, set('title')),
      fieldInput({ key: 'body', label: '本文', type: 'textarea', rows: 10 }, letter.body, set('body'))),
    h('div', { class: 'stack-actions' },
      h('a', { class: 'btn btn-primary', href: '#/letters', text: '完了' }),
      h('button', {
        type: 'button', class: 'btn btn-danger-quiet',
        onclick: async () => {
          const ok = await confirmDialog({ title: 'この手紙を削除しますか', message: '削除した手紙は元に戻せません。', okLabel: '削除する', danger: true });
          if (!ok) return;
          store.update((s) => { s.letters = s.letters.filter((x) => x.id !== letterId); }, { immediate: true });
          announce('手紙を削除しました');
          // 「戻る」で削除した手紙の画面に戻らないよう、履歴を置き換える
          window.location.replace('#/letters');
        },
      }, icon('trash'), h('span', { text: '削除' }))),
  );
}
