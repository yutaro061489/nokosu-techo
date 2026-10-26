// 電波がなくても開けるようにする。つながるときは必ず新しいファイルを取り（古い画面を出し続けない）、
// つながらないときだけ、前に保存したファイルを出す。記入したデータは扱わない（ブラウザの保存領域にある）。

const CACHE = 'nokosu-techo-v3';

// 1回開いただけで電波がなくても開けるよう、起動に要るファイルを全部先に入れる。
// ファイルを足したら、ここにも足す（scripts/build-pages.mjs が、js/ の入れ忘れがないかを確かめる）
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/main.js', 'js/store.js', 'js/logic.js', 'js/questions.js', 'js/digital-templates.js', 'js/dom.js',
  'js/components.js', 'js/demo.js', 'js/lock.js', 'js/pwa.js', 'js/sheet-file.js',
  'js/views/home.js', 'js/views/note.js', 'js/views/digital.js', 'js/views/disclosure.js', 'js/views/letters.js',
  'js/views/navi.js', 'js/views/read.js', 'js/views/export.js', 'js/views/settings.js', 'js/views/guide.js',
  'img/ill-note.png', 'img/hero.jpg', 'img/icon-192.png',
  // 「使い方」の画面写真（電波がなくても使い方を読めるように）
  'img/guide-1.png', 'img/guide-2.png', 'img/guide-3.png', 'img/guide-4.png', 'img/guide-5.png', 'img/guide-6.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // 消すのはこのアプリの古いキャッシュだけ（同じドメインのほかのサイトのものには触らない）
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('nokosu-techo-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
