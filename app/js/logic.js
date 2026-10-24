// のこす手帖：純粋関数（DOM・localStorage に触れない）
// 進捗計算、今日の1問、開示設定とプレビュー、手続きナビの期限計算、バックアップの検証。
// Node のテスト（tests/logic.test.js）からも読み込む。

import {
  QUESTIONS, CATEGORIES, DISCLOSURE_CATEGORIES, RELATIONS, PEOPLE_QUESTION_ID,
} from './questions.js';
import {
  wishLabel, paymentLabel, nokeepLabel, groupById,
} from './digital-templates.js';

export const STORAGE_KEY = 'nokosu-techo-v1';
export const APP_ID = 'nokosu-techo';
export const DATA_VERSION = 1;

// ────────────────────────────────
// 状態の初期値と正規化
// ────────────────────────────────

export function createEmptyState() {
  return {
    version: DATA_VERSION,
    // lastBackupAt：最後にバックアップを書き出した日時。lockHash / lockSalt：暗証番号のロック（番号そのものは持たない）
    // lockHint：番号の置き場所のヒント（家族向け。ロック画面に出す）
    settings: { fontSize: 'standard', name: '', lastBackupAt: '', lockHash: '', lockSalt: '', lockHint: '' },
    answers: {},
    skipped: {},
    disclosure: {},
    digital: { items: [], noKeep: [], spareKey: { device: '', unlockHint: '', contact: '' } },
    letters: [],
    navi: { deathDate: '', checked: {} },
    updatedAt: '',
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const FONT_SIZES = ['standard', 'large', 'xlarge'];
export const STAGE_IDS = ['now', 'incapacity', 'after', 'never'];

function cleanRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isObj).map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k] = str(v);
    if (!out.id) out.id = uid();
    return out;
  });
}

/** 読み込んだデータ（信頼できない）を安全な形にそろえる */
export function normalizeState(raw) {
  const base = createEmptyState();
  if (!isObj(raw)) return base;
  const s = base;
  if (isObj(raw.settings)) {
    s.settings.fontSize = FONT_SIZES.includes(raw.settings.fontSize) ? raw.settings.fontSize : 'standard';
    s.settings.name = Array.from(str(raw.settings.name)).slice(0, 40).join('');
    s.settings.lastBackupAt = Number.isNaN(Date.parse(str(raw.settings.lastBackupAt))) ? '' : str(raw.settings.lastBackupAt);
    const hex = (v, n) => (new RegExp(`^[0-9a-f]{${n}}$`).test(str(v)) ? str(v) : '');
    s.settings.lockHash = hex(raw.settings.lockHash, 64);
    s.settings.lockSalt = s.settings.lockHash ? hex(raw.settings.lockSalt, 32) : '';
    if (!s.settings.lockSalt) s.settings.lockHash = '';
    s.settings.lockHint = s.settings.lockHash ? Array.from(str(raw.settings.lockHint)).slice(0, 80).join('') : '';
  }
  if (isObj(raw.answers)) {
    for (const q of QUESTIONS) {
      const v = raw.answers[q.id];
      if (v === undefined) continue;
      if (q.type === 'repeat') s.answers[q.id] = cleanRows(v);
      else if (q.type === 'check') s.answers[q.id] = Array.isArray(v) ? v.map(str) : [];
      else if (q.type === 'fields') s.answers[q.id] = isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, str(x)])) : {};
      else s.answers[q.id] = str(v);
    }
  }
  if (isObj(raw.skipped)) {
    for (const [k, v] of Object.entries(raw.skipped)) if (v) s.skipped[k] = true;
  }
  if (isObj(raw.disclosure)) {
    for (const [pid, map] of Object.entries(raw.disclosure)) {
      if (!isObj(map)) continue;
      const m = {};
      for (const [cat, stage] of Object.entries(map)) if (STAGE_IDS.includes(stage)) m[cat] = stage;
      s.disclosure[pid] = m;
    }
  }
  if (isObj(raw.digital)) {
    s.digital.items = cleanRows(raw.digital.items);
    s.digital.noKeep = cleanRows(raw.digital.noKeep);
    if (isObj(raw.digital.spareKey)) {
      for (const k of Object.keys(s.digital.spareKey)) s.digital.spareKey[k] = str(raw.digital.spareKey[k]);
    }
  }
  s.letters = cleanRows(raw.letters);
  if (isObj(raw.navi)) {
    s.navi.deathDate = isDateKey(raw.navi.deathDate) ? raw.navi.deathDate : '';
    if (isObj(raw.navi.checked)) for (const [k, v] of Object.entries(raw.navi.checked)) if (v) s.navi.checked[k] = true;
  }
  s.updatedAt = str(raw.updatedAt);
  return s;
}

