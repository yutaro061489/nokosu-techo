import { h, append, announce, confirmDialog, SHARE_MODE, DEMO_MODE } from '../dom.js';
import { notice, pageHero } from '../components.js';
import { formatDateJa, todayKey } from '../logic.js';
import { isInstalled, isIOS, canPromptInstall, promptInstall } from '../pwa.js';
import { lockAvailable, validPin, newSalt, hashPin } from '../lock.js';

/** ホーム画面に置く：ブラウザが出せるなら確認を出し、iPhone は共有ボタンからの手順を示す */
function installSection() {
  if (isInstalled() || SHARE_MODE || DEMO_MODE) return null;
  const phone = window.matchMedia('(pointer: coarse)').matches;
  return h('section', { class: 'section', 'aria-labelledby': 'install-title' },
    h('h2', { class: 'section-title', id: 'install-title', text: phone ? 'ホーム画面に置く' : 'アプリとして入れる' }),
    h('p', { class: 'section-lead', text: 'アプリのように開けて、書いた内容も消えにくくなります。' }),
    // iPhone では、Safari とホーム画面のアプリで保存場所が別になる
    isIOS() ? h('p', { class: 'section-lead', text: 'iPhone では Safari と書いた内容が別になります。書きはじめる前に置くか、控えを保存してから、アイコンで開いて戻してください。' }) : null,
    canPromptInstall()
      ? h('button', {
        type: 'button', class: 'btn btn-primary',
        onclick: async () => { if (await promptInstall()) announce('ホーム画面に追加しました'); },
      }, h('span', { text: phone ? 'ホーム画面に追加' : 'アプリとして入れる' }))
      : h('ol', { class: 'group-body install-steps' },
        isIOS()
          ? [h('li', { text: 'Safari の下の共有ボタン（四角から矢印）を押す' }), h('li', { text: '「ホーム画面に追加」を押す' })]
          : [h('li', { text: 'ブラウザのメニュー（︙）を開く' }), h('li', { text: '「ホーム画面に追加」または「アプリをインストール」を押す' })]));
}

/** 暗証番号のロック。番号は保存せず、ハッシュだけを持つ */
function lockSection(ctx) {
  if (!lockAvailable()) return null;
  const { store } = ctx;
  const on = !!store.state.settings.lockHash;
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const pin1 = h('input', { id: 'pin-1', class: 'input', type: 'password', inputmode: 'numeric', autocomplete: 'new-password', maxlength: '8' });
  const pin2 = h('input', { id: 'pin-2', class: 'input', type: 'password', inputmode: 'numeric', autocomplete: 'new-password', maxlength: '8' });
  const hintInput = h('input', { id: 'pin-hint', class: 'input', type: 'text', maxlength: '80', autocomplete: 'off', placeholder: '例：仏壇の引き出しの封筒', value: store.state.settings.lockHint });
  const form = h('form', {
    class: 'lock-form', hidden: true,
    onsubmit: async (e) => {
      e.preventDefault();
      if (!validPin(pin1.value)) { msg.textContent = '4〜8けたの数字にしてください。'; pin1.focus(); return; }
      if (pin1.value !== pin2.value) { msg.textContent = '2回の番号が違います。'; pin2.value = ''; pin2.focus(); return; }
      const salt = newSalt();
      const hash = await hashPin(pin1.value, salt);
      store.update((st) => { st.settings.lockSalt = salt; st.settings.lockHash = hash; st.settings.lockHint = hintInput.value.trim().slice(0, 80); }, { immediate: true });
      announce('暗証番号を設定しました');
      ctx.rerender('#lock-title');
    },
  },
  h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'pin-1', text: '番号（4〜8けたの数字）' }), pin1),
  h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'pin-2', text: 'もう一度' }), pin2),
  h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'pin-hint', text: '番号の置き場所（家族向けのヒント。ロック画面に出ます）' }), hintInput),
  msg,
  h('button', { type: 'submit', class: 'btn btn-primary', text: '保存する' }));
  const showForm = (btn) => { form.hidden = false; btn.hidden = true; pin1.focus(); };

  return h('section', { class: 'section', 'aria-labelledby': 'lock-title' },
    h('h2', { class: 'section-title', id: 'lock-title', tabindex: '-1', text: '暗証番号でロック' }),
    h('p', { class: 'section-lead', text: on ? '開くたびに番号を聞きます。' : '番号を忘れると、この手帖は開けず、消すしかありません。番号は紙に書いて、通帳などと同じ場所に置いてください。' }),
    on
      ? h('div', { class: 'inline-actions' },
        h('button', { type: 'button', class: 'btn btn-secondary', text: '番号を変える', onclick: (e) => showForm(e.currentTarget) }),
        h('button', {
          type: 'button', class: 'btn btn-quiet', text: 'ロックをやめる',
          onclick: async () => {
            if (!await confirmDialog({ title: 'ロックをやめますか', message: '次から番号を聞かずに開きます。', okLabel: 'やめる', cancelLabel: '戻る' })) return;
            store.update((st) => { st.settings.lockHash = ''; st.settings.lockSalt = ''; st.settings.lockHint = ''; }, { immediate: true });
            announce('ロックをやめました');
            ctx.rerender('#lock-title');
          },
        }))
      : h('button', { type: 'button', class: 'btn btn-secondary', text: '設定する', onclick: (e) => showForm(e.currentTarget) }),
    form);
}

