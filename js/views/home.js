import { h, append, icon, tileIcon, announce, SHARE_MODE } from '../dom.js';
import { renderQuestion } from '../components.js';
import {
  overallProgress, pickTodayQuestion, todayKey, disclosureWarnings, isAnswered, formatAnswer, backupReminder,
} from '../logic.js';
import { CATEGORIES, questionsOf, questionById } from '../questions.js';

// 設定アプリ風の一覧。下のタブ（手帖・見せ方・もしも）にない画面だけを並べる
export const FEATURES = [
  { href: '#/digital', icon: 'phone', color: 'blue', label: 'デジタル遺品' },
  { href: '#/letters', icon: 'letter', color: 'orange', label: '手紙' },
  { href: '#/export', icon: 'print', color: 'gray', label: '印刷・控え' },
  { href: '#/settings', icon: 'gear', color: 'gray', label: '設定' },
];

let todayOffset = 0;

const RING_R = 26;
const RING_LEN = 2 * Math.PI * RING_R;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// 起動してから 1 回だけ見せる動き（輪が伸びる、写真がゆっくり動く）を覚えておく
const once = (key) => {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch { /* 覚えられなくても動きは 1 回出るだけ */ }
  return true;
};

/** 記入の進み具合を示す輪（1 本だけ）。最初に 1 回作り、更新では伸びる量だけ変える。数字は必ず文字でも添える */
function makeRing() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('aria-hidden', 'true');
  const circle = (cls) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '32'); c.setAttribute('cy', '32'); c.setAttribute('r', String(RING_R));
    c.setAttribute('class', cls);
    svg.append(c);
    return c;
  };
  circle('ring-track');
  const fill = circle('ring-fill');
  fill.style.setProperty('--len', String(RING_LEN));
  return { svg, fill };
}

