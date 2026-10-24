// 画面をまたいで使う部品：設問の入力欄、繰り返し行、シート（プレビュー・印刷）、見出し、警告。

import { h, append, nextId, confirmDialog, announce, icon } from './dom.js';
import {
  isAnswered, getPeople, personRelation, uid, formatDateJa, todayKey, eraYearLabel, emergencyInfo, ERA_GROUPS,
} from './logic.js';
import { PEOPLE_QUESTION_ID } from './questions.js';

export const LEGAL_NOTE = 'この手帖に法的効力はありません。財産の分け方などは遺言書で。';

/** 画面の見出し：iOS の「大きなタイトル」。説明は小さな補足として下に置く */
export function pageHead(title, lead, ...extra) {
  return h('header', { class: 'page-head' },
    h('h1', { class: 'page-title', id: 'page-title', tabindex: '-1', text: title }),
    lead ? h('p', { class: 'page-lead', text: lead }) : null,
    extra);
}

/** 機能の画面の見出し（iOS 風では pageHead と同じ大きなタイトル。opts は互換のため受け取るだけ） */
export function pageHero(_opts, title, lead, ...extra) {
  return pageHead(title, lead, ...extra);
}

/** 細いプログレスバー。読み上げでは隠すので、数字は必ず文字でも添える */
export function progressBar(ratio, extraClass = '') {
  const pct = Math.round(Math.min(Math.max(Number(ratio) || 0, 0), 1) * 1000) / 10;
  return h('span', { class: `bar ${extraClass}`.trim(), 'aria-hidden': 'true' },
    h('span', { class: 'bar-fill', style: `width:${pct}%` }));
}

export function notice(kind, text, ...extra) {
  return h('div', { class: `notice notice-${kind}`, role: kind === 'warn' ? 'alert' : null },
    kind === 'warn' ? h('span', { class: 'notice-label', text: '注意' }) : null,
    h('p', { class: 'notice-text', text }), extra);
}

export function warningList(warnings) {
  if (!warnings.length) return null;
  return h('section', { class: 'warnings', 'aria-label': '確認してほしいこと' },
    warnings.map((w) => h('div', { class: `notice notice-${w.level}` },
      h('span', { class: 'notice-label', text: w.level === 'warn' ? '注意' : '確認' }),
      h('p', { class: 'notice-text', text: w.text }),
      w.code === 'no-people' ? h('a', { class: 'btn btn-small', href: '#/note/family', text: '家族・大切な人を登録する' }) : null)));
}

/** 状態を文字で示すしるし（色だけに頼らない） */
export function statusTag(q, state) {
  if (isAnswered(q, state.answers[q.id])) return h('span', { class: 'tag tag-done', text: '済み' });
  if (state.skipped[q.id]) return h('span', { class: 'tag tag-later', text: 'あとで' });
  return h('span', { class: 'tag tag-empty', text: '未記入' });
}

// ────────────────────────────────
// 設問の入力欄
// ────────────────────────────────

/**
 * 設問1つ分の入力欄を作る。入力のたびに自動保存する。
 * opts.mode: 'list'（一覧） | 'step'（1問ずつ） | 'card'（ホームの今日の1問）
 */