export const FONT_SIZES = [
  { value: 'standard', label: '標準', sample: 'いつもの大きさ' },
  { value: 'large', label: '大', sample: 'ひとまわり大きく' },
  { value: 'xlarge', label: '特大', sample: 'いちばん大きく' },
];

export function renderSettings(main, ctx) {
  const { store } = ctx;
  const s = store.state.settings;

  append(main, 
    pageHero({ img: 'settings' }, '設定', null),

    h('section', { class: 'section', 'aria-labelledby': 'font-title' },
      h('h2', { class: 'section-title', id: 'font-title', text: '文字の大きさ' }),
      h('fieldset', { class: 'q-fieldset' },
        h('legend', { class: 'visually-hidden', text: '文字の大きさを選ぶ' }),
        h('div', { class: 'choices font-choices' }, FONT_SIZES.map((f) => h('label', { class: `choice font-choice font-${f.value}`, for: `font-${f.value}` },
          h('input', {
            type: 'radio', id: `font-${f.value}`, name: 'font-size', value: f.value, checked: s.fontSize === f.value,
            onchange: () => {
              store.update((st) => { st.settings.fontSize = f.value; }, { immediate: true });
              ctx.applySettings();
              announce(`文字の大きさを「${f.label}」にしました`);
            },
          }),
          h('span', { class: 'choice-label' }, h('strong', { text: f.label }))))))),

    h('section', { class: 'section', 'aria-labelledby': 'name-title' },
      h('h2', { class: 'section-title', id: 'name-title', text: 'お名前' }),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'setting-name', text: 'ホームと印刷に出ます' }),
        h('input', {
          id: 'setting-name', class: 'input', type: 'text', maxlength: '40', autocomplete: 'off', value: s.name,
          placeholder: '例：山田 太郎',
          oninput: (e) => store.update((st) => { st.settings.name = e.target.value.slice(0, 40); }),
        }))),

    installSection(),
    lockSection(ctx),

    h('section', { class: 'section', 'aria-labelledby': 'data-title' },
      h('h2', { class: 'section-title', id: 'data-title', text: 'データ' }),
      store.persistent
        ? h('p', { class: 'ok-line', text: 'この端末に保存できています。' })
        : notice('warn', 'いまの状態：この端末では保存ができません（プライベートブラウズなど）。画面を閉じると内容が消えるので、バックアップを書き出してください。'),
      h('p', { class: 'ok-line backup-line', text: `最後の控え：${s.lastBackupAt ? formatDateJa(todayKey(new Date(s.lastBackupAt))) : 'まだありません'}` }),
      h('a', { class: 'btn btn-secondary', href: '#/export', text: 'データの控えへ' })),
  );
}
