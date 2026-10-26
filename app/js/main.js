// のこす手帖：起動とハッシュルーティング

import { createStore } from './store.js';
import { h, append, clear, icon, announce, confirmDialog, SHARE_MODE, DEMO_MODE } from './dom.js';
import { createEmptyState, STORAGE_KEY } from './logic.js';
import { demoState, isDemoSample } from './demo.js';
import { pageHead } from './components.js';
import { FONT_SIZES } from './views/settings.js';
import { renderHome } from './views/home.js';
import { renderNoteIndex, renderNoteList, renderNoteStep } from './views/note.js';
import { renderDigital } from './views/digital.js';
import { renderDisclosure } from './views/disclosure.js';
import { renderLetters, renderLetterEdit } from './views/letters.js';
import { renderNavi } from './views/navi.js';
import { renderExport } from './views/export.js';
import { renderSettings } from './views/settings.js';
import { renderGuide } from './views/guide.js';
import { renderRead } from './views/read.js';
import { setupPwa } from './pwa.js';
import { lockAvailable, showLock } from './lock.js';

const NAV = [
  { route: 'home', label: 'ホーム', icon: 'home' },
  { route: 'note', label: '手帖', icon: 'book' },
  { route: 'digital', label: 'デジタル遺品', icon: 'phone' },
  { route: 'disclosure', label: '見せ方', icon: 'eye' },
  { route: 'letters', label: '手紙', icon: 'letter' },
  { route: 'navi', label: 'もしものとき', icon: 'list' },
  { route: 'export', label: '印刷・控え', icon: 'print' },
  { route: 'settings', label: '設定', icon: 'gear' },
  { route: 'guide', label: '使い方', icon: 'help' },
];

// スマホ幅の下部タブバー（残りは「メニュー」から開く）
const TABS = [
  { route: 'home', label: 'ホーム', icon: 'home' },
  { route: 'note', label: '手帖', icon: 'book' },
  { route: 'disclosure', label: '見せ方', icon: 'eye', aria: '見せ方（誰に・いつ見せるか）' },
  { route: 'navi', label: 'もしも', icon: 'list', aria: 'もしものとき' },
];

const store = createStore(DEMO_MODE ? `${STORAGE_KEY}-demo` : STORAGE_KEY);
const main = document.getElementById('main');
const navList = document.getElementById('nav-list');
const tabLinks = document.getElementById('tab-links');
const menuBtn = document.getElementById('menu-toggle');
const fontBtn = document.getElementById('font-toggle');
const saveStatus = document.getElementById('save-status');
const banner = document.getElementById('storage-banner');
const appbar = document.getElementById('appbar');
const appbarTitle = document.getElementById('appbar-title');
const navBack = document.getElementById('nav-back');

// ── ナビゲーションバー（iOS 風）──
// 画面の「パンくず」リンクを、左上の戻るボタン（‹ 前の画面名）に写す。
// 大きなタイトルが見えなくなったら、バーの中央に小さなタイトルを出す。
let titleObserver = null;
function updateAppbar(title) {
  appbarTitle.textContent = title ? title.textContent : '';
  const crumb = main.querySelector('.crumb a');
  if (crumb) {
    const name = crumb.dataset.back || crumb.textContent;
    navBack.href = crumb.getAttribute('href');
    navBack.querySelector('.nav-back-text').textContent = name;
    navBack.setAttribute('aria-label', `${name}に戻る`);
    navBack.hidden = false;
  } else {
    navBack.hidden = true;
  }
  if (navBack.querySelector('.nav-back-icon').childElementCount === 0) navBack.querySelector('.nav-back-icon').append(icon('back'));
  document.body.classList.toggle('has-back', !navBack.hidden);

  titleObserver?.disconnect();
  appbar.classList.remove('is-scrolled');
  if (title && 'IntersectionObserver' in window) {
    titleObserver = new IntersectionObserver(([entry]) => {
      appbar.classList.toggle('is-scrolled', !entry.isIntersecting);
    }, { rootMargin: `-${appbar.offsetHeight}px 0px 0px 0px` });
    titleObserver.observe(title);
  }
}

// ── 文字の大きさ ──
function applySettings() {
  const size = store.state.settings.fontSize;
  document.documentElement.dataset.font = size;
  const label = FONT_SIZES.find((f) => f.value === size)?.label || '標準';
  fontBtn.querySelector('.font-toggle-value').textContent = label;
  fontBtn.setAttribute('aria-label', `文字の大きさ：いまは${label}。押すと切り替わります`);
}

