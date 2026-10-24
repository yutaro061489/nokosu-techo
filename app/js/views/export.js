import { h, append, icon, tileIcon, confirmDialog, announce, printContent, SHARE_MODE } from '../dom.js';
import { renderSheet, pageHero, notice, emergencyCard } from '../components.js';
import {
  getPeople, buildFullContent, buildBackup, parseBackup, overallProgress,
  todayKey, formatDateJa,
} from '../logic.js';

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderExport(main, ctx) {
  const { store } = ctx;
  const ownerName = store.state.settings.name;

  // 自分用の控え（すべての内容）。中身は開いたときだけ作る
  const fullFrame = h('div', { class: 'preview-frame', role: 'region', 'aria-label': '自分用の控えの中身' });
  const fullDetails = h('details', { class: 'ds-more export-full' },
    h('summary', { class: 'ds-more-summary', text: '中身を見る' }),
    h('div', { class: 'ds-preview-body' }, fullFrame));
  fullDetails.addEventListener('toggle', () => {
    if (fullDetails.open) fullFrame.replaceChildren(renderSheet(buildFullContent(store.state), { ownerName, kind: 'full' }));
  });

  // バックアップの読み込み
  const fileInput = h('input', {
    type: 'file', id: 'import-file', accept: 'application/json,.json', hidden: true, tabindex: '-1',
    'aria-label': 'バックアップファイルを選ぶ',
    onchange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const text = await file.text();
      const result = parseBackup(text);
      if (!result.ok) {
        importMsg.textContent = result.error;
        importMsg.className = 'notice-text form-error';
        return;
      }
      const p = overallProgress(result.state.answers);
      const ok = await confirmDialog({
        title: 'いまのデータを上書きしますか',
        message: '読み込むと、この端末に保存されている内容はすべて置き換わります。',
        details: [
          `ファイル名：${file.name}`,
          result.exportedAt ? `書き出した日時：${new Date(result.exportedAt).toLocaleString('ja-JP')}` : '書き出した日時：不明',
          `手帖の記入：${p.answered}／${p.total}問`,
          `家族・大切な人：${getPeople(result.state).length}人、手紙：${result.state.letters.length}通、デジタル遺品：${result.state.digital.items.length}件`,
        ],
        okLabel: '置き換える',
        danger: true,
      });
      if (!ok) { announce('読み込みをやめました'); return; }
      // 古い控えにロックが入っていても、戻したあとでロックはかけない
      Object.assign(result.state.settings, { lockHash: '', lockSalt: '', lockHint: '' });
      store.replace(result.state);
      ctx.applySettings();
      announce('バックアップを読み込みました');
      ctx.rerender();
    },
  });
  const importMsg = h('p', { class: 'notice-text', role: 'status' });
  const saveMsg = h('p', { class: 'ok-line save-msg', role: 'status' });

  append(main, 
    pageHero({ img: 'print' }, '印刷・控え', null),
    SHARE_MODE ? notice('info', 'この共有版では、印刷とファイルの書き出しはできません。') : null,

    h('section', { class: 'section', 'aria-labelledby': 'print-title' },
      h('h2', { class: 'section-title', id: 'print-title', text: '印刷' }),
      // 受け渡しシート（人ごと）は「誰に・いつ見せるか」の各人の欄で、見え方を確かめてから印刷する
      h('ul', { class: 'group-body list' },
        h('li', null, h('a', { class: 'list-row', href: '#/disclosure' },
          tileIcon('eye', 'green'),
          h('span', { class: 'list-row-text' },
            h('span', { class: 'list-row-title', text: '受け渡しシート（人ごと）' })),
          h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron'))))),
      h('div', { class: 'group-body export-own' },
        h('div', { class: 'ds-row' },
          h('span', { class: 'ds-label', text: '自分用（全部）' }),
          h('div', { class: 'ds-control' },
            h('button', {
              type: 'button', class: 'btn btn-secondary btn-small needs-print',
              onclick: () => printContent(renderSheet(buildFullContent(store.state), { ownerName, kind: 'full' }), 'sheet'),
            }, icon('print'), h('span', { text: '印刷' })))),
        fullDetails),
      // 緊急連絡カード：財布に入れる大きさ。手帖の答えから作る
      h('div', { class: 'group-body export-own export-card' },
        h('div', { class: 'ds-row' },
          h('span', { class: 'ds-label', text: '緊急連絡カード（財布用）' }),
          h('div', { class: 'ds-control' },
            h('button', {
              type: 'button', class: 'btn btn-secondary btn-small needs-print',
              onclick: () => printContent(h('div', { class: 'print-cards' }, emergencyCard(store.state)), 'card'),
            }, icon('print'), h('span', { text: '印刷' })))),
        h('div', { class: 'ds-preview-body' }, h('div', { class: 'spare-preview', 'aria-label': 'カードの見本' }, emergencyCard(store.state))))),

    h('section', { class: 'section', 'aria-labelledby': 'backup-title' },
      h('h2', { class: 'section-title', id: 'backup-title', text: 'データの控え（ファイル）' }),
      h('p', { class: 'section-lead', text: '機種変更の前に保存します。' }),
      h('div', { class: 'inline-actions' },
        h('button', {
          type: 'button', class: 'btn btn-primary needs-download',
          onclick: () => {
            store.flush();
            const name = `nokosu-techo-${todayKey().replaceAll('-', '')}.json`;
            download(name, JSON.stringify(buildBackup(store.state), null, 2));
            store.update((s) => { s.settings.lastBackupAt = new Date().toISOString(); }, { immediate: true });
            saveMsg.textContent = `「${name}」をダウンロードに保存しました。メールで自分に送るなど、別の場所にも置いておくと安心です。`;
            announce(saveMsg.textContent);
          },
        }, h('span', { text: '控えを保存' })),
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => fileInput.click() }, h('span', { text: '控えから戻す' })),
        fileInput),
      saveMsg,
      h('div', { class: 'import-msg' }, importMsg),
      h('p', { class: 'page-note', text: 'ファイルは暗号化していません。人に見られない場所に保管してください。' })),

    h('section', { class: 'section danger-zone', 'aria-labelledby': 'erase-title' },
      h('h2', { class: 'visually-hidden', id: 'erase-title', text: 'すべて消去する' }),
      h('p', { class: 'section-lead', text: 'この端末の手帖・手紙・設定をすべて消します。' }),
      h('button', {
        type: 'button', class: 'btn btn-danger-quiet',
        onclick: async () => {
          const first = await confirmDialog({
            title: 'すべて消去しますか（1回目の確認）',
            message: `手帖の記入、家族・大切な人、手紙、デジタル遺品、設定がすべて消えます。最後の保存：${store.state.updatedAt ? formatDateJa(todayKey(new Date(store.state.updatedAt))) : 'なし'}`,
            okLabel: '次へ進む', danger: true,
          });
          if (!first) return;
          const second = await confirmDialog({
            title: '本当に消去しますか（2回目の確認）',
            message: '消去すると元に戻せません。バックアップがない場合は「やめる」を押してください。',
            okLabel: 'すべて消去する', cancelLabel: 'やめる', danger: true,
          });
          if (!second) return;
          store.reset();
          ctx.applySettings();
          announce('すべてのデータを消去しました');
          ctx.navigate('#/home');
        },
      }, icon('trash'), h('span', { text: 'すべて消去する' }))),
  );
}