export function renderQuestion(q, ctx, opts = {}) {
  const mode = opts.mode || 'list';
  const { store } = ctx;
  const hintId = nextId('hint');
  const titleId = nextId('qt');
  let block;

  const statusSlot = h('span', { class: 'q-status' }, statusTag(q, store.state));
  const refreshStatus = () => {
    statusSlot.replaceChildren(statusTag(q, store.state));
    opts.onChange?.();
  };

  const setAnswer = (value) => {
    store.update((s) => {
      s.answers[q.id] = value;
      if (isAnswered(q, value)) delete s.skipped[q.id];
    });
    refreshStatus();
  };

  const rebuild = (focusSelector) => {
    const next = renderQuestion(q, ctx, opts);
    // 新しい欄を先に入れてから古い欄を外す（外すときの focusout で隣の欄が差し替わっても、入れる場所を失わない）
    block.parentNode?.insertBefore(next, block);
    block.remove();
    if (focusSelector) next.querySelector(focusSelector)?.focus();
    return next;
  };

  const hint = q.hint
    ? h('p', { class: 'q-hint', id: hintId }, h('span', { class: 'q-hint-label', text: '書き方のヒント' }), q.hint)
    : null;
  const describedBy = q.hint ? hintId : null;
  const value = store.state.answers[q.id];
  // 見出しの順番を飛ばさない：1問ずつは h1、一覧は h2、ホームのカード（h2 の下）は h3
  const TitleTag = { step: 'h1', card: 'h3' }[mode] || 'h2';
  const titleEl = (forId) => {
    if (!forId) return h(TitleTag, { class: 'q-title', id: titleId, tabindex: mode === 'step' ? '-1' : null, text: q.title });
    const label = h('label', { class: 'q-title', for: forId, id: titleId }, h('span', { class: 'q-title-text', text: q.title }));
    // 1問ずつモードではページ見出し（h1）が必要なので、ラベルを h1 で包む
    return mode === 'step' ? h('h1', { class: 'q-title-wrap', tabindex: '-1' }, label) : label;
  };

  let body;
  switch (q.type) {
    case 'text':
    case 'date': {
      const id = nextId('in');
      body = [titleEl(id), hint, h('input', {
        id, type: q.type === 'date' ? 'date' : 'text', class: 'input', value: value || '',
        placeholder: q.placeholder || null, 'aria-describedby': describedBy, autocomplete: 'off',
        oninput: (e) => setAnswer(e.target.value),
      })];
      break;
    }
    case 'textarea': {
      const id = nextId('in');
      body = [titleEl(id), hint, h('textarea', {
        id, class: 'input textarea', rows: mode === 'card' ? 3 : 5, value: value || '',
        'aria-describedby': describedBy, oninput: (e) => setAnswer(e.target.value),
      })];
      break;
    }
    case 'radio':
      body = [choiceGroup(q, titleEl(), hint, describedBy, 'radio', q.options, value, setAnswer, rebuild)];
      break;
    case 'check':
      body = [choiceGroup(q, titleEl(), hint, describedBy, 'checkbox', q.options, Array.isArray(value) ? value : [], setAnswer, rebuild)];
      break;
    case 'person': {
      const people = getPeople(store.state);
      const options = [
        ...people.map((p) => ({ value: p.id, label: `${p.name}（${personRelation(p)}）` })),
        { value: 'undecided', label: 'まだ決めていない' },
      ];
      const group = choiceGroup(q, titleEl(), hint, describedBy, 'radio', options, value, setAnswer, rebuild);
      if (!people.length && q.cat !== 'family') {
        append(group, h('p', { class: 'q-note' }, '先に人を登録してください。',
          h('a', { href: '#/note/family', text: '登録する' })));
      }
      body = [group];
      break;
    }
    case 'fields': {
      const obj = value && typeof value === 'object' ? value : {};
      body = [h('fieldset', { class: 'q-fieldset', 'aria-describedby': describedBy },
        h('legend', { class: 'q-legend' }, titleEl()), hint,
        h('div', { class: 'field-grid' }, q.fields.map((f) => fieldInput(f, obj[f.key], (v) => {
          const cur = { ...(store.state.answers[q.id] || {}) };
          cur[f.key] = v;
          setAnswer(cur);
        }))))];
      break;
    }
    case 'repeat':
      body = [repeatEditor(q, ctx, titleEl(), hint, describedBy, refreshStatus, rebuild)];
      break;
    default:
      body = [titleEl()];
  }


  block = h('section', { class: `q q-${q.type} q-mode-${mode}`, dataset: { qid: q.id }, 'aria-labelledby': titleId },
    mode !== 'step' ? h('div', { class: 'q-meta' }, statusSlot) : null,
    body);
  return block;
}

