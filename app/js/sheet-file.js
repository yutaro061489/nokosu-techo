// 受け渡しシートを 1 つの HTML ファイルにする。受け取った人は、スマホやパソコンでそのまま開ける（アプリ不要）。
// 送るのは本人の操作（共有シートやダウンロード）で、アプリがどこかへ送ることはない。

const SHEET_CSS = `
*{box-sizing:border-box}
body{margin:0;padding:24px 16px 40px;background:#f2f2f7;color:#1c1c1e;font:17px/1.6 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI",Meiryo,sans-serif;-webkit-text-size-adjust:100%}
.sheet{max-width:44rem;margin:0 auto;background:#fff;border-radius:14px;padding:20px 18px}
h2,h3,h4,p,dl,dd{margin:0}
.sheet-head{border-bottom:2px solid #1c1c1e;padding-bottom:10px;margin-bottom:10px;display:grid;gap:4px}
.sheet-brand{font-size:.78rem;color:#0066cc;font-weight:600;letter-spacing:.1em}
.sheet-title{font-size:1.35rem;font-weight:700}
.sheet-meta{display:flex;flex-wrap:wrap;gap:4px 20px;margin-top:4px;font-size:.85rem}
.sheet-meta>div{display:flex;gap:6px}
.sheet-meta dt{color:#6c6c70}.sheet-meta dd{font-weight:600}
.sheet-legal{font-size:.8rem;color:#6c6c70;margin-bottom:6px}
.sheet-section{margin-top:16px}
.sheet-h{font-size:1rem;font-weight:700;padding-bottom:3px;border-bottom:1px solid #c6c6c8;margin-bottom:6px}
.sheet-h4{font-size:.94rem;margin:6px 0 3px}
.sheet-dl{display:grid;gap:6px}
.sheet-item dt{font-weight:600;font-size:.85rem;color:#6c6c70}
.sheet-item dd{margin-left:1em}
.sheet-empty,.sheet-small{color:#6c6c70;font-size:.85rem}
.sheet-list{padding-left:1.3em}
.sheet-letter{margin-top:10px;padding:10px 12px;border:1px solid #c6c6c8;border-radius:6px}
.sheet-letter-timing{font-size:.8rem;font-weight:600;color:#0066cc}
.sheet-letter-body{white-space:pre-wrap;line-height:1.9}
.sheet-hidden{margin-top:16px;padding-top:10px;border-top:1px dashed #c6c6c8}
@media print{body{background:#fff;padding:0}.sheet{padding:0}}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** シートの要素から、ひとつで開ける HTML を作る（中身はすでに文字として組み立て済みの DOM なので、そのまま書き出す） */
export function sheetHtml(sheetNode, title) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${SHEET_CSS}</style></head>
<body>${sheetNode.outerHTML}</body></html>`;
}

/** スマホなら共有シート（LINE・メールなど）を、使えなければファイルの保存を出す */
export async function shareOrSave(html, filename, title) {
  const file = new File([html], filename, { type: 'text/html' });
  // 共有画面（LINE・メールなど）はスマホだけ。パソコンでは保存する（Windows の共有画面には保存がないため）
  const phone = window.matchMedia('(pointer: coarse)').matches;
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancel';
      // 共有に失敗したら保存に切り替える
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
