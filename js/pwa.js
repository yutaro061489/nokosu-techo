// ホーム画面に置けるアプリにする：電波がなくても開けるようにし、保存したデータを消さないよう端末に頼む。
// （iPhone の Safari は、しばらく開かなかったサイトの保存データを消すことがある。ホーム画面に置いたアプリは消えにくい）

let installPrompt = null; // Android などの「ホーム画面に追加」の確認（ブラウザが出せるときだけ）

/** ホーム画面から開いているか */
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** iPhone・iPad か（ホーム画面への追加は、共有ボタンから本人が行う） */
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const canPromptInstall = () => !!installPrompt;

export async function promptInstall() {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  return outcome === 'accepted';
}

export function setupPwa({ shareMode }) {
  // claude.ai の共有版（埋め込み）では動かさない
  if (shareMode || !('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  navigator.serviceWorker.register('sw.js').catch(() => { /* 使えなくてもアプリは動く */ });
  // 保存したデータを、容量が足りないときにも消さないよう頼む（認めるかどうかはブラウザが決める）
  navigator.storage?.persist?.().catch(() => {});
}