/** バックアップファイルの中身を検証する */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: 'ファイルを読み取れませんでした。のこす手帖で書き出した .json ファイルを選んでください。' };
  }
  const data = isObj(obj) && obj.app === APP_ID && isObj(obj.data) ? obj.data : obj;
  if (!isObj(data) || !isObj(data.answers) || !isObj(data.settings)) {
    return { ok: false, error: 'のこす手帖のバックアップファイルではないようです。' };
  }
  const state = normalizeState(data);
  return { ok: true, state, exportedAt: isObj(obj) ? str(obj.exportedAt) : '' };
}

/** バックアップを勧めるか：ある程度書いていて、まだ一度も、または半年以上バックアップしていない */
export const BACKUP_REMIND_DAYS = 180;
export function backupReminder(state, now = new Date()) {
  if (overallProgress(state.answers).answered < 5) return null;
  const last = Date.parse(state.settings.lastBackupAt);
  if (Number.isNaN(last)) return { never: true };
  const days = Math.floor((now.getTime() - last) / 86400000);
  return days >= BACKUP_REMIND_DAYS ? { never: false, days } : null;
}

export function buildBackup(state, now = new Date()) {
  // ロックは控えに入れない（番号を忘れて消したあと、控えから戻しても同じロックがかからないように）
  const data = { ...state, settings: { ...state.settings, lockHash: '', lockSalt: '', lockHint: '' } };
  return { app: APP_ID, version: DATA_VERSION, exportedAt: now.toISOString(), data };
}

let uidCounter = 0;
export function uid() {
  uidCounter = (uidCounter + 1) % 1000;
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + uidCounter.toString(36);
}

/** パスワードそのものらしき文字列か（英字と数字が混ざった、空白のない6文字以上） */
export function looksLikePassword(text) {
  const t = String(text || '').trim();
  return t.length >= 6 && !/\s/.test(t) && /[A-Za-z]/.test(t) && /\d/.test(t) && /^[\x21-\x7e]+$/.test(t);
}

// ────────────────────────────────
// 進捗
// ────────────────────────────────

export function isAnswered(q, v) {
  if (v == null) return false;
  switch (q.type) {
    case 'check': return Array.isArray(v) && v.length > 0;
    case 'repeat': return Array.isArray(v) && v.some((row) => Object.entries(row).some(([k, x]) => k !== 'id' && str(x).trim() !== ''));
    case 'fields': return isObj(v) && Object.values(v).some((x) => str(x).trim() !== '');
    default: return str(v).trim() !== '';
  }
}

/** カテゴリごとの記入率 */
export function categoryProgress(answers, questions = QUESTIONS, categories = CATEGORIES) {
  return categories.map((c) => {
    const qs = questions.filter((q) => q.cat === c.id);
    const answered = qs.filter((q) => isAnswered(q, answers[q.id])).length;
    return { id: c.id, name: c.name, answered, total: qs.length, ratio: qs.length ? answered / qs.length : 0 };
  });
}