export function renderHome(main, ctx) {
  const { store } = ctx;
  const state = store.state;
  const today = todayKey();
  const name = state.settings.name.trim();

  // 進み具合（今日の1問に答えると更新する）
  const { svg: ringSvg, fill: ringFill } = makeRing();
  const ringSlot = h('span', { class: 'progress-ring' }, ringSvg);
  // 輪が見えているとき（1問以上書いたとき）だけ、起動して 1 回伸ばす
  if (!reduceMotion() && overallProgress(store.state.answers).answered > 0 && once('ring-intro')) ringFill.classList.add('is-intro');
  let lastAnswered = null;
  const progressNum = h('p', { class: 'progress-num' });
  const progressBtn = h('a', { class: 'btn btn-secondary btn-small', href: '#/note', text: '続きを書く' });
  // まだ1問も書いていないときは「46問」を見せない（多く感じるため）。1問答えたら出す
  const progressSection = h('section', { class: 'group', 'aria-label': '手帖の進み具合' },
    h('div', { class: 'group-body progress-card' },
      ringSlot,
      h('div', { class: 'progress-text' }, progressNum),
      progressBtn));
  const setOverall = () => {
    const o = overallProgress(store.state.answers);
    ringFill.style.setProperty('--off', String(RING_LEN * (1 - Math.max(0, Math.min(1, o.ratio)))));
    const num = h('strong', { text: String(o.answered) });
    // 今日の1問に答えて数が増えたときだけ、数字を少しはずませる
    if (lastAnswered !== null && o.answered > lastAnswered) num.classList.add('is-bump');
    lastAnswered = o.answered;
    progressNum.replaceChildren(num, ` ／ ${o.total}問`);
    progressSection.hidden = o.answered === 0;
  };
  setOverall();

  // 今日の1問
  const todaySlot = h('div', { class: 'today-slot' });
  const renderToday = () => {
    // まだ何も書いていない人の最初の1問は、答えやすい「お名前と生年月日」にする（重い問いから始めない）
    const first = overallProgress(store.state.answers).answered === 0 && todayOffset === 0;
    const q = first ? questionById('me.profile') : pickTodayQuestion(store.state.answers, store.state.skipped, today, todayOffset);
    if (!q) {
      todaySlot.replaceChildren(h('section', { class: 'today', 'aria-labelledby': 'today-label' },
        h('h2', { class: 'today-label today-pill', id: 'today-label', text: '今日の1問' }),
        h('p', { class: 'today-done', text: '全部、書けました。' }),
        h('a', { class: 'btn btn-secondary', href: '#/disclosure', text: '見せ方を決める' })));
      return;
    }
    const msg = h('p', { class: 'today-msg', role: 'status' });
    todaySlot.replaceChildren(h('section', { class: 'today', 'aria-labelledby': 'today-label' },
      h('h2', { class: 'today-label today-pill', id: 'today-label', tabindex: '-1', text: '今日の1問' }),
      // 輪と数字は「保存する」を押したときに動かす（選んだ瞬間には動かさない）
      renderQuestion(q, ctx, { mode: 'card', onChange: () => { msg.textContent = ''; } }),
      msg,
      h('div', { class: 'today-actions' },
        h('button', {
          type: 'button', class: 'btn btn-primary', text: '保存する',
          onclick: () => {
            if (!isAnswered(q, store.state.answers[q.id])) {
              msg.textContent = 'まだ空欄です。';
              return;
            }
            store.flush();
            // カードの中身を、なめらかに「保存しました」へ入れ替える
            if (document.startViewTransition && !reduceMotion()) document.startViewTransition(() => renderSaved(q));
            else renderSaved(q);
          },
        }),
        h('button', {
          type: 'button', class: 'btn btn-quiet',
          onclick: () => { todayOffset += 1; renderToday(); todaySlot.querySelector('#today-label')?.focus(); },
          text: '別の質問',
        }))));
  };

  // 保存したあと：保存した内容を見せ、「続ける」と「別の質問にする」を選んでもらう
  const renderSaved = (q) => {
    const cat = CATEGORIES.find((c) => c.id === q.cat);
    const qs = questionsOf(q.cat);
    const next = qs.indexOf(q) + 2; // 同じカテゴリの次の問い（1から数える）
    const lines = formatAnswer(q, store.state.answers[q.id], store.state);
    todaySlot.replaceChildren(h('section', { class: 'today today-saved', 'aria-labelledby': 'today-label' },
      h('h2', { class: 'today-label', id: 'today-label', tabindex: '-1' },
        h('span', { class: 'today-saved-mark', 'aria-hidden': 'true' }, icon('check')),
        h('span', { text: '保存しました' })),
      h('div', { class: 'today-saved-body' },
        h('p', { class: 'today-saved-q', text: q.title }),
        lines.map((l) => h('p', { class: 'today-saved-a', text: l }))),
      h('div', { class: 'today-actions' },
        h('a', {
          class: 'btn btn-primary',
          href: next <= qs.length ? `#/note/${q.cat}/${next}` : `#/note/${q.cat}/done`,
          'aria-label': `続ける（${cat.name}の次の質問へ）`,
          text: '続ける',
        }),
        h('button', {
          type: 'button', class: 'btn btn-quiet', text: '別の質問',
          onclick: () => { renderToday(); todaySlot.querySelector('#today-label')?.focus(); },
        }))));
    setOverall();
    announce('保存しました');
    todaySlot.querySelector('#today-label')?.focus();
  };
  renderToday();

  // 書き始めた人にだけ、開示設定の注意を知らせる
  const overall = overallProgress(state.answers);
  const warnCount = overall.answered > 0 ? disclosureWarnings(state).filter((w) => w.level === 'warn').length : 0;
  // 書いた内容は端末の中だけにあるので、ある程度書いたらバックアップを勧める（共有版は書き出せないので出さない）
  const backup = SHARE_MODE ? null : backupReminder(state);

  const row = (f) => h('li', null,
    h('a', { class: 'list-row', href: f.href },
      tileIcon(f.icon, f.color),
      h('span', { class: 'list-row-text' },
        h('span', { class: 'list-row-title', text: f.label }),
        f.sub ? h('span', { class: 'list-row-sub', text: f.sub }) : null),
      h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron'))));

  const featureCard = h('a', { class: 'feature-card', href: '#/guide' },
    h('img', { class: 'feature-card-img', src: 'img/hero.jpg', alt: '', width: 1200, height: 670 }),
    h('span', { class: 'feature-card-text' },
      h('span', { class: 'feature-card-title', text: '使い方' })));
  // 写真は画面に 4 割入ったら、起動して 1 回だけ、寄った位置からゆっくり戻って止まる（5 秒未満）
  if (!reduceMotion() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (once('photo-intro')) featureCard.classList.add('is-inview');
    }, { threshold: 0.4 });
    io.observe(featureCard);
  }

  append(main,
    h('header', { class: 'page-head home-head' },
      h('h1', { class: 'page-title', id: 'page-title', tabindex: '-1', text: name ? `${name}さんの手帖` : 'わたしの手帖' }),
      overall.answered === 0 ? h('p', { class: 'page-lead', text: '答えるだけの終活ノート。書いた内容はこの端末の中だけです。' }) : null),

    // 今日の1問（いちばん上に出し、開いてすぐ書けるようにする）
    todaySlot,

    progressSection,

    // お知らせ（見せ方の確認、控えの保存）は 1 つのまとまりに
    warnCount || backup ? h('section', { class: 'group', 'aria-label': 'お知らせ' },
      h('ul', { class: 'group-body list' },
        warnCount ? h('li', null, h('a', { class: 'list-row', href: '#/disclosure' },
          tileIcon('warn', 'red'),
          h('span', { class: 'list-row-text' },
            h('span', { class: 'list-row-title', text: `見せ方に確認が${warnCount}件` })),
          h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron')))) : null,
        backup ? h('li', null, h('a', { class: 'list-row', href: '#/export' },
          tileIcon('doc', 'orange'),
          h('span', { class: 'list-row-text' },
            h('span', { class: 'list-row-title', text: backup.never ? '控えをまだ保存していません' : '半年以上、控えを保存していません' })),
          h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron')))) : null)) : null,

    // 使い方（写真のカード）
    featureCard,

    h('section', { class: 'group', 'aria-label': 'ほかの機能' },
      h('ul', { class: 'group-body list' }, FEATURES.map(row))),
  );
}
