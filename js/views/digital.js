import { h, append, icon, nextId, confirmDialog, announce, printContent } from '../dom.js';
import { notice, fieldInput, pageHero } from '../components.js';
import { uid, looksLikePassword, ownerName,
} from '../logic.js';
import {
  DIGITAL_GROUPS, DIGITAL_WISHES, DIGITAL_PAYMENTS, NOKEEP_ACTIONS,
} from '../digital-templates.js';

// 開いているグループ（画面を描き直しても開いたままにする）
const openGroups = new Set(['device']);
const closedGroups = new Set(); // 利用者が閉じたグループ

function hintField(value, onInput) {
  const warnId = nextId('pw');
  const warn = h('p', { class: 'field-warn', id: warnId, role: 'status' });
  const setWarn = (v) => {
    warn.textContent = looksLikePassword(v)
      ? 'パスワードに見えます。置き場所だけを書いてください。'
      : '';
  };
  setWarn(value);
  return fieldInput(
    { key: 'hint', label: '保管場所のヒント', type: 'text', placeholder: '例：パスワードは寝室の金庫の青い手帳' },
    value,
    (v) => { setWarn(v); onInput(v); },
    {
      describedBy: warnId,
      after: warn,
    },
  );
}

function itemEditor(item, ctx, rerender) {
  const { store } = ctx;
  const set = (key) => (v) => store.update((s) => {
    const it = s.digital.items.find((x) => x.id === item.id);
    if (it) it[key] = v;
  });
  const wishName = nextId('wish');
  const legendId = nextId('wl');
  const title = item.name || '名前のないサービス';
  return h('li', { class: 'ditem', dataset: { itemId: item.id } },
    h('div', { class: 'row-head' },
      h('h3', { class: 'row-title', text: title }),
      h('button', {
        type: 'button', class: 'btn btn-quiet btn-small btn-icon', 'aria-label': `${title}を削除`,
        onclick: async () => {
          const ok = await confirmDialog({ title: `${title}を削除しますか`, message: '入力した内容は元に戻せません。', okLabel: '削除する', danger: true });
          if (!ok) return;
          store.update((s) => { s.digital.items = s.digital.items.filter((x) => x.id !== item.id); });
          announce(`${title}を削除しました`);
          rerender();
        },
      }, icon('trash'))),
    h('div', { class: 'field-grid' },
      fieldInput({ key: 'name', label: 'サービス名', type: 'text' }, item.name, (v) => {
        set('name')(v);
      }),
      fieldInput({ key: 'device', label: '使っている端末', type: 'text', placeholder: '例：iPhone、居間のパソコン' }, item.device, set('device')),
      h('fieldset', { class: 'field field-wide wish' },
        h('legend', { class: 'field-label', id: legendId, text: 'どうしてほしいか' }),
        h('div', { class: 'choices choices-inline' }, DIGITAL_WISHES.map((w) => {
          const id = nextId('w');
          return h('label', { class: 'choice', for: id },
            h('input', { type: 'radio', id, name: wishName, value: w.value, checked: item.wish === w.value, onchange: () => set('wish')(w.value) }),
            h('span', { class: 'choice-label', text: w.label }));
        }))),
      fieldInput({ key: 'payment', label: '支払い方法', type: 'select', options: DIGITAL_PAYMENTS.filter((p) => p.value) }, item.payment, set('payment')),
      hintField(item.hint, set('hint')),
      fieldInput({ key: 'memo', label: 'メモ', type: 'text', wide: true }, item.memo, set('memo'))));
}