function choiceGroup(q, title, hint, describedBy, kind, options, value, setAnswer, rebuild) {
  const name = nextId('choice');
  const isCheck = kind === 'checkbox';
  const exclusive = new Set(['none', 'undecided']);
  const list = h('div', { class: 'choices' }, options.map((o) => {
    const id = nextId('opt');
    const checked = isCheck ? value.includes(o.value) : value === o.value;
    return h('label', { class: 'choice', for: id },
      h('input', {
        type: kind, id, name, value: o.value, checked,
        onchange: (e) => {
          if (!isCheck) {
            setAnswer(o.value);
            clearBtn.hidden = false;
            return;
          }
          const box = e.target.closest('.choices');
          let next = [...box.querySelectorAll('input:checked')].map((i) => i.value);
          // 「ない」「特にない」は他の選択肢と同時に選べない
          if (e.target.checked && exclusive.has(o.value)) next = [o.value];
          else if (e.target.checked) next = next.filter((v) => !exclusive.has(v));
          box.querySelectorAll('input').forEach((i) => { i.checked = next.includes(i.value); });
          setAnswer(next);
        },
      }),
      h('span', { class: 'choice-label', text: o.label }));
  }));
  const clearBtn = h('button', {
    type: 'button', class: 'btn btn-quiet btn-small q-clear', hidden: isCheck || !value,
    text: '選んだものを取り消す',
    onclick: () => { setAnswer(''); rebuild('input'); announce('選択を取り消しました'); },
  });
  return h('fieldset', { class: 'q-fieldset', 'aria-describedby': describedBy },
    h('legend', { class: 'q-legend' }, title), hint, list, isCheck ? null : clearBtn);
}

/** 1つの入力欄（ラベルつき） */
/** 生年月日など、昔の日付：年（和暦つき）・月・日を別々に選ぶ。3つそろったら「YYYY-MM-DD」で保存 */
function eraDateInput(id, label, value, onInput) {
  const [y0 = '', m0 = '', d0 = ''] = /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-') : [];
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1900 + 1 }, (_, i) => thisYear - i);
  const pad = (n) => String(n).padStart(2, '0');
  const sel = (attrs, placeholder, options, v) => h('select', { class: 'input', ...attrs, value: v },
    h('option', { value: '', text: placeholder }), options);
  // 元号ごとにまとめて、生まれ年を探しやすくする
  const groups = ERA_GROUPS.map((g) => h('optgroup', { label: g.name },
    years.filter((y) => y >= g.from && y <= g.to).map((y) => h('option', { value: String(y), text: `${y}年（${eraYearLabel(y)}）` }))));
  const ys = sel({ id, 'aria-label': `${label}の年` }, '年', groups.filter((g) => g.children.length), y0);
  const ms = sel({ 'aria-label': `${label}の月` }, '月', Array.from({ length: 12 }, (_, i) => h('option', { value: pad(i + 1), text: `${i + 1}月` })), m0);
  const ds = sel({ 'aria-label': `${label}の日` }, '日', Array.from({ length: 31 }, (_, i) => h('option', { value: pad(i + 1), text: `${i + 1}日` })), d0);
  const sync = () => {
    if (ys.value && ms.value && ds.value) {
      // 2月30日のような日は、その月の最後の日にそろえる
      const last = new Date(Number(ys.value), Number(ms.value), 0).getDate();
      if (Number(ds.value) > last) ds.value = pad(last);
      onInput(`${ys.value}-${ms.value}-${ds.value}`);
    } else onInput(''); // どれかが空なら、保存も空にする（画面と保存をそろえる）
  };
  for (const s of [ys, ms, ds]) s.addEventListener('change', sync);
  return h('div', { class: 'date-era' }, ys, ms, ds);
}

export function fieldInput(f, value, onInput, extra = {}) {
  const id = nextId('fld');
  let input;
  if (f.type === 'date' && f.era) {
    input = eraDateInput(id, f.label, value, onInput);
  } else if (f.type === 'select') {
    input = h('select', { id, class: 'input', value: value || '', onchange: (e) => onInput(e.target.value) },
      h('option', { value: '', text: '選んでください' }),
      f.options.map((o) => h('option', { value: o.value, text: o.label })));
  } else if (f.type === 'textarea') {
    input = h('textarea', { id, class: 'input textarea', rows: f.rows || 4, value: value || '', oninput: (e) => onInput(e.target.value) });
  } else {
    input = h('input', {
      id, class: 'input', type: f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text',
      value: value || '', placeholder: f.placeholder || null, autocomplete: f.autocomplete || 'off',
      inputmode: f.type === 'tel' ? 'tel' : null,
      'aria-describedby': extra.describedBy || null,
      oninput: (e) => onInput(e.target.value),
    });
  }
  return h('div', { class: `field ${f.wide || f.era ? 'field-wide' : ''}` },
    h('label', { class: 'field-label', for: id, text: f.label }), extra.before || null, input, extra.after || null);
}

function rowHasContent(row) {
  return Object.entries(row).some(([k, v]) => k !== 'id' && String(v || '').trim() !== '');
}

