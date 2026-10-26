// 保存：localStorage に自動保存。使えない環境ではメモリ上で動き、警告を出す。

import { STORAGE_KEY, createEmptyState, normalizeState } from './logic.js';

function probeStorage() {
  try {
    const ls = window.localStorage;
    const k = '__nokosu_probe__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

/** key：保存場所の名前。ステージング（記入例）版は別の名前にして、本番の手帖と混ざらないようにする */
export function createStore(key = STORAGE_KEY) {
  const storage = probeStorage();
  let state = createEmptyState();
  let loadError = false;
  let hadData = false; // 開いた時点で保存済みのデータがあったか

  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) { hadData = true; state = normalizeState(JSON.parse(raw)); }
    } catch {
      loadError = true; // 壊れたデータは別のキーに控えてから、初期状態で始める
      try { storage.setItem(`${key}-broken`, storage.getItem(key)); } catch { /* 何もしない */ }
    }
  }

  const listeners = new Set();
  let saveTimer = null;

  function persist() {
    if (!storage) return 'memory';
    try {
      storage.setItem(key, JSON.stringify(state));
      return 'saved';
    } catch {
      return 'error';
    }
  }

  function emit(status) {
    for (const fn of listeners) fn(status);
  }

  return {
    get state() { return state; },
    key,
    persistent: !!storage,
    get loadError() { return loadError; },
    get hadData() { return hadData; },

    /** 状態を変更して保存する。mutator は state を直接書き換える */
    /** meta：家族の手続きのチェックや文字の大きさなど、手帖の中身ではない変更（「最後に書いた日」を変えない） */
    update(mutator, { immediate = false, meta = false } = {}) {
      mutator(state);
      state.updatedAt = new Date().toISOString();
      if (!meta) state.writtenAt = state.updatedAt;
      loadError = false;
      emit('saving');
      clearTimeout(saveTimer);
      const run = () => { saveTimer = null; emit(persist()); };
      if (immediate) run();
      else saveTimer = setTimeout(run, 250);
    },

    /** 状態を丸ごと置き換える（バックアップの読み込み） */
    replace(next) {
      state = normalizeState(next);
      loadError = false;
      clearTimeout(saveTimer);
      emit(persist());
    },

    reset() {
      state = createEmptyState();
      clearTimeout(saveTimer);
      if (storage) {
        try { storage.removeItem(key); } catch { /* 何もしない */ }
      }
      emit(storage ? 'saved' : 'memory');
    },

    flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        emit(persist());
      }
    },

    /** ほかのタブで保存された内容を読み直す。読めたら true */
    reload() {
      if (!storage) return false;
      try {
        const raw = storage.getItem(key);
        clearTimeout(saveTimer);
        saveTimer = null;
        state = raw ? normalizeState(JSON.parse(raw)) : createEmptyState();
        return true;
      } catch {
        return false;
      }
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
