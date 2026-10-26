import { h, append, icon, tileIcon } from '../dom.js';
import { pageHead, renderQuestion, statusTag, pageHero } from '../components.js';
import { categoryProgress, isAnswered } from '../logic.js';
import { CATEGORIES, questionsOf, PEOPLE_QUESTION_ID } from '../questions.js';

function modeSwitch(catId, current) {
  return h('nav', { class: 'mode-switch', 'aria-label': '表示のしかた' },
    h('a', { href: `#/note/${catId}`, class: 'mode-link', 'aria-current': current === 'list' ? 'page' : null, text: '一覧' }),
    h('a', { href: `#/note/${catId}/1`, class: 'mode-link', 'aria-current': current === 'step' ? 'page' : null, text: '1問ずつ' }));
}

/** カテゴリごとのアイコンと色（設定アプリ風） */
export const CATEGORY_ICONS = {
  me: ['person', 'blue'], family: ['people', 'green'], money: ['yen', 'orange'],
  insurance: ['shield', 'teal'], medical: ['heart', 'red'], funeral: ['flower', 'indigo'],
  will: ['doc', 'gray'], pet: ['paw', 'brown'], words: ['chat', 'pink'],
};

/** #/note ：カテゴリの一覧 */
export function renderNoteIndex(main, ctx) {
  const progress = categoryProgress(ctx.store.state.answers);
  append(main,
    pageHero({ img: 'note' }, '手帖', null),
    h('section', { class: 'group', 'aria-label': 'カテゴリ' },
      h('ol', { class: 'group-body list cat-list' }, CATEGORIES.map((c, i) => {
        const p = progress[i];
        const [ic, color] = CATEGORY_ICONS[c.id] || ['book', 'blue'];
        return h('li', { class: 'cat-card' },
          h('a', { class: 'list-row', href: `#/note/${c.id}`, 'aria-label': `${c.name}、${p.total}問中${p.answered}問記入済み` },
            tileIcon(ic, color),
            h('span', { class: 'list-row-text' },
              h('span', { class: 'list-row-title', text: c.name })),
            h('span', { class: 'list-row-value', text: `${p.answered}/${p.total}` }),
            h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron'))));
      }))),
  );
}

/** #/note/:cat ：カテゴリの設問を一覧で */
export function renderNoteList(main, ctx, catId) {
  const idx = CATEGORIES.findIndex((c) => c.id === catId);
  if (idx < 0) return ctx.notFound();
  const cat = CATEGORIES[idx];
  const qs = questionsOf(catId);
  const progressText = h('p', { class: 'cat-progress', 'aria-live': 'polite' });
  const refresh = () => {
    const p = categoryProgress(ctx.store.state.answers)[idx];
    progressText.textContent = `${p.answered}／${p.total}問`;
  };
  refresh();
  const prev = CATEGORIES[idx - 1];
  const next = CATEGORIES[idx + 1];
  const opts = { mode: 'list', onChange: refresh };
  const list = h('div', { class: 'q-list' }, qs.map((q) => renderQuestion(q, ctx, opts)));
  // 同じ画面で人を登録・編集したら、人を選ぶ設問（最初に連絡してほしい人など）の選択肢もそろえる
  if (qs.some((q) => q.id === PEOPLE_QUESTION_ID) && qs.some((q) => q.type === 'person')) {
    list.addEventListener('focusout', (e) => {
      // 欄の作り直しで外れた要素からの focusout は無視する
      if (!e.target.isConnected) return;
      const people = e.target.closest?.(`[data-qid="${PEOPLE_QUESTION_ID}"]`);
      if (!people || people.contains(e.relatedTarget)) return;
      // 今の操作（ボタンを押して欄を作り直す途中など）が終わってから差し替える
      window.setTimeout(() => {
        if (!people.isConnected) return;
        for (const q of qs.filter((x) => x.type === 'person')) {
          const old = list.querySelector(`[data-qid="${q.id}"]`);
          if (!old) continue;
          const fresh = renderQuestion(q, ctx, opts);
          const moved = old.contains(document.activeElement) ? document.activeElement : null;
          old.replaceWith(fresh);
          // フォーカスが差し替えた設問の中にあったら、同じ選択肢に戻す
          if (moved?.value) fresh.querySelector(`input[value="${CSS.escape(moved.value)}"]`)?.focus();
        }
      }, 0);
    });
  }
  append(main, 
    h('p', { class: 'crumb' }, h('a', { href: '#/note', text: '手帖の目次へ戻る', dataset: { back: '手帖' } })),
    pageHead(cat.name, cat.lead, progressText, modeSwitch(catId, 'list')),
    list,
    h('nav', { class: 'pager', 'aria-label': 'カテゴリの移動' },
      prev ? h('a', { class: 'btn btn-quiet pager-prev', href: `#/note/${prev.id}`, text: `‹ ${prev.name}`, 'aria-label': `前のカテゴリ：${prev.name}` }) : h('span'),
      next ? h('a', { class: 'btn btn-secondary pager-next', href: `#/note/${next.id}`, text: `${next.name} ›`, 'aria-label': `次のカテゴリ：${next.name}` })
        : h('a', { class: 'btn btn-secondary pager-next', href: '#/disclosure', text: '見せ方を決める' })),
  );
}

/** #/note/:cat/:n ：1画面1問 */
export function renderNoteStep(main, ctx, catId, n) {
  const idx = CATEGORIES.findIndex((c) => c.id === catId);
  if (idx < 0) return ctx.notFound();
  const cat = CATEGORIES[idx];
  const qs = questionsOf(catId);
  const nextCat = CATEGORIES[idx + 1];

  if (n === 'done') {
    append(main, 
      h('div', { class: 'step-done' },
        h('h1', { class: 'page-title', id: 'page-title', tabindex: '-1', text: `「${cat.name}」ひと区切り` }),
        h('ul', { class: 'step-summary' }, qs.map((q) => h('li', null, statusTag(q, ctx.store.state), h('span', { text: q.title })))),
        h('div', { class: 'stack-actions' },
          nextCat ? h('a', { class: 'btn btn-primary', href: `#/note/${nextCat.id}/1`, text: `次は「${nextCat.name}」` }) : null,
          h('a', { class: 'btn btn-secondary', href: `#/note/${catId}`, text: '見直す' }),
          h('a', { class: 'btn btn-quiet', href: '#/home', text: 'ホーム' }))));
    return;
  }

  const i = Math.min(Math.max(parseInt(n, 10) || 1, 1), qs.length) - 1;
  const q = qs[i];
  const goNext = () => ctx.navigate(i + 1 < qs.length ? `#/note/${catId}/${i + 2}` : `#/note/${catId}/done`);

  main.classList.add('has-stepbar');
  append(main, 
    h('p', { class: 'crumb' }, h('a', { href: `#/note/${catId}`, text: `「${cat.name}」の一覧へ`, dataset: { back: cat.name } })),
    h('div', { class: 'step-head' },
      // カテゴリ名は上のバーの「‹ カテゴリ名」で分かるので、ここには出さない
      h('p', { class: 'step-count' },
        // 「あとで」で飛ばした問いに戻ってきたときは、そのことがわかるように
        ctx.store.state.skipped[q.id] && !isAnswered(q, ctx.store.state.answers[q.id]) ? h('span', { class: 'tag tag-later', text: 'あとで' }) : null,
        h('span', { class: 'step-count-num', text: `${i + 1}／${qs.length}問目` })),
      h('div', { class: 'step-bar', role: 'progressbar', 'aria-label': `${cat.name}の進み具合`, 'aria-valuemin': '1', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(i + 1) },
        h('span', { class: 'step-bar-fill', style: `width:${((i + 1) / qs.length) * 100}%` }))),
    renderQuestion(q, ctx, { mode: 'step' }),
    // 「戻る」「あとで」「次へ」は常に同じ位置（画面下に固定）
    h('nav', { class: 'stepbar', 'aria-label': '質問の移動' },
      h('a', { class: 'btn btn-quiet stepbar-back', href: i > 0 ? `#/note/${catId}/${i}` : `#/note/${catId}`, text: '戻る' }),
      h('button', {
        type: 'button', class: 'btn btn-secondary stepbar-later', text: 'あとで',
        onclick: () => {
          ctx.store.update((s) => { s.skipped[q.id] = true; });
          goNext();
        },
      }),
      h('button', { type: 'button', class: 'btn btn-primary stepbar-next', text: '次へ', onclick: goNext })),
  );
}