export function overallProgress(answers, questions = QUESTIONS) {
  const answered = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  return { answered, total: questions.length, ratio: questions.length ? answered / questions.length : 0 };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 今日の1問：未回答・未スキップの設問から、日付で決まる1問を選ぶ。
 * すべてスキップ済みなら、スキップした設問からも選ぶ。全部答えていれば null。
 */
export function pickTodayQuestion(answers, skipped, dateKey, offset = 0, questions = QUESTIONS) {
  const unanswered = questions.filter((q) => !isAnswered(q, answers[q.id]));
  let pool = unanswered.filter((q) => !skipped[q.id]);
  if (pool.length === 0) pool = unanswered;
  if (pool.length === 0) return null;
  const idx = (hashString(dateKey) + offset) % pool.length;
  return pool[idx];
}

// ────────────────────────────────
// 人と開示設定
// ────────────────────────────────

export const STAGES = [
  { id: 'now', label: '今すぐ' },
  { id: 'incapacity', label: '判断がむずかしくなったら' },
  { id: 'after', label: '亡くなったあと' },
  { id: 'never', label: '見せない' },
];
const STAGE_RANK = { now: 0, incapacity: 1, after: 2 };

export function stageLabel(id) {
  return STAGES.find((s) => s.id === id)?.label || '';
}

/** 人の続柄。自由に書いた続柄があればそれを使う */
export function personRelation(person) {
  return String(person?.relationNote || '').trim() || relationLabel(person?.relation);
}

export function relationLabel(value) {
  return RELATIONS.find((r) => r.value === value)?.label || '続柄未設定';
}

export function isFamily(person) {
  return !!RELATIONS.find((r) => r.value === person?.relation)?.family;
}

/** 名前が入力された人の一覧 */
export function getPeople(state) {
  const rows = state.answers[PEOPLE_QUESTION_ID];
  return Array.isArray(rows) ? rows.filter((p) => str(p.name).trim() !== '') : [];
}

export function personName(state, personId) {
  const p = getPeople(state).find((x) => x.id === personId);
  return p ? p.name : '';
}

/** 安全な初期値：家族は「亡くなったあと」、それ以外は「見せない」 */
export function defaultStage(person) {
  return isFamily(person) ? 'after' : 'never';
}

export function getStage(state, person, catId) {
  const set = state.disclosure?.[person.id]?.[catId];
  return STAGE_IDS.includes(set) ? set : defaultStage(person);
}

export function isExplicit(state, personId, catId) {
  return STAGE_IDS.includes(state.disclosure?.[personId]?.[catId]);
}

/** 設定 setting のカテゴリが、時期 viewStage に見えるか */
export function canSee(setting, viewStage) {
  if (setting === 'never' || !(setting in STAGE_RANK) || !(viewStage in STAGE_RANK)) return false;
  return STAGE_RANK[setting] <= STAGE_RANK[viewStage];
}

export function visibleCategoryIds(state, person, viewStage) {
  return DISCLOSURE_CATEGORIES.filter((c) => canSee(getStage(state, person, c.id), viewStage)).map((c) => c.id);
}

/** 手紙がその時期のシートに入るか。日付・出来事指定の手紙は開封の目安つきでどの時期にも入る */
/** 手紙は、どの「いつ渡すか」でも「亡くなったあと」の受け渡しシートにだけ載せる（今すぐのシートで先に渡らないように） */
export function letterVisible(letter, viewStage) {
  return viewStage === 'after';
}

export function letterTimingLabel(letter) {
  if (letter.timing === 'date') return letter.date ? `${formatDateJa(letter.date)}に開封` : '日付を指定（未入力）';
  if (letter.timing === 'event') return `${letter.event || '出来事'}のときに開封`;
  if (letter.timing === 'after') return '亡くなったあとに開封';
  return '届けるタイミング未設定';
}

function categoryHasContent(state, catId) {
  if (catId === 'digital') return state.digital.items.length > 0 || state.digital.noKeep.length > 0;
  return QUESTIONS.some((q) => q.cat === catId && isAnswered(q, state.answers[q.id]));
}

/** 開示設定の警告（未設定・矛盾） */
export function disclosureWarnings(state) {
  const out = [];
  const people = getPeople(state);
  if (people.length === 0) {
    out.push({ level: 'warn', code: 'no-people', text: '家族・大切な人が1人も登録されていません。このままでは手帖の内容が誰にも届きません。' });
    return out;
  }
  const nobodyAt = (catId, stage) => !people.some((p) => canSee(getStage(state, p, catId), stage));
  if (nobodyAt('funeral', 'after')) {
    out.push({ level: 'warn', code: 'funeral-hidden', text: '「葬儀・お墓」の希望が、亡くなったあと誰にも見えません。' });
  }
  if (nobodyAt('medical', 'incapacity')) {
    // 医療の希望は「判断がむずかしくなったら」に読まれてこそ意味がある。記入があれば警告、なければ案内
    const hasMedical = categoryHasContent(state, 'medical');
    out.push({
      level: hasMedical ? 'warn' : 'info',
      code: 'medical-hidden',
      text: '「医療・介護」の希望が、判断がむずかしくなったときに誰にも見えません。信頼できる人には「判断がむずかしくなったら」を選ぶと安心です。',
    });
  }
  for (const c of DISCLOSURE_CATEGORIES) {
    if (c.id === 'funeral' || c.id === 'medical') continue;
    if (categoryHasContent(state, c.id) && nobodyAt(c.id, 'after')) {
      out.push({ level: 'warn', code: `hidden-${c.id}`, text: `「${c.name}」は記入がありますが、亡くなったあとも誰にも見えない設定です。` });
    }
  }
  if (!people.some(isFamily)) {
    out.push({ level: 'info', code: 'no-family', text: '家族として登録された人がいません。家族以外の人の初期値は「見せない」です。' });
  }
  const ids = new Set(people.map((p) => p.id));
  const orphan = state.letters.filter((l) => l.to && !ids.has(l.to)).length;
  const noTo = state.letters.filter((l) => !l.to).length;
  if (orphan) out.push({ level: 'warn', code: 'orphan-letters', text: `宛先の人が削除された手紙が${orphan}通あります。宛先を選び直してください。` });
  if (noTo) out.push({ level: 'warn', code: 'no-recipient', text: `宛先が決まっていない手紙が${noTo}通あります。` });
  for (const p of people) {
    const anyExplicit = DISCLOSURE_CATEGORIES.some((c) => isExplicit(state, p.id, c.id));
    if (!anyExplicit) out.push({ level: 'info', code: `default-${p.id}`, text: `${p.name}さんの設定は初期値のままです。内容を確かめてください。` });
    if (!str(p.phone).trim() && !str(p.email).trim() && !str(p.address).trim()) {
      out.push({ level: 'info', code: `nocontact-${p.id}`, text: `${p.name}さんの連絡先（電話・メール・住所）が未記入です。` });
    }
  }
  return out;
}

// ────────────────────────────────
// 回答の表示用テキスト
// ────────────────────────────────

function optionLabel(options, value) {
  return options?.find((o) => o.value === value)?.label || value;
}

/** 設問の回答を、表示用の行（文字列の配列）にする */
export function formatAnswer(q, v, state) {
  if (!isAnswered(q, v)) return [];
  switch (q.type) {
    case 'radio': return [optionLabel(q.options, v)];
    case 'check': return [v.map((x) => optionLabel(q.options, x)).join('、')];
    case 'person': {
      if (v === 'undecided') return ['まだ決めていない'];
      const p = getPeople(state).find((x) => x.id === v);
      return [p ? `${p.name}（${personRelation(p)}）` : '（削除された人）'];
    }
    case 'fields':
      return q.fields.filter((f) => str(v[f.key]).trim()).map((f) => `${f.label}：${fieldValue(f, v[f.key])}`);
    case 'repeat':
      return v.map((row) => q.fields
        .filter((f) => str(row[f.key]).trim())
        .map((f) => `${f.label}：${fieldValue(f, row[f.key])}`)
        .join('／')).filter(Boolean);
    case 'date': return [formatDateJa(v)];
    default: return [str(v)];
  }
}

function fieldValue(f, value) {
  if (f.type === 'select') return optionLabel(f.options, value);
  if (f.type === 'date' && f.era && isDateKey(value)) return `${formatDateJa(value)}（${eraDateLabel(value)}）`;
  if (f.type === 'date') return formatDateJa(value);
  return str(value);
}

function categoryEntries(state, catId) {
  return QUESTIONS.filter((q) => q.cat === catId)
    .map((q) => ({ id: q.id, title: q.title, lines: formatAnswer(q, state.answers[q.id], state) }))
    .filter((e) => e.lines.length > 0);
}

function digitalContent(state) {
  const items = state.digital.items.map((it) => ({
    id: it.id,
    group: groupById(it.group).name,
    name: it.name || '（名前未入力）',
    lines: [
      `希望：${wishLabel(it.wish)}`,
      it.device ? `使っている端末：${it.device}` : '',
      paymentLabel(it.payment) ? `支払い：${paymentLabel(it.payment)}` : '',
      it.hint ? `保管場所のヒント：${it.hint}` : '',
      it.memo ? `メモ：${it.memo}` : '',
    ].filter(Boolean),
  }));
  const noKeep = state.digital.noKeep.filter((n) => str(n.target).trim()).map((n) => ({
    id: n.id, target: n.target, action: nokeepLabel(n.action), memo: n.memo || '',
  }));
  const k = state.digital.spareKey;
  const spareKey = k.device || k.unlockHint ? { ...k } : null;
  return { items, noKeep, spareKey };
}

/**
 * 開示プレビュー：person に、viewStage の時点で見える内容（読み取り専用データ）。
 * 見えないカテゴリは中身を一切含めない。
 */
export function buildViewerContent(state, personId, viewStage) {
  const person = getPeople(state).find((p) => p.id === personId);
  if (!person || !(viewStage in STAGE_RANK)) return null;
  const visible = new Set(visibleCategoryIds(state, person, viewStage));
  const categories = CATEGORIES.filter((c) => visible.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, entries: categoryEntries(state, c.id) }));
  const digital = visible.has('digital') ? digitalContent(state) : null;
  const letters = state.letters
    .filter((l) => l.to === personId && letterVisible(l, viewStage))
    .map((l) => ({ id: l.id, title: l.title || '（題名なし）', body: l.body || '', timing: letterTimingLabel(l) }));
  const hidden = DISCLOSURE_CATEGORIES.filter((c) => !visible.has(c.id)).map((c) => c.name);
  return { person, stage: viewStage, stageLabel: stageLabel(viewStage), categories, digital, letters, hidden };
}