function groupSection(group, ctx, rerender) {
  const { store } = ctx;
  const items = store.state.digital.items.filter((it) => it.group === group.id);
  const existing = new Set(items.map((it) => it.name));
  const available = group.templates.filter((t) => !existing.has(t));
  const pickName = nextId('tpl');

  const addSelected = (fieldset) => {
    const picked = [...fieldset.querySelectorAll('input:checked')].map((i) => i.value);
    if (!picked.length) {
      announce('追加するサービスにチェックを入れてください');
      fieldset.querySelector('input')?.focus();
      return;
    }
    store.update((s) => {
      for (const name of picked) {
        s.digital.items.push({ id: uid(), group: group.id, name, device: '', wish: '', payment: '', hint: '', memo: '' });
      }
    });
    openGroups.add(group.id);
    closedGroups.delete(group.id);
    announce(`${picked.length}件を追加しました`);
    rerender(`#dg-${group.id} .ditem:last-child .input`);
  };

  const tplFieldset = h('fieldset', { class: 'templates' },
    h('legend', { class: 'field-label', text: '選んで追加' }),
    available.length
      ? h('div', { class: 'choices choices-inline' }, available.map((t) => {
        const id = nextId('t');
        return h('label', { class: 'choice', for: id },
          h('input', { type: 'checkbox', id, name: pickName, value: t }),
          h('span', { class: 'choice-label', text: t }));
      }))
      : h('p', { class: 'q-note', text: '一覧のサービスはすべて追加済みです。' }));

  const details = h('details', { class: 'dgroup', id: `dg-${group.id}`, open: (!closedGroups.has(group.id) && (openGroups.has(group.id) || items.length > 0)) || null },
    h('summary', { class: 'dgroup-summary' },
      h('span', { class: 'dgroup-name', text: group.name }),
      h('span', { class: 'dgroup-count', text: items.length ? `${items.length}件` : '' })),
    h('div', { class: 'dgroup-body' },
      h('p', { class: 'dgroup-note', text: group.note }),
      group.more ? h('details', { class: 'task-more dgroup-more' },
        h('summary', { class: 'task-more-summary', title: 'くわしく' }, h('span', { class: 'visually-hidden', text: 'くわしく' })),
        h('p', { class: 'dgroup-note', text: group.more })) : null,
      items.length ? h('ol', { class: 'ditems' }, items.map((it) => itemEditor(it, ctx, rerender))) : null,
      tplFieldset,
      h('div', { class: 'inline-actions' },
        available.length ? h('button', { type: 'button', class: 'btn btn-secondary', text: '追加する', onclick: () => addSelected(tplFieldset) }) : null,
        h('button', {
          type: 'button', class: 'btn btn-quiet',
          onclick: () => {
            store.update((s) => { s.digital.items.push({ id: uid(), group: group.id, name: '', device: '', wish: '', payment: '', hint: '', memo: '' }); });
            openGroups.add(group.id);
            rerender(`#dg-${group.id} .ditem:last-child .input`);
          },
        }, icon('plus'), h('span', { text: 'ほかのサービス' })))));
  details.addEventListener('toggle', () => {
    if (details.open) { openGroups.add(group.id); closedGroups.delete(group.id); } else { openGroups.delete(group.id); closedGroups.add(group.id); }
  });
  return details;
}

function spareKeyCard(k, ownerName) {
  return h('div', { class: 'spare-card' },
    h('p', { class: 'spare-card-title' }, h('span', { class: 'spare-card-seal', 'aria-hidden': 'true', text: '鍵' }), 'スマホのスペアキー'),
    h('dl', { class: 'spare-card-dl' },
      h('div', null, h('dt', { text: '端末' }), h('dd', { text: k.device || '（未記入）' })),
      h('div', null, h('dt', { text: '解除方法の置き場所' }), h('dd', { text: k.unlockHint || '（未記入）' })),
      k.contact ? h('div', null, h('dt', { text: '困ったときの連絡先' }), h('dd', { text: k.contact })) : null),
    h('p', { class: 'spare-card-foot', text: ownerName ? `${ownerName}　のこす手帖` : 'のこす手帖' }));
}