fontBtn.addEventListener('click', () => {
  const i = FONT_SIZES.findIndex((f) => f.value === store.state.settings.fontSize);
  const next = FONT_SIZES[(i + 1) % FONT_SIZES.length];
  store.update((s) => { s.settings.fontSize = next.value; }, { immediate: true, meta: true });
  applySettings();
  announce(`文字の大きさを「${next.label}」にしました`);
  // 設定画面を開いているときはラジオボタンの表示もそろえる
  const radio = document.getElementById(`font-${next.value}`);
  if (radio) radio.checked = true;
});

// ── 自動保存の表示 ──
const STATUS_TEXT = {
  saving: '保存中',
  saved: '保存済み',
  error: '保存できませんでした',
  memory: 'この端末には保存されません',
};
store.subscribe((status) => {
  saveStatus.textContent = STATUS_TEXT[status] || '';
  saveStatus.dataset.state = status;
  if (status === 'saved' && !banner.hidden && banner.dataset.kind !== 'memory') banner.hidden = true;
  if (status === 'error') {
    showBanner('保存できませんでした。空き容量を確かめて、控えを保存してください。');
  }
});

function showBanner(text, kind = '', action = '控えを保存') {
  banner.dataset.kind = kind;
  banner.replaceChildren(h('p', { class: 'banner-text', text }), h('a', { class: 'btn btn-small', href: '#/export', text: action }));
  banner.hidden = false;
}

if (!store.persistent) {
  showBanner('この端末には保存されません。閉じる前に控えを保存してください。', 'memory');
  saveStatus.textContent = STATUS_TEXT.memory;
} else if (store.loadError) {
  showBanner('保存されていたデータを読み込めませんでした。空の手帖で始めています。データの控え（ファイル）があれば戻してください。', '', '控えから戻す');
}

// ── メニュー ──
function buildNav() {
  navList.replaceChildren(...NAV.map((n) => h('li', null,
    h('a', { class: 'nav-link', href: `#/${n.route}`, dataset: { route: n.route } }, icon(n.icon), h('span', { text: n.label })))));
  tabLinks.replaceChildren(...TABS.map((t) => h('a', {
    class: 'tab', href: `#/${t.route}`, dataset: { route: t.route }, 'aria-label': t.aria || null,
  }, h('span', { class: 'tab-icon' }, icon(t.icon)), h('span', { class: 'tab-label', text: t.label }))));
  menuBtn.querySelector('.menu-icon-slot').replaceChildren(icon('menu'));
}

// メニューを開いている間は、後ろの画面を操作・読み上げの対象から外す
const BEHIND_MENU = ['main', 'appbar', 'tab-links', 'stage-bar', 'storage-banner'].map((id) => document.getElementById(id))
  .concat([...document.querySelectorAll('.footer, .skip-link')]).filter(Boolean);
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  for (const el of BEHIND_MENU) el.inert = open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('.menu-toggle-label').textContent = open ? '閉じる' : 'メニュー';
  menuBtn.querySelector('.menu-icon-slot').replaceChildren(icon(open ? 'close' : 'menu'));
  if (open) navList.querySelector('a')?.focus();
}
menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
// メニューの外を押したら閉じる
document.addEventListener('click', (e) => {
  if (!document.body.classList.contains('menu-open')) return;
  // アイコンを差し替えると e.target が DOM から外れるので、composedPath で判定する
  if (e.composedPath().some((n) => n === menuBtn || n.id === 'sidenav')) return;
  setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
    setMenu(false);
    menuBtn.focus();
  }
});

function updateNav(route) {
  for (const a of [...navList.querySelectorAll('.nav-link'), ...tabLinks.querySelectorAll('.tab')]) {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  // タブバーにない画面（デジタル遺品など）では「メニュー」を現在地として示す
  menuBtn.classList.toggle('is-current', !TABS.some((t) => t.route === route));
}

// ── ルーティング ──
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const path = raw.split('?')[0];
  return path.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
}

let lastRouteKey = null;

function navigate(hash) {
  if (window.location.hash === hash) render();
  else window.location.hash = hash;
}

function notFound() {
  clear(main);
  append(main, 
    pageHead('ページが見つかりません', 'アドレスが変わったか、削除された内容です。'),
    h('a', { class: 'btn btn-primary', href: '#/home', text: 'ホームへ戻る' }),
  );
}

const ctx = {
  store,
  navigate,
  notFound,
  applySettings,
  rerender: (focusSelector) => render({ focusSelector }),
};

