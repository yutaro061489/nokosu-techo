// DOM の小さな道具。文字列はすべて textContent / テキストノードとして入れる（XSS 対策）。

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  let value;
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') value = v; // <select> は選択肢を入れてから値を設定する
      else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'hidden') el[k] = !!v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  if (value !== undefined) el.value = value;
  return el;
}

export function append(el, ...children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** 共有版（claude.ai の Artifact）では印刷とファイルの保存ができない。ページに #share-mode があれば共有版 */
export const SHARE_MODE = typeof document !== 'undefined' && !!document.getElementById('share-mode');
/** ステージング（デモ）版：はじめて開いた人に記入例を入れ、上に帯を出す。ページに #demo-mode があればデモ版 */
export const DEMO_MODE = typeof document !== 'undefined' && !!document.getElementById('demo-mode');

let idSeq = 0;
export function nextId(prefix = 'f') {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

// アイコン：固定の SVG パスだけを使う（利用者の入力は含まない）。必ず文字ラベルと一緒に置く。
const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-5.5h4V20',
  book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5zM11 4h2',
  phone: 'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3zM10.5 18h3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
  letter: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7',
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4 6.2l1 1 2-2.2M4 11.7l1 1 2-2.2M4 17.2l1 1 2-2.2',
  print: 'M7 9V3.5h10V9M7 17.5H4.5v-7A1.5 1.5 0 0 1 6 9h12a1.5 1.5 0 0 1 1.5 1.5v7H17M7 14h10v6.5H7z',
  gear: 'M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8h.01',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  key: 'M14.5 4a5.5 5.5 0 1 1-4.9 8L3.5 18v2.5H6v-2h2v-2h2l1.6-1.6A5.5 5.5 0 0 1 14.5 4zM16 7.5h.01',
  // 手帖のカテゴリ・リストの付属表示
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 13.6A6.5 6.5 0 0 1 21.5 20',
  yen: 'M6 4l6 8 6-8M12 12v8M7.5 13h9M7.5 16.5h9',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6zM8.8 12l2.3 2.3 4.2-4.6',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  flower: 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 9.5V5a3 3 0 0 1 3 3M12 14.5V20M9.5 12H5a3 3 0 0 1 3-3M14.5 12H19a3 3 0 0 1-3 3M12 5a3 3 0 0 0-3 3M5 12a3 3 0 0 0 3 3M19 12a3 3 0 0 0-3-3',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 11.5h6M9.5 15h6M9.5 18h4',
  paw: 'M7 9.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17 9.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM10 6.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM14 6.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM12 11c-3 0-5.5 3.6-5.5 6.2 0 2 1.6 2.8 3 2.3 1-.3 1.6-.8 2.5-.8s1.5.5 2.5.8c1.4.5 3-.3 3-2.3 0-2.6-2.5-6.2-5.5-6.2z',
  chat: 'M4 5.5h16v10.5H9.5L5 20v-4H4zM8 9.5h8M8 12.5h5',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 4.5 7.5 12l7.5 7.5',
  warn: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.8h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  play: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l5.5-3.5z',
};

/** 設定アプリ風の色つき角丸アイコン（色は CSS の --tile-<color>） */
export function tileIcon(name, color) {
  return h('span', { class: `tile-icon tile-${color}`, 'aria-hidden': 'true' }, icon(name));
}

export function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'icon');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name] || '');
  svg.append(path);
  return svg;
}

// ── 確認ダイアログ（<dialog> を使い、キーボード・読み上げに対応） ──
export function confirmDialog({ title, message, okLabel = 'はい', cancelLabel = 'やめる', danger = false, details = [] }) {
  return new Promise((resolve) => {
    const titleId = nextId('dlg');
    const dlg = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
      h('h2', { id: titleId, class: 'dialog-title', text: title }),
      message ? h('p', { text: message }) : null,
      details.length ? h('ul', { class: 'dialog-details' }, details.map((d) => h('li', { text: d }))) : null,
      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn btn-quiet', value: 'cancel', text: cancelLabel, onclick: () => dlg.close('cancel') }),
        h('button', { type: 'button', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, value: 'ok', text: okLabel, onclick: () => dlg.close('ok') }),
      ));
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok');
      // 閉じる動き（0.16 秒）が見えるよう、少し待ってから消す
      window.setTimeout(() => dlg.remove(), 200);
    });
    document.body.append(dlg);
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
      dlg.querySelector('.btn-quiet')?.focus();
    } else {
      // <dialog> 非対応の古いブラウザ
      dlg.remove();
      resolve(window.confirm(`${title}\n${message || ''}`));
    }
  });
}

// ── 印刷：#print-root に中身を入れて印刷し、終わったら片づける ──
export function printContent(node, mode = 'sheet') {
  const root = document.getElementById('print-root');
  if (!root) return;
  clear(root).append(node);
  document.body.dataset.print = mode;
  const cleanup = () => {
    delete document.body.dataset.print;
    clear(root);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

// ── 読み上げ用のお知らせ ──
export function announce(message) {
  const live = document.getElementById('live-region');
  if (!live) return;
  live.textContent = '';
  window.setTimeout(() => { live.textContent = message; }, 30);
}