export function renderDigital(main, ctx) {
  const { store } = ctx;
  const rerender = (sel) => ctx.rerender(sel);
  const k = store.state.digital.spareKey;

  const preview = h('div', { class: 'spare-preview', 'aria-label': 'カードの見本' }, spareKeyCard(k, ownerName(store.state)));
  const updatePreview = () => preview.replaceChildren(spareKeyCard(store.state.digital.spareKey, ownerName(store.state)));
  const setKey = (key) => (v) => {
    store.update((s) => { s.digital.spareKey[key] = v; });
    updatePreview();
  };

  const noKeep = store.state.digital.noKeep;

  append(main, 
    pageHero({ img: 'digital', photo: 'photo-digital', photoAlt: '年配の夫婦がソファでスマホの画面を一緒に見ている' }, 'デジタル遺品', null),
    notice('important', 'パスワードは書かず、置き場所だけを書きます。'),

    h('section', { class: 'section', 'aria-labelledby': 'dg-title' },
      h('h2', { class: 'section-title', id: 'dg-title', text: '使っているサービス' }),
      h('div', { class: 'dgroups' }, DIGITAL_GROUPS.map((g) => groupSection(g, ctx, rerender)))),

    h('section', { class: 'section', 'aria-labelledby': 'sk-title' },
      h('h2', { class: 'section-title', id: 'sk-title' }, icon('key'), h('span', { text: 'スマホのスペアキー' })),
      h('p', { class: 'section-lead', text: '財布に入るカードを印刷します。' }),
      h('div', { class: 'field-grid' },
        fieldInput({ key: 'device', label: '端末の名前', type: 'text', placeholder: '例：iPhone（黒いケース）' }, k.device, setKey('device')),
        fieldInput({ key: 'unlockHint', label: '解除方法の置き場所', type: 'text', placeholder: '例：寝室の金庫の中の封筒' }, k.unlockHint, setKey('unlockHint')),
        fieldInput({ key: 'contact', label: '困ったときの連絡先（任意）', type: 'text', placeholder: '例：長女 花子' }, k.contact, setKey('contact'))),
      preview,
      h('button', {
        type: 'button', class: 'btn btn-primary needs-print',
        onclick: () => printContent(h('div', { class: 'print-cards' }, spareKeyCard(store.state.digital.spareKey, ownerName(store.state)), spareKeyCard(store.state.digital.spareKey, ownerName(store.state))), 'card'),
      }, icon('print'), h('span', { text: 'カードを印刷' }))),

    h('section', { class: 'section', 'aria-labelledby': 'nk-title' },
      h('h2', { class: 'section-title', id: 'nk-title', text: '残さないもの' }),
      h('p', { class: 'section-lead', text: '開かずに消してほしいもの。' }),
      noKeep.length
        ? h('ol', { class: 'rows', id: 'nokeep-rows' }, noKeep.map((n, i) => h('li', { class: 'row', dataset: { rowId: n.id } },
          h('div', { class: 'row-head' },
            h('h3', { class: 'row-title', text: `残さないもの ${i + 1}` }),
            h('button', {
              type: 'button', class: 'btn btn-quiet btn-small btn-icon', 'aria-label': `残さないもの ${i + 1}を削除`,
              onclick: async () => {
                if (n.target || n.memo) {
                  const ok = await confirmDialog({ title: 'この行を削除しますか', message: '入力した内容は元に戻せません。', okLabel: '削除する', danger: true });
                  if (!ok) return;
                }
                store.update((s) => { s.digital.noKeep = s.digital.noKeep.filter((x) => x.id !== n.id); });
                rerender('#nokeep-add');
              },
            }, icon('trash'))),
          h('div', { class: 'field-grid' },
            fieldInput({ key: 'target', label: '対象', type: 'text', placeholder: '例：パソコンの「日記」フォルダ' }, n.target, (v) => store.update((s) => { const r = s.digital.noKeep.find((x) => x.id === n.id); if (r) r.target = v; })),
            fieldInput({ key: 'action', label: 'どうしてほしいか', type: 'select', options: NOKEEP_ACTIONS }, n.action, (v) => store.update((s) => { const r = s.digital.noKeep.find((x) => x.id === n.id); if (r) r.action = v; })),
            fieldInput({ key: 'memo', label: 'メモ', type: 'text', wide: true, placeholder: '例：処分は長男に任せる' }, n.memo, (v) => store.update((s) => { const r = s.digital.noKeep.find((x) => x.id === n.id); if (r) r.memo = v; }))))))
        : null,
      h('button', {
        type: 'button', class: 'btn btn-secondary', id: 'nokeep-add', 'aria-label': '残さないものを追加',
        onclick: () => {
          store.update((s) => { s.digital.noKeep.push({ id: uid(), target: '', action: 'deleteUnopened', memo: '' }); });
          rerender('#nokeep-rows .row:last-child .input');
        },
      }, icon('plus'), h('span', { text: '追加' }))),
  );
}
