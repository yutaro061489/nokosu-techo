import { h, append, nextId, confirmDialog, announce, printContent, icon, tileIcon } from '../dom.js';
import { pageHero } from '../components.js';
import {
  buildNaviTasks, groupTasks, taskStatus, todayKey, formatDateJa, diffDays, isDateKey,
} from '../logic.js';

const DISCLAIMER = '期限は一般的な目安です。詳しくは市区町村や専門家に確かめてください。';
const KNOWN_LATER = '亡くなったことを後から知った場合は、死亡届・相続放棄・準確定申告・相続税の期限を「知った日」から数えます。';

/** 印は急ぐものだけに出す（余裕のあるものは日付だけ） */
function statusText(status, task, today) {
  switch (status) {
    case 'overdue': return '期限切れ';
    case 'soon': {
      const d = diffDays(today, task.due);
      return d === 0 ? '今日まで' : `あと${d}日`;
    }
    default: return '';
  }
}

/** 「10月16日（金）」。今年でなければ年も付ける */
function shortDate(key, today) {
  const full = formatDateJa(key, true);
  return key.slice(0, 4) === today.slice(0, 4) ? full.replace(/^\d+年/, '') : full;
}

export function taskDomId(task) {
  return `task-${task.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function taskItem(task, ctx, today, onToggle, groupDue) {
  const id = taskDomId(task);
  const checked = !!ctx.store.state.navi.checked[task.id];
  const status = taskStatus(task, ctx.store.state.navi.checked, today);
  // 見出しと同じ期限なら、行には日付もしるしも出さない（見出しに 1 つだけ）
  const sameAsGroup = !!task.due && task.due === groupDue;
  const sText = sameAsGroup ? '' : statusText(status, task, today);
  // 題名を押しても印が付かないよう、チェックは左の広い枠だけで切り替える
  return h('li', { class: `task task-${status}` },
    h('label', { class: 'task-check-hit' },
      h('input', {
        type: 'checkbox', id, class: 'task-check', checked,
        'aria-labelledby': `${id}-title`,
        'aria-describedby': (task.due && !sameAsGroup) || sText ? `${id}-meta` : null,
        onchange: (e) => onToggle(task, e.target.checked),
      })),
    h('div', { class: 'task-body' },
      h('p', { class: 'task-title', id: `${id}-title`, text: task.title }),
      (task.due && !sameAsGroup) || sText ? h('div', { class: 'task-meta', id: `${id}-meta` },
        task.due && !sameAsGroup ? h('span', { class: 'task-due', text: `${shortDate(task.due, today)}まで` }) : null,
        sText ? h('span', { class: `tag tag-${status}`, text: sText }) : null) : null,
      // 窓口・説明・どこから追加したかは「くわしく」の中に
      task.where || task.detail || task.source ? h('details', { class: 'task-more' },
        h('summary', { class: 'task-more-summary', title: 'くわしく' }, h('span', { class: 'visually-hidden', text: 'くわしく' })),
        task.where ? h('p', { class: 'task-where' }, h('span', { class: 'task-k', text: '窓口：' }), task.where) : null,
        task.detail ? h('p', { class: 'task-detail', text: task.detail }) : null,
        task.source ? h('p', { class: 'task-detail', text: `${task.source}から追加` }) : null) : null));
}

function printableList(groups, state, today) {
  return h('article', { class: 'sheet' },
    h('header', { class: 'sheet-head' },
      h('p', { class: 'sheet-brand', text: 'のこす手帖' }),
      h('h2', { class: 'sheet-title', text: '手続きのチェックリスト' }),
      h('dl', { class: 'sheet-meta' },
        state.navi.deathDate ? h('div', null, h('dt', { text: '基準日' }), h('dd', { text: formatDateJa(state.navi.deathDate) })) : null,
        h('div', null, h('dt', { text: '印刷日' }), h('dd', { text: formatDateJa(today) })))),
    h('p', { class: 'sheet-legal', text: DISCLAIMER }),
    groups.map((g) => h('section', { class: 'sheet-section' },
      h('h3', { class: 'sheet-h', text: g.label }),
      h('ul', { class: 'sheet-checklist' }, g.tasks.map((t) => h('li', null,
        h('span', { class: 'sheet-box', text: state.navi.checked[t.id] ? '■' : '□' }),
        h('span', { text: `${t.title}${t.due ? `（${formatDateJa(t.due)}まで）` : ''}${t.where ? ` 窓口：${t.where}` : ''}` })))))));
}

export function renderNavi(main, ctx) {
  const { store } = ctx;
  const today = todayKey();
  const deathDate = store.state.navi.deathDate;
  const tasks = buildNaviTasks(store.state, deathDate);
  const groups = groupTasks(tasks);
  const statuses = tasks.map((t) => taskStatus(t, store.state.navi.checked, today));
  const done = statuses.filter((s) => s === 'done').length;
  const overdue = statuses.filter((s) => s === 'overdue').length;

  const onToggle = (task, value) => {
    store.update((s) => {
      if (value) s.navi.checked[task.id] = true;
      else delete s.navi.checked[task.id];
    });
    announce(value ? `「${task.title}」を済みにしました` : `「${task.title}」の済みを外しました`);
    ctx.rerender(`#${taskDomId(task)}`);
    // 描き直したあとで、押した丸にだけ印を付ける（済みの丸が全部動かないように）
    if (value) document.getElementById(taskDomId(task))?.classList.add('just-checked');
  };

  const dateId = 'navi-death-date';
  const dateErrId = nextId('de');
  append(main, 
    pageHero({ img: 'navi' }, 'もしものとき', 'ご家族の方へ。亡くなった日を入れると、手続きの期限が出ます。'),
    // 書かれた内容を読むだけの画面（入力欄を出さないので、うっかり書き換えない）
    h('ul', { class: 'group-body list navi-read' },
      h('li', null, h('a', { class: 'list-row', href: '#/read' },
        tileIcon('book', 'blue'),
        h('span', { class: 'list-row-text' },
          h('span', { class: 'list-row-title', text: '手帖を読む' })),
        h('span', { class: 'list-row-chevron', 'aria-hidden': 'true' }, icon('chevron'))))),
    h('div', { class: 'navi-date' },
      h('div', { class: 'navi-date-row' },
        h('label', { class: 'navi-date-label', for: dateId, text: '亡くなった日' }),
        h('input', {
          id: dateId, type: 'date', class: 'input', value: deathDate, max: today, 'aria-describedby': `navi-notes ${dateErrId}`,
          onchange: (e) => {
            const v = e.target.value;
            if (v && !isDateKey(v)) return;
            store.update((s) => { s.navi.deathDate = v; }, { immediate: true });
            ctx.rerender(`#${dateId}`);
          },
        }),
        h('p', { class: 'visually-hidden', id: dateErrId, text: `今日は${formatDateJa(today, true)}です。` }))),
    deathDate && deathDate > today
      ? h('p', { class: 'navi-summary navi-summary-empty', role: 'status', text: '今日より後の日付です。日付を確かめてください。' })
      : deathDate
      ? h('p', { class: 'navi-summary', role: 'status' },
        h('span', { class: 'navi-chip' }, '済み ', h('strong', { text: `${done}／${tasks.length}` })),
        overdue ? h('span', { class: 'navi-chip navi-overdue' }, '期限切れ ', h('strong', { text: String(overdue) })) : null)
      : null,
    ...groups.map((g) => {
      const groupDue = g.tasks.filter((t) => t.due && !t.id.startsWith('auto:')).map((t) => t.due).sort().pop();
      // 見出しの期限で、まだ済んでいない手続きがあれば、しるしを見出しに 1 つだけ付ける
      const open = g.tasks.filter((t) => t.due === groupDue && !store.state.navi.checked[t.id]);
      const gStatus = groupDue && open.length ? taskStatus(open[0], store.state.navi.checked, today) : '';
      const gText = gStatus ? statusText(gStatus, open[0], today) : '';
      return h('section', { class: 'navi-group', 'aria-labelledby': `ng-${g.id}` },
        h('h2', { class: 'navi-group-title', id: `ng-${g.id}` },
          h('span', { text: g.label }),
          groupDue ? h('span', { class: 'navi-group-due' }, `${shortDate(groupDue, today)}まで`,
            gText ? h('span', { class: `tag tag-${gStatus}`, text: gText }) : null) : null),
        h('ul', { class: 'tasks' }, g.tasks.map((t) => taskItem(t, ctx, today, onToggle, groupDue))));
    }),
    h('div', { class: 'stack-actions' },
      h('button', {
        type: 'button', class: 'btn btn-secondary needs-print',
        onclick: () => printContent(printableList(groups, store.state, today), 'sheet'),
      }, icon('print'), h('span', { text: '印刷' })),
      h('button', {
        type: 'button', class: 'btn btn-quiet',
        onclick: async () => {
          const ok = await confirmDialog({ title: 'チェックをすべて外しますか', message: '日付はそのまま残ります。', okLabel: 'すべて外す' });
          if (!ok) return;
          store.update((s) => { s.navi.checked = {}; }, { immediate: true });
          ctx.rerender();
        },
        text: 'チェックをすべて外す',
      })),
    // 注意書きは一番下にまとめる
    h('div', { class: 'navi-notes', id: 'navi-notes' },
      h('p', { text: DISCLAIMER }),
      h('p', { text: KNOWN_LATER })),
  );
}