/** 自分用の控え：すべての内容 */
export function buildFullContent(state) {
  return {
    person: null,
    stage: 'all',
    stageLabel: 'すべて',
    categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, entries: categoryEntries(state, c.id) })),
    digital: digitalContent(state),
    letters: state.letters.map((l) => ({
      id: l.id, title: l.title || '（題名なし）', body: l.body || '', timing: letterTimingLabel(l),
      to: personName(state, l.to) || '',
    })),
    hidden: [],
  };
}

// ────────────────────────────────
// 日付
// ────────────────────────────────

export function isDateKey(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // 2026-02-30 のような存在しない日付は、Date に通すと日付がずれるので弾く
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

function keyFromUTC(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function addDays(key, n) {
  const { y, m, d } = parseKey(key);
  return keyFromUTC(Date.UTC(y, m - 1, d + n));
}

/** 月を足す。応当日がない月は月末にそろえる（例：8/31 ＋ 1か月 → 9/30） */
export function addMonths(key, n) {
  const { y, m, d } = parseKey(key);
  const lastDay = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return keyFromUTC(Date.UTC(y, m - 1 + n, Math.min(d, lastDay)));
}

/** 「知った日の翌日から○か月」の満了日（民法140条・143条、国税通則法10条） */
export function monthsDeadline(key, n) {
  const s = addDays(key, 1); // 初日不算入：翌日が起算日
  const { y, m, d } = parseKey(s);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  if (d > last) return keyFromUTC(Date.UTC(y, m - 1 + n, last)); // 応当日なし→その月の末日
  return addDays(keyFromUTC(Date.UTC(y, m - 1 + n, d)), -1); // 応当日の前日
}

/** b − a の日数 */
export function diffDays(a, b) {
  const A = parseKey(a);
  const B = parseKey(b);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86400000);
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
export function formatDateJa(key, withWeek = false) {
  if (!isDateKey(key)) return str(key);
  const { y, m, d } = parseKey(key);
  const w = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日${withWeek ? `（${w}）` : ''}`;
}

// 元号の始まりの年（年の途中で改元した年は、前後の元号を両方出す）
const ERAS = [
  { name: '令和', start: 2019 }, { name: '平成', start: 1989 }, { name: '昭和', start: 1926 },
  { name: '大正', start: 1912 }, { name: '明治', start: 1868 },
];

/** 生年月日の「年」の選択肢を元号ごとにまとめるための区切り（改元の年は新しい元号に入れる） */
export const ERA_GROUPS = [
  { name: '令和', from: 2019, to: 9999 }, { name: '平成', from: 1989, to: 2018 }, { name: '昭和', from: 1926, to: 1988 },
  { name: '大正', from: 1912, to: 1925 }, { name: '明治', from: 1868, to: 1911 },
];

/** 西暦の年を和暦で。例：1951 → 「昭和26年」、1989 → 「昭和64年・平成元年」 */
export function eraYearLabel(y) {
  const n = (era, yy) => `${era.name}${yy - era.start + 1 === 1 ? '元' : yy - era.start + 1}年`;
  const i = ERAS.findIndex((e) => y >= e.start);
  if (i < 0) return '';
  const cur = ERAS[i];
  // 改元の年は、ひとつ前の元号の最後の年でもある
  return y === cur.start && ERAS[i + 1] ? `${n(ERAS[i + 1], y)}・${n(cur, y)}` : n(cur, y);
}

/** 令和の年（2019年5月1日〜） */
// 元号が変わった日（この日から新しい元号）
const ERA_DAYS = [
  { name: '令和', start: '2019-05-01' }, { name: '平成', start: '1989-01-08' }, { name: '昭和', start: '1926-12-25' },
  { name: '大正', start: '1912-07-30' }, { name: '明治', start: '1868-10-23' },
];

/** 日付まで分かっているときの和暦の年。例：1989-01-07 → 「昭和64年」、1989-01-08 → 「平成元年」 */
export function eraDateLabel(key) {
  if (!isDateKey(key)) return '';
  const era = ERA_DAYS.find((e) => key >= e.start);
  if (!era) return '';
  const n = Number(key.slice(0, 4)) - Number(era.start.slice(0, 4)) + 1;
  return `${era.name}${n === 1 ? '元' : n}年`;
}

export function warekiYear(key) {
  const { y, m } = parseKey(key);
  if (y > 2019 || (y === 2019 && m >= 5)) return `令和${y - 2018 === 1 ? '元' : y - 2018}年`;
  return '';
}

// ────────────────────────────────
// 遺族の手続きナビ
// ────────────────────────────────

export const NAVI_GROUPS = [
  { id: 'd7', label: '7日以内' },
  { id: 'd14', label: '14日以内' },
  { id: 'mine', label: '手帖に書かれた口座・保険など（早めに）' },
  { id: 'm3', label: '3か月以内' },
  { id: 'm4', label: '4か月以内' },
  { id: 'm10', label: '10か月以内' },
  { id: 'asap', label: '期限が長いもの（早めに）' },
];

// 日数の期限：戸籍法43条により届出事件発生の日（死亡を知った日）を1日目と数えるため「基準日＋日数−1日」。
// 年金・健康保険・介護保険・世帯主変更にも同じ数え方を当てはめており、これらは法定より早め（安全側）になる。
// 月数の期限：民法140条・143条（国税は国税通則法10条）により、知った日の翌日を起算日とし、
// 最後の月の応当日の前日（応当日がなければその月の末日）。
export const NAVI_BASE_TASKS = [
  { id: 'death-cert', group: 'd7', days: 7, title: '死亡診断書（死体検案書）を受け取り、コピーを数枚とる', where: '病院・医師', detail: '保険金や年金の請求でも使うので、提出前にコピーをとっておきます。' },
  { id: 'death-report', group: 'd7', days: 7, title: '死亡届を出す', where: '亡くなった方の本籍地・亡くなった場所・届出人の所在地のいずれかの市区町村役場', detail: '亡くなったことを知った日から7日以内（国外で亡くなった場合は3か月以内）。葬儀社が代わりに出してくれることもあります。' },
  { id: 'cremation', group: 'd7', days: 7, title: '火葬許可を申請する', where: '市区町村役場（死亡届と同時に）', detail: '火葬許可証は、火葬のあと火葬場で記入されて返されます。納骨のときに必要です（「埋葬許可証」とも呼ばれます）。' },
  { id: 'pension', group: 'd14', days: 10, title: '年金の受給を止める（受給権者死亡届）', where: '年金事務所（郵送・電子申請。窓口は予約制で年金事務所・街角の年金相談センター）／共済年金は各共済組合', detail: '厚生年金は10日以内、国民年金は14日以内。日本年金機構にマイナンバーが収録されていれば原則として省略できます（未支給年金の請求は別に必要です）。障害基礎年金・遺族基礎年金だけを受けていた場合は市区町村役場に出します。' },
  { id: 'health', group: 'd14', days: 14, title: '健康保険の資格喪失の手続きをし、資格確認書などを返す', where: '市区町村役場（国民健康保険・後期高齢者医療）／勤め先（会社の健康保険は勤め先が5日以内に届け出ます）', detail: '国民健康保険・後期高齢者医療は14日以内。交付されている資格確認書（古い保険証が残っていればそれも）を返します。葬祭費・埋葬料の申請も同じ窓口で案内されます。' },
  { id: 'care', group: 'd14', days: 14, title: '介護保険の資格喪失届を出し、保険証を返す', where: '市区町村役場', detail: '65歳以上の方、または要介護・要支援の認定を受けていた方が対象です。' },
  { id: 'householder', group: 'd14', days: 14, title: '世帯主の変更届を出す', where: '市区町村役場', detail: '残る世帯員が2人以上いる場合に必要です。1人だけの場合は不要です。' },
  { id: 'renounce', group: 'm3', months: 3, title: '相続放棄・限定承認をするか決める', where: '家庭裁判所', detail: '相続の開始を知った日から3か月以内。借入れや保証人の有無を確かめてから判断します。期限の延長を申し立てることもできます。' },
  { id: 'quasi-return', group: 'm4', months: 4, title: '準確定申告をする（亡くなった年の所得の申告）', where: '亡くなった方の住所地の税務署', detail: '相続の開始を知った日の翌日から4か月以内。年金だけの収入など、申告が不要な場合もあります。' },
  { id: 'inheritance-tax', group: 'm10', months: 10, title: '相続税の申告と納付をする（必要な場合）', where: '亡くなった方の住所地の税務署', detail: '相続の開始を知った日の翌日から10か月以内。生命保険金（非課税枠を超える部分）や一定の生前贈与も含めた課税価格の合計が基礎控除額（3,000万円＋600万円×法定相続人の数）以下なら申告は不要です。配偶者の税額軽減や小規模宅地等の特例を使う場合は、税額がゼロになっても申告が必要です。' },
  { id: 'will-search', group: 'asap', title: '遺言書があるか確かめる', where: '自宅・法務局・公証役場', detail: '自宅で見つかった自筆の遺言書は開封せず、家庭裁判所で検認を受けます。法務局で保管されている遺言書と公正証書遺言は検認が不要です。' },
  { id: 'banks', group: 'asap', title: '銀行など金融機関に連絡する', where: '各金融機関', detail: '金融機関が亡くなったことを知ると口座は凍結され、原則として相続の手続きのあとで払い戻されます。葬儀費用などのために、遺産分割の前でも一定額（1つの金融機関につき150万円まで）を払い戻せる制度があります。' },
  { id: 'mobile', group: 'asap', title: '携帯電話を解約する', where: '携帯電話会社の窓口', detail: '端末の中の写真や連絡先を残したい場合は、解約の前に取り出します。' },
  { id: 'utilities', group: 'asap', title: '公共料金（電気・ガス・水道）の名義変更・解約', where: '各事業者', detail: '引き落とし口座が凍結されると支払いが止まります。' },
  { id: 'credit', group: 'asap', title: 'クレジットカードを解約する', where: '各カード会社', detail: 'カードで払っているサブスクや公共料金も合わせて確かめます。' },
  { id: 'funeral-benefit', group: 'asap', title: '葬祭費・埋葬料を申請する', where: '市区町村役場（国民健康保険・後期高齢者医療）／協会けんぽ・健康保険組合（会社の健康保険）', detail: '国民健康保険・後期高齢者医療の葬祭費は葬儀を行った日の翌日から2年、会社の健康保険の埋葬料は亡くなった日の翌日から2年で時効になります。' },
  { id: 'survivor-pension', group: 'asap', title: '遺族年金・未支給年金を請求する', where: '年金事務所', detail: '遺族年金は5年以内が目安です。' },
  { id: 'life-insurance', group: 'asap', title: '生命保険金を請求する', where: '各保険会社', detail: '請求は3年以内が目安です。' },
];

export function computeDue(deathDate, task) {
  if (!isDateKey(deathDate)) return null;
  if (task.days) return addDays(deathDate, task.days - 1);
  if (task.months) return monthsDeadline(deathDate, task.months);
  return null;
}

/** 手帖の記入内容から、手続きを自動で追加する */
const BANK_NOTE = '亡くなったことを伝えると口座は凍結されます。葬儀費用などのために、1つの金融機関につき150万円までは遺産分割の前でも払い戻せる制度があります';

export function autoNaviTasks(state) {
  const a = state.answers;
  const rows = (id) => (Array.isArray(a[id]) ? a[id] : []);
  const out = [];
  for (const r of rows('money.banks')) {
    if (!str(r.bank).trim()) continue;
    const kind = { ordinary: '普通預金', time: '定期預金', both: '普通と定期' }[r.kind];
    out.push({
      id: `auto:bank:${r.id}`, group: 'mine', title: `${r.bank}${r.branch ? ` ${r.branch}` : ''}に連絡する`, where: r.bank,
      detail: [kind ? `種類：${kind}` : '', r.memo ? `メモ：${r.memo}` : '', BANK_NOTE].filter(Boolean).join('。'),
      source: '手帖：預貯金の口座',
    });
  }
  for (const r of rows('money.securities')) {
    if (!str(r.company).trim()) continue;
    out.push({ id: `auto:sec:${r.id}`, group: 'mine', title: `${r.company}に連絡する（証券・投資信託）`, where: r.company, detail: '相続人の口座へ移す手続きが必要です。', source: '手帖：株式・投資信託' });
  }
  for (const r of rows('money.cards')) {
    if (!str(r.company).trim()) continue;
    out.push({ id: `auto:card:${r.id}`, group: 'mine', title: `${r.company}を解約する`, where: r.company, detail: r.memo ? `メモ：${r.memo}` : 'このカードで払っている料金がないか確かめます。', source: '手帖：クレジットカード' });
  }
  for (const r of rows('insurance.policies')) {
    if (!str(r.company).trim()) continue;
    out.push({ id: `auto:ins:${r.id}`, group: 'mine', title: `${r.company}に保険金・給付金を請求する`, where: r.company, detail: r.place ? `保険証券の保管場所：${r.place}` : '保険証券を探して連絡します。', source: '手帖：保険・共済' });
  }
  if (a['funeral.mutual'] === 'yes') {
    out.push({ id: 'auto:mutual', group: 'd7', days: 7, title: '互助会・葬儀社の会員証を確認し、連絡する', where: '互助会・葬儀社', detail: '積立金を葬儀に使えます。', source: '手帖：葬儀・お墓' });
  }
  if (a['will.storage'] === 'houmukyoku') {
    out.push({ id: 'auto:will-houmukyoku', group: 'mine', title: '法務局に遺言書情報証明書を請求する', where: '法務局（遺言書保管所）', detail: '法務局で保管されている遺言書は検認が不要です。', source: '手帖：相続・遺言' });
  } else if (a['will.storage'] === 'home' || a['will.exists'] === 'holograph') {
    out.push({ id: 'auto:will-home', group: 'mine', title: '自筆の遺言書を開封せず、家庭裁判所に検認を申し立てる', where: '家庭裁判所', detail: (a['will.place'] ? `置き場所：${a['will.place']}。` : '') + '法律上は「遅滞なく」申し立てます。相続放棄の判断（3か月以内）の前に内容を確かめられるよう、早めに申し立てます。', source: '手帖：相続・遺言' });
  }
  for (const it of state.digital.items) {
    out.push({
      id: `auto:digital:${it.id}`, group: 'asap',
      title: `${it.name || 'デジタルサービス'}：${wishLabel(it.wish)}`,
      where: groupById(it.group).name,
      detail: [paymentLabel(it.payment) ? `支払い：${paymentLabel(it.payment)}` : '', it.hint ? `保管場所のヒント：${it.hint}` : ''].filter(Boolean).join('／') || '',
      source: 'デジタル遺品',
    });
  }
  for (const n of state.digital.noKeep) {
    if (!str(n.target).trim()) continue;
    out.push({ id: `auto:nokeep:${n.id}`, group: 'asap', title: `残さないもの：${n.target}`, where: '', detail: nokeepLabel(n.action) + (n.memo ? `／${n.memo}` : ''), source: 'デジタル遺品（残さないもの）' });
  }
  return out;
}

/** 手続きナビのチェックリスト。逝去日がなければ期限は null */
export function buildNaviTasks(state, deathDate) {
  const auto = autoNaviTasks(state);
  // 手帖に口座が書かれていれば、一般的な「金融機関に連絡する」は口座ごとの項目にまとめる
  const hasBank = auto.some((t) => t.id.startsWith('auto:bank:'));
  const base = NAVI_BASE_TASKS.filter((t) => !(hasBank && t.id === 'banks'));
  const tasks = [...base.map((t) => ({ ...t, source: '' })), ...auto];
  return tasks.map((t) => ({ ...t, due: computeDue(deathDate, t) }));
}

/** done / overdue（期限超過） / soon（7日以内） / open / nodue */
export function taskStatus(task, checked, today) {
  if (checked?.[task.id]) return 'done';
  if (!task.due) return 'nodue';
  const d = diffDays(today, task.due);
  if (d < 0) return 'overdue';
  if (d <= 7) return 'soon';
  return 'open';
}

export function groupTasks(tasks) {
  return NAVI_GROUPS.map((g) => ({ ...g, tasks: tasks.filter((t) => t.group === g.id) })).filter((g) => g.tasks.length);
}

// ────────────────────────────────
// 緊急連絡カード（財布に入れる大きさ）
// ────────────────────────────────

/** 手帖の答えから、倒れたときに役立つことだけを集める。書かれていない項目は出さない */
export function emergencyInfo(state) {
  const a = state.answers;
  const prof = isObj(a['me.profile']) ? a['me.profile'] : {};
  const clinic = isObj(a['medical.clinic']) ? a['medical.clinic'] : {};
  const people = getPeople(state);
  // 緊急連絡先：「まず連絡してほしい人」。決めていなければ、電話番号のある最初の人
  const first = people.find((p) => p.id === a['family.first']) || people.find((p) => str(p.phone).trim());
  const cut = (v, n) => { const t = Array.from(str(v).replace(/\s+/g, ' ').trim()); return t.length > n ? `${t.slice(0, n).join('')}…` : t.join(''); };
  const rows = [
    ['氏名', str(prof.name).trim() || str(state.settings.name).trim()],
    ['生年月日', isDateKey(prof.birth) ? fieldValue({ type: 'date', era: true }, prof.birth) : ''],
    ['緊急連絡先', first ? [first.name, `（${personRelation(first)}）`, str(first.phone).trim() ? ` ${first.phone}` : ''].join('') : ''],
    ['かかりつけ', [str(clinic.name).trim(), str(clinic.phone).trim()].filter(Boolean).join(' ')],
    ['持病・薬', cut(a['medical.conditions'], 40)],
    ['アレルギー', cut(a['medical.allergy'], 30)],
  ];
  return rows.filter(([, v]) => v).map(([label, value]) => ({ label, value }));
}