// ── 画面遷移の動き（View Transitions）──
// 同じタブの中で深くなれば forward、浅くなれば back、別のタブなら tab。同じ画面の描き直しでは動かさない
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// タブバーにない画面は、どの画面の「奥」にあるか（ホームの一覧やメニューから開く）
const PARENT = { digital: 'home', letters: 'home', export: 'home', settings: 'home', guide: 'home', read: 'navi' };
const tabOf = (seg) => PARENT[seg] || seg;
function navKind(prevKey, nextKey) {
  if (!prevKey) return null;
  const a = prevKey.split('/');
  const b = nextKey.split('/');
  const depth = (p) => p.length + (PARENT[p[0]] ? 1 : 0);
  if (tabOf(a[0]) !== tabOf(b[0])) return 'tab';
  // 1問ずつ：前の問いへ戻るときは「戻る」
  if (a.length === 3 && b.length === 3 && /^\d+$/.test(a[2]) && /^\d+$/.test(b[2])) return Number(b[2]) < Number(a[2]) ? 'back' : 'forward';
  return depth(b) >= depth(a) ? 'forward' : 'back';
}
// タブを切り替えたときに下から上がる動きは、起動してからタブごとに 1 回だけ（よく使う操作なので重くしない）
const risenTabs = new Set();

function render(opts = {}) {
  const routeKey = parseHash().join('/') || 'home';
  const kind = routeKey !== lastRouteKey ? navKind(lastRouteKey, routeKey) : null;
  if (!kind || !document.startViewTransition || document.body.classList.contains('is-locked')) {
    renderNow(opts);
    return;
  }
  const root = document.documentElement;
  const nav = reduceMotion.matches ? 'fade' : kind;
  root.dataset.nav = nav;
  const t = document.startViewTransition(() => {
    renderNow(opts);
    // タブを切り替えたときは、上から少しずつまとまりを出す
    const tab = tabOf(routeKey.split('/')[0]);
    if (kind === 'tab' && !reduceMotion.matches && !risenTabs.has(tab)) {
      risenTabs.add(tab);
      main.classList.add('is-entering');
      window.setTimeout(() => main.classList.remove('is-entering'), 700);
    }
  });
  // 続けて押したとき、前の遷移の後始末で次の遷移の向きを消さない
  t.finished.finally(() => { if (root.dataset.nav === nav) delete root.dataset.nav; });
}

function renderNow({ focusSelector } = {}) {
  // ロック中は描かない（開いたあとで描く）
  if (document.body.classList.contains('is-locked')) return;
  const parts = parseHash();
  const route = parts[0] || 'home';
  const routeKey = parts.join('/') || 'home';
  const isNewPage = routeKey !== lastRouteKey;
  const scrollY = window.scrollY;
  store.flush();

  clear(main);
  main.className = 'main';
  main.dataset.route = route;

  try {
    switch (route) {
      case 'home': renderHome(main, ctx); break;
      case 'note':
        if (!parts[1]) renderNoteIndex(main, ctx);
        else if (!parts[2]) renderNoteList(main, ctx, parts[1]);
        else renderNoteStep(main, ctx, parts[1], parts[2]);
        break;
      case 'digital': renderDigital(main, ctx); break;
      case 'disclosure': renderDisclosure(main, ctx); break;
      case 'letters':
        if (parts[1]) renderLetterEdit(main, ctx, parts[1]);
        else renderLetters(main, ctx);
        break;
      case 'navi': renderNavi(main, ctx); break;
      case 'export': renderExport(main, ctx); break;
      case 'settings': renderSettings(main, ctx); break;
      case 'guide': renderGuide(main, ctx); break;
      case 'read': renderRead(main, ctx); break;
      default: notFound();
    }
  } catch (err) {
    clear(main);
    append(main, 
      pageHead('画面を表示できませんでした', '入力した内容は保存されています。ホームに戻ってもう一度開いてください。'),
      h('p', { class: 'field-help', text: `くわしい情報：${err && err.message ? err.message : String(err)}` }),
      h('a', { class: 'btn btn-primary', href: '#/home', text: 'ホームへ戻る' }),
    );
  }

  updateNav(route === 'read' ? 'navi' : route); // 「手帖を読む」は「もしも」の中の画面
  if (document.body.classList.contains('menu-open')) setMenu(false);
  // 1問ずつモードでは「戻る・あとで・次へ」を画面下に固定するので、タブバーをしまう
  document.body.classList.toggle('is-step', main.classList.contains('has-stepbar'));

  const title = main.querySelector('h1');
  document.title = title && route !== 'home' ? `${title.textContent} | のこす手帖` : 'のこす手帖';
  updateAppbar(title);

  if (isNewPage) {
    window.scrollTo(0, 0);
    if (lastRouteKey !== null && title) {
      if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
  } else {
    window.scrollTo(0, scrollY);
    if (focusSelector) {
      let el = null;
      try { el = main.querySelector(focusSelector); } catch { /* 無効なセレクタは無視 */ }
      if (el) el.focus({ preventScroll: false });
    }
  }
  lastRouteKey = routeKey;
}

window.addEventListener('hashchange', () => render());
// iPhone の Safari で、押したときの見た目（:active）が出るようにする
document.addEventListener('touchstart', () => {}, { passive: true });

// 「本文へ移動」：ハッシュを変えずに本文へフォーカスを移す（#main はルートとして扱わない）
document.querySelector('.skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
  main.scrollIntoView();
});

