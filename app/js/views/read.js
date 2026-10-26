import { h, append, icon, printContent } from '../dom.js';
import { renderSheet, pageHead } from '../components.js';
import { buildFullContent, ownerName } from '../logic.js';

// 手帖を読む：家族が、書かれた内容を書き換えずに読むための画面（入力欄を出さない）
export function renderRead(main, ctx) {
  const { store } = ctx;
  const sheet = () => renderSheet(buildFullContent(store.state), { ownerName: ownerName(store.state), kind: 'read', writtenAt: store.state.writtenAt });
  const body = sheet();
  // 目次：書かれている項目へ移る（アドレスの # は画面の切り替えに使っているので、ボタンで移る）
  const sections = [...body.querySelectorAll('[data-sec]')];
  const toc = sections.length > 1 ? h('nav', { class: 'read-toc', 'aria-label': '目次' },
    sections.map((sec) => h('button', {
      type: 'button', class: 'btn btn-quiet btn-small', text: sec.dataset.sec,
      onclick: () => {
        const head = sec.querySelector('.sheet-h');
        head.setAttribute('tabindex', '-1');
        head.focus({ preventScroll: true });
        sec.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      },
    }))) : null;
  append(main,
    h('p', { class: 'crumb' }, h('a', { href: '#/navi', text: 'もしものときへ戻る', dataset: { back: 'もしも' } })),
    pageHead('手帖を読む', 'ここでは書き換わりません。'),
    toc,
    h('div', { class: 'read-sheet' }, body),
    h('div', { class: 'stack-actions' },
      toc ? h('button', {
        type: 'button', class: 'btn btn-quiet',
        onclick: () => {
          toc.querySelector('button')?.focus({ preventScroll: true });
          toc.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        },
      }, h('span', { text: '目次へ戻る' })) : null,
      h('button', {
        type: 'button', class: 'btn btn-secondary needs-print',
        onclick: () => printContent(sheet(), 'sheet'),
      }, icon('print'), h('span', { text: '印刷' }))));
}