function repeatEditor(q, ctx, title, hint, describedBy, refreshStatus, rebuild) {
  const { store } = ctx;
  const rows = Array.isArray(store.state.answers[q.id]) ? store.state.answers[q.id] : [];
  const isPeople = q.id === PEOPLE_QUESTION_ID;

  const level = /^H[1-5]$/.test(title.tagName) ? Number(title.tagName[1]) + 1 : 4;
  const list = h('ol', { class: 'rows' }, rows.map((row, i) => {
    const rowTitle = `${q.itemLabel} ${i + 1}`;
    return h('li', { class: 'row', dataset: { rowId: row.id } },
      h('div', { class: 'row-head' },
        h(`h${level}`, { class: 'row-title', text: rowTitle }),
        h('button', {
          type: 'button', class: 'btn btn-quiet btn-small btn-icon',
          // 読み上げでは、名前があれば「〇〇さんを削除」に
          'aria-label': isPeople && String(row.name || '').trim() ? `${row.name}さんを削除` : `${rowTitle}を削除`,
          onclick: async () => {
            const current = store.state.answers[q.id]?.find((r) => r.id === row.id);
            if (current && rowHasContent(current)) {
              const ok = await confirmDialog({
                title: `${rowTitle}を削除しますか`,
                message: isPeople ? 'この人の開示設定も消えます。この人に宛てた手紙は残りますが、宛先を選び直す必要があります。' : '入力した内容は元に戻せません。',
                okLabel: '削除する', danger: true,
              });
              if (!ok) return;
            }
            store.update((s) => {
              s.answers[q.id] = (s.answers[q.id] || []).filter((r) => r.id !== row.id);
              if (isPeople) delete s.disclosure[row.id];
            });
            announce(`${rowTitle}を削除しました`);
            rebuild('.rows-add');
          },
        }, icon('trash'))),
      h('div', { class: 'field-grid' }, q.fields.map((f) => fieldInput(f, row[f.key], (v) => {
        store.update((s) => {
          const r = (s.answers[q.id] || []).find((x) => x.id === row.id);
          if (r) r[f.key] = v;
          if (isAnswered(q, s.answers[q.id])) delete s.skipped[q.id];
        });
        refreshStatus();
      }))));
  }));

  const addBtn = h('button', {
    type: 'button', class: 'btn btn-secondary rows-add',
    onclick: () => {
      const newId = uid();
      store.update((s) => {
        if (!Array.isArray(s.answers[q.id])) s.answers[q.id] = [];
        s.answers[q.id].push({ id: newId });
      });
      const next = rebuild();
      next.querySelector(`[data-row-id="${newId}"] .input`)?.focus();
      announce(`${q.itemLabel}の入力欄を追加しました`);
    },
  }, icon('plus'), h('span', { text: `${q.itemLabel}を追加する` }));

  return h('fieldset', { class: 'q-fieldset', 'aria-describedby': describedBy },
    h('legend', { class: 'q-legend' }, title), hint,
    rows.length ? list : null,
    addBtn);
}

// ────────────────────────────────
// シート（開示プレビュー・受け渡しシート・自分用の控え）
// ────────────────────────────────