// ほかのタブ・ウィンドウで保存されたら、読み直して表示をそろえる
window.addEventListener('storage', (e) => {
  if (e.key !== store.key || e.storageArea !== window.localStorage) return;
  if (!store.reload()) return;
  applySettings();
  render();
});
window.addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});

// ステージング（デモ）版：はじめて開いた人には記入例を入れ、上に帯を出す
function buildStageBar() {
  const bar = document.getElementById('stage-bar');
  if (!bar) return;
  bar.hidden = false;
  bar.replaceChildren(
    h('p', { class: 'stage-bar-text' },
      h('span', { class: 'stage-bar-label', text: 'ステージング環境' }),
      h('span', { text: '架空の人の記入例です。' })),
    h('div', { class: 'stage-bar-actions' },
      h('button', {
        type: 'button', class: 'btn btn-small btn-quiet', text: '空にする',
        onclick: async () => {
          const ok = await confirmDialog({ title: '空の手帖にしますか', message: '記入例を消して、最初から書けるようにします。「サンプルに戻す」でいつでも戻せます。', okLabel: '空にする' });
          if (!ok) return;
          store.replace(createEmptyState());
          applySettings();
          announce('空の手帖にしました');
          navigate('#/home');
        },
      }),
      h('button', {
        type: 'button', class: 'btn btn-small btn-quiet', text: '見本に戻す',
        onclick: async () => {
          const ok = await confirmDialog({ title: '記入例に戻しますか', message: 'いま入っている内容は消え、最初の記入例に置き換わります。', okLabel: 'サンプルに戻す' });
          if (!ok) return;
          store.replace(demoState());
          applySettings();
          announce('記入例に戻しました');
          navigate('#/home');
        },
      })));
}

if (SHARE_MODE) {
  document.body.classList.add('share-mode');
  if (!document.documentElement.lang) document.documentElement.lang = 'ja';
}
if (DEMO_MODE) {
  if (!store.hadData) store.replace(demoState());
  buildStageBar();
}
// 暗証番号のロック：開いたとき、しばらく離れて戻ったときに番号を聞く
const RELOCK_MS = 5 * 60 * 1000;
async function unlockIfNeeded() {
  if (!store.state.settings.lockHash || !lockAvailable()) return;
  clear(main);
  await showLock(store.state.settings, {
    onForgot: async () => {
      const ok = await confirmDialog({
        title: '最初からにしますか',
        message: 'この端末の手帖をすべて消して、ロックを外します。データの控え（ファイル）があれば、あとで戻せます。',
        okLabel: 'すべて消す', danger: true,
      });
      if (!ok) return false;
      store.reset();
      applySettings();
      return true;
    },
  });
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS && store.state.settings.lockHash && !document.body.classList.contains('is-locked')) {
    await unlockIfNeeded();
    render();
  }
});

// ホーム画面に置くアプリ（記入例入りの版と共有版では使わない）
setupPwa({ shareMode: SHARE_MODE || DEMO_MODE });

buildNav();
applySettings();
if (!window.location.hash) window.history.replaceState(null, '', '#/home');
unlockIfNeeded().then(async () => {
  render();
  // 本番に以前の記入例が残っていたら（以前のステージング版を開いたことがある人）、空にするか確かめる
  // 「このまま」を選んだ人には、次から聞かない
  const KEEP_KEY = `${store.key}-keep-sample`;
  let kept = false;
  try { kept = window.localStorage.getItem(KEEP_KEY) === '1'; } catch { /* 覚えられなくても聞くだけ */ }
  if (!DEMO_MODE && !SHARE_MODE && !kept && store.hadData && isDemoSample(store.state)) {
    const ok = await confirmDialog({ title: '見本の手帖が残っています', message: '以前に開いた、架空の人の記入例です。空の手帖にしますか。', okLabel: '空にする', cancelLabel: 'このまま' });
    if (!ok) {
      try { window.localStorage.setItem(KEEP_KEY, '1'); } catch { /* 何もしない */ }
      return;
    }
    store.replace(createEmptyState());
    applySettings();
    navigate('#/home');
  }
});
