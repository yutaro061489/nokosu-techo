// 暗証番号のロック：開くたびに番号を聞く。番号そのものは保存せず、塩を足したハッシュだけを持つ。
// かんたんなのぞき見よけで、データの暗号化ではない（端末の中のデータはそのまま）。

import { h } from './dom.js';

export const lockAvailable = () => !!(window.crypto && window.crypto.subtle && window.isSecureContext);

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export function newSalt() {
  return toHex(window.crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`nokosu-techo:${salt}:${pin}`);
  return toHex(await window.crypto.subtle.digest('SHA-256', data));
}

export const validPin = (pin) => /^\d{4,8}$/.test(pin);

/**
 * ロック画面を出し、正しい番号が入ったら閉じる。
 * onForgot：「忘れたとき」でデータを消して最初からにする処理（確認は呼ぶ側で行う）
 */
export function showLock(settings, { onForgot } = {}) {
  return new Promise((resolve) => {
    const msg = h('p', { class: 'lock-msg', role: 'alert' });
    const input = h('input', {
      id: 'lock-pin', class: 'input lock-input', type: 'password', inputmode: 'numeric', autocomplete: 'off',
      maxlength: '8', 'aria-describedby': settings.lockHint ? 'lock-hint' : null,
    });
    const open = async () => {
      if (!validPin(input.value) || (await hashPin(input.value, settings.lockSalt)) !== settings.lockHash) {
        msg.textContent = '番号が違います。';
        input.value = '';
        input.focus();
        return;
      }
      screen.remove();
      document.body.classList.remove('is-locked');
      resolve(true);
    };
    const screen = h('div', { class: 'lock-screen', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lock-title' },
      h('form', { class: 'lock-box', onsubmit: (e) => { e.preventDefault(); open(); } },
        h('img', { class: 'lock-mark', src: 'img/ill-note.png', alt: '', width: 320, height: 320 }),
        h('h1', { class: 'lock-title', id: 'lock-title', text: 'のこす手帖' }),
        h('label', { class: 'lock-label', for: 'lock-pin', text: '暗証番号' }),
        input,
        msg,
        // ご家族が番号を知らないときのために、番号を書いた紙の置き場所を出す
        settings.lockHint ? h('p', { class: 'lock-hint', id: 'lock-hint', text: `ご家族の方へ：番号は「${settings.lockHint}」にあります。` }) : null,
        h('button', { type: 'submit', class: 'btn btn-primary lock-open', text: '開く' }),
        onForgot ? h('button', {
          type: 'button', class: 'btn btn-quiet lock-forgot', text: '番号を忘れたとき',
          onclick: async () => { if (await onForgot()) { screen.remove(); document.body.classList.remove('is-locked'); resolve(false); } },
        }) : null));
    // 開いていた確認ダイアログは閉じる（ロック画面の上に残ると番号を入れられない）
    for (const d of document.querySelectorAll('dialog[open]')) d.close('cancel');
    document.body.classList.add('is-locked');
    document.body.append(screen);
    input.focus();
  });
}
