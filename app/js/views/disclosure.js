import { h, append, announce, printContent, icon, confirmDialog } from '../dom.js';
import { warningList, renderSheet, pageHero } from '../components.js';
import {
  getPeople, getStage, personRelation, STAGES, disclosureWarnings, buildViewerContent,
} from '../logic.js';
import { DISCLOSURE_CATEGORIES } from '../questions.js';
import { sheetHtml, shareOrSave } from '../sheet-file.js';

// 見え方を確かめる時期（人ごと。画面を描き直しても保つ）
const previewStage = {};
// 開いている「見え方を確かめる」（画面を描き直しても開いたままにする）
const openPreviews = new Set();
const STAGE_NOTE = '「判断がむずかしくなったら」は、ご自身で伝えられなくなったときです。';

function personCard(person, ctx, refreshWarnings, previewRenderers) {
  const { store } = ctx;
  const MIXED = 'mixed';
  const current = () => DISCLOSURE_CATEGORIES.map((c) => getStage(store.state, person, c.id));
  const allValue = () => { const v = current(); return v.every((x) => x === v[0]) ? v[0] : MIXED; };

  // すべてのカテゴリ：ここで選ぶと全カテゴリが同じ時期になる
  const allId = `all-${person.id}`;
  const allSelect = h('select', {
    id: allId, class: 'input input-compact', 'aria-label': `${person.name}さんに見せはじめる時期（すべての項目）`,
    onchange: (e) => {
      const v = e.target.value;
      if (v === MIXED) return;
      store.update((s) => { s.disclosure[person.id] = Object.fromEntries(DISCLOSURE_CATEGORIES.map((c) => [c.id, v])); });
      announce(`${person.name}さんの全カテゴリを「${STAGES.find((x) => x.id === v)?.label}」にしました`);
      ctx.rerender(`#${allId}`);
    },
  },
  h('option', { value: MIXED, text: 'ばらばら', disabled: true }),
  STAGES.map((st) => h('option', { value: st.id, text: st.label })));
  allSelect.value = allValue();

  // カテゴリごと（ふだんは閉じておく。すでに違う設定があれば開いておく）
  const rows = DISCLOSURE_CATEGORIES.map((c) => {
    const id = `ds-${person.id}-${c.id}`;
    return h('div', { class: 'ds-row' },
      h('label', { class: 'ds-label', for: id, text: c.name }),
      h('div', { class: 'ds-control' },
        h('select', {
          id, class: 'input input-compact', value: getStage(store.state, person, c.id),
          onchange: (e) => {
            store.update((s) => {
              if (!s.disclosure[person.id]) s.disclosure[person.id] = {};
              s.disclosure[person.id][c.id] = e.target.value;
            });
            allSelect.value = allValue();
            refreshWarnings();
          },
        }, STAGES.map((st) => h('option', { value: st.id, text: st.label })))));
  });

  // 見え方を確かめる：この人に、選んだ時期に見える内容（受け渡しシートの見本）
  const stageId = `pv-${person.id}`;
  if (!previewStage[person.id]) previewStage[person.id] = 'after';
  const frame = h('div', { class: 'preview-frame', role: 'region', 'aria-label': `${person.name}さんに見える内容（見本）` });
  const renderPreview = () => {
    if (!preview.open) return;
    frame.replaceChildren(renderSheet(buildViewerContent(store.state, person.id, previewStage[person.id]), { ownerName: store.state.settings.name }));
  };
  previewRenderers.push(renderPreview);
  const preview = h('details', { class: 'ds-more ds-preview', open: openPreviews.has(person.id) || null },
    h('summary', { class: 'ds-more-summary', text: '見え方を確かめる' }),
    // 設定の選択欄と見分けがつくよう、時期は切り替えボタン（ここで選んでも設定は変わらない）
    h('div', { class: 'seg', role: 'group', id: stageId, 'aria-label': `${person.name}さんに見える内容を表示する時期` },
      STAGES.filter((st) => st.id !== 'never').map((st) => h('button', {
        type: 'button', class: 'seg-btn', 'aria-pressed': String(previewStage[person.id] === st.id), text: st.label,
        onclick: (e) => {
          previewStage[person.id] = st.id;
          for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
          renderPreview();
        },
      }))),
    h('div', { class: 'ds-preview-body' },
      frame,
      h('div', { class: 'inline-actions' },
        h('button', {
          type: 'button', class: 'btn btn-secondary needs-print',
          onclick: () => printContent(renderSheet(buildViewerContent(store.state, person.id, previewStage[person.id]), { ownerName: store.state.settings.name }), 'sheet'),
        }, icon('print'), h('span', { text: '印刷する' })),
        // ファイルにして本人が LINE やメールで送る。受け取った人はアプリなしで開ける
        h('button', {
          type: 'button', class: 'btn btn-secondary needs-download',
          onclick: async () => {
            // ファイルは届いたらすぐ読める。「今すぐ」以外の時期なら確かめる
            if (previewStage[person.id] !== 'now') {
              const ok = await confirmDialog({
                title: 'すぐに読めるファイルです',
                message: '受け取った人は、届いたときに開けます。亡くなったあとに渡したいものは、印刷して封をするのがおすすめです。',
                okLabel: '渡す', cancelLabel: 'やめる',
              });
              if (!ok) return;
            }
            const sheet = renderSheet(buildViewerContent(store.state, person.id, previewStage[person.id]), { ownerName: store.state.settings.name });
            const title = `${person.name}さんへ（のこす手帖）`;
            const result = await shareOrSave(sheetHtml(sheet, title), `のこす手帖_${person.name.replace(/[\\/:*?"<>|]/g, '')}さんへ.html`, title);
            if (result === 'saved') announce('ファイルを保存しました');
          },
        }, icon('letter'), h('span', { text: 'ファイルで渡す' })))));
  preview.addEventListener('toggle', () => {
    if (preview.open) openPreviews.add(person.id); else openPreviews.delete(person.id);
    renderPreview();
  });
  renderPreview();

  return h('section', { class: 'person-card', 'aria-labelledby': `pc-${person.id}` },
    h('header', { class: 'person-head' },
      h('h3', { class: 'person-name', id: `pc-${person.id}`, text: `${person.name}さん` }),
      h('p', { class: 'person-rel', text: personRelation(person) })),
    h('div', { class: 'ds-row ds-all' },
      h('label', { class: 'ds-label', for: allId, text: '見せはじめる時期' }),
      h('div', { class: 'ds-control' }, allSelect)),
    h('details', { class: 'ds-more', open: allValue() === MIXED || null },
      h('summary', { class: 'ds-more-summary', text: '項目ごとに変える' }),
      h('div', { class: 'ds-rows' }, rows)),
    preview);
}