export function renderSheet(content, { ownerName = '', kind = 'handover', writtenAt = '' } = {}) {
  const today = todayKey();
  const forWhom = content.person ? `${content.person.name}さんへ` : kind === 'read' ? '' : '自分用の控え';
  const sheet = h('article', { class: 'sheet', 'aria-label': forWhom ? `${forWhom}のシート` : '手帖の内容' },
    h('header', { class: 'sheet-head' },
      h('p', { class: 'sheet-brand', text: 'のこす手帖' }),
      h('h2', { class: 'sheet-title', text: { full: '手帖の控え（すべての内容）', read: '手帖に書かれていること' }[kind] || '受け渡しシート' }),
      h('dl', { class: 'sheet-meta' },
        forWhom ? h('div', null, h('dt', { text: '宛先' }), h('dd', { text: forWhom })) : null,
        content.person ? h('div', null, h('dt', { text: '見てよい時期' }), h('dd', { text: content.stageLabel })) : null,
        ownerName ? h('div', null, h('dt', { text: '書いた人' }), h('dd', { text: ownerName })) : null,
        // 「手帖を読む」では、いつ書かれたものかが分かるよう、最後に書いた日を出す
        kind === 'read' && writtenAt && !Number.isNaN(Date.parse(writtenAt))
          ? h('div', null, h('dt', { text: '最後に書いた日' }), h('dd', { text: formatDateJa(todayKey(new Date(writtenAt))) }))
          : h('div', null, h('dt', { text: '作成日' }), h('dd', { text: formatDateJa(today) })))),
    h('p', { class: 'sheet-legal', text: LEGAL_NOTE }));

  // 記入のないカテゴリは載せない（空の見出しが並ばないように）
  const d0 = content.digital;
  const hasDigital = !!d0 && (d0.items.length > 0 || d0.noKeep.length > 0 || !!d0.spareKey);
  const filled = content.categories.filter((c) => c.entries.length);
  if (!filled.length && !hasDigital && !content.letters.length) {
    append(sheet, h('p', { class: 'sheet-empty', text: 'この時期に見せる内容はありません。' }));
  }

  for (const c of filled) {
    append(sheet, h('section', { class: 'sheet-section', dataset: { sec: c.name } }, h('h3', { class: 'sheet-h', text: c.name }),
      h('dl', { class: 'sheet-dl' }, c.entries.map((e) => h('div', { class: 'sheet-item' },
        h('dt', { text: e.title }),
        e.lines.map((line) => h('dd', { text: line })))))));
  }

  if (hasDigital) {
    const d = d0;
    const sec = h('section', { class: 'sheet-section', dataset: { sec: 'デジタル遺品' } }, h('h3', { class: 'sheet-h', text: 'デジタル遺品' }),
      h('p', { class: 'sheet-small', text: 'パスワードはこの手帖には書かれていません。「保管場所のヒント」を手がかりにしてください。' }));
    if (d.spareKey) {
      append(sec, h('div', { class: 'sheet-item' }, h('h4', { class: 'sheet-h4', text: 'スマホのスペアキー' }),
        d.spareKey.device ? h('p', { text: `端末：${d.spareKey.device}` }) : null,
        d.spareKey.unlockHint ? h('p', { text: `ロック解除方法の保管場所：${d.spareKey.unlockHint}` }) : null));
    }
    if (d.items.length) {
      append(sec, h('dl', { class: 'sheet-dl' }, d.items.map((it) => h('div', { class: 'sheet-item' },
        h('dt', { text: `${it.name}（${it.group}）` }), it.lines.map((l) => h('dd', { text: l }))))));
    }
    if (d.noKeep.length) {
      append(sec, h('h4', { class: 'sheet-h4', text: '残さないもの（開かずに処分してほしいもの）' }),
        h('ul', { class: 'sheet-list' }, d.noKeep.map((n) => h('li', { text: `${n.target}：${n.action}${n.memo ? `（${n.memo}）` : ''}` }))));
    }
    append(sheet, sec);
  }

  if (content.letters.length) {
    const sec = h('section', { class: 'sheet-section', dataset: { sec: '手紙' } }, h('h3', { class: 'sheet-h', text: '手紙' }));
    for (const l of content.letters) {
      append(sec, h('div', { class: 'sheet-letter' },
        h('p', { class: 'sheet-letter-timing', text: l.to ? `${l.to}さんへ／${l.timing}` : l.timing }),
        h('h4', { class: 'sheet-h4', text: l.title }),
        h('p', { class: 'sheet-letter-body', text: l.body || '（本文なし）' })));
    }
    append(sheet, sec);
  }

  if (content.hidden?.length) {
    append(sheet, h('p', { class: 'sheet-small sheet-hidden', text: `このシートに含まれていないもの：${content.hidden.join('、')}` }));
  }
  return sheet;
}

/** 緊急連絡カード（91×55mm）。書かれていない項目は出さない */
export function emergencyCard(state) {
  const rows = emergencyInfo(state);
  return h('div', { class: 'spare-card emergency-card' },
    h('p', { class: 'spare-card-title' }, h('span', { class: 'spare-card-seal emergency-seal', 'aria-hidden': 'true', text: '急' }), '緊急連絡カード'),
    rows.length
      ? h('dl', { class: 'spare-card-dl' }, rows.map((r) => h('div', null, h('dt', { text: r.label }), h('dd', { text: r.value }))))
      : h('p', { class: 'spare-card-foot', text: '手帖の「わたしのこと」「家族・大切な人」「医療・介護」を書くと、ここに入ります。' }),
    h('p', { class: 'spare-card-foot', text: 'のこす手帖' }));
}