export function renderDisclosure(main, ctx) {
  const { store } = ctx;
  const people = getPeople(store.state);

  const warnSlot = h('div', { class: 'warn-slot', 'aria-live': 'polite' });
  const previewRenderers = [];
  const refreshWarnings = () => {
    warnSlot.replaceChildren(warningList(disclosureWarnings(store.state).filter((w) => w.level === 'warn')) || '');
    previewRenderers.forEach((fn) => fn());
  };

  append(main, pageHero({ img: 'sharing' }, '誰に・いつ見せるか', '人ごとに、見せはじめる時期を選びます。'));

  // まだ誰も登録されていないとき：やることは「人を登録する」だけなので、案内とボタンを1つだけ出す
  // （上の注意「1人も登録されていません」とは重ねない）
  if (!people.length) {
    append(main,
      h('div', { class: 'empty' },
        h('p', { text: '名前と続柄だけで登録できます。' }),
        h('a', { class: 'btn btn-primary', href: '#/note/family', text: '人を登録する' })));
    return;
  }

  append(main,
    warnSlot,
    h('section', { class: 'section', 'aria-labelledby': 'people-title' },
      h('h2', { class: 'visually-hidden', id: 'people-title', text: '人ごとの設定' }),
      h('div', { class: 'person-cards' }, people.map((p) => personCard(p, ctx, refreshWarnings, previewRenderers))),
      h('p', { class: 'group-footer stage-note', text: STAGE_NOTE })),
  );
  refreshWarnings();
}
