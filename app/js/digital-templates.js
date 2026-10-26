// デジタル遺品のテンプレート（純粋なデータ）
// サービス名は一般に知られている例として挙げているだけで、各社とは関係ありません。

export const DIGITAL_GROUPS = [
  {
    id: 'device', name: 'スマホ・パソコン',
    note: 'ロック解除の方法がわからないと、家族は中の写真や連絡先を見られません。',
    more: 'Google の「アカウント無効化管理ツール」や Apple の「故人アカウント管理連絡先」を設定しておくと、家族が一部のデータを受け取れます（Apple の場合、パスワードや購入したコンテンツは引き継げません）。',
    templates: ['iPhone', 'Android スマートフォン', 'iPad・タブレット', 'Windows パソコン', 'Mac', 'らくらくホン・ガラケー'],
    defaultWish: 'handover',
  },
  {
    id: 'mail', name: 'メール',
    note: '多くの手続きの通知はメールで届きます。',
    templates: ['Gmail', 'Yahoo!メール', 'iCloud メール', 'Outlook.com', '携帯会社のメール', 'プロバイダのメール'],
    defaultWish: 'delete',
  },
  {
    id: 'bank', name: 'ネット銀行・証券',
    note: '通帳や郵便物がないため、家族が存在に気づきにくい財産です。',
    templates: ['楽天銀行', '住信SBIネット銀行', 'PayPay銀行', 'ソニー銀行', 'SBI証券', '楽天証券', 'マネックス証券', '松井証券'],
    defaultWish: 'handover',
  },
  {
    id: 'pay', name: 'QR・電子マネー',
    note: '残高がある場合は、相続の手続きで払い戻せることがあります。',
    templates: ['PayPay', '楽天ペイ', 'd払い', 'au PAY', 'メルペイ', 'Suica・PASMO', 'nanaco', 'WAON'],
    defaultWish: 'cancel',
  },
  {
    id: 'subs', name: 'サブスク',
    note: '解約しないと、毎月の支払いが続きます。',
    templates: ['Amazon プライム', 'Netflix', 'U-NEXT', 'YouTube Premium', 'Spotify', 'Apple Music', 'iCloud+', 'Google One', '新聞の電子版', '動画・音楽以外の会員サービス'],
    defaultWish: 'cancel',
  },
  {
    id: 'sns', name: 'SNS（LINE・Facebook など）',
    note: 'Facebook や Instagram は「追悼アカウント」にできます。',
    templates: ['LINE', 'Facebook', 'Instagram', 'X（旧Twitter）', 'YouTube', 'ブログ'],
    defaultWish: 'delete',
  },
  {
    id: 'photo', name: 'クラウド写真',
    note: '家族の写真が入っていることが多いので、引き継ぐかどうかを決めておきましょう。',
    templates: ['Google フォト', 'iCloud 写真', 'Amazon Photos', 'OneDrive'],
    defaultWish: 'handover',
  },
  {
    id: 'point', name: 'ポイント',
    note: 'ポイントは多くの場合、本人の死亡で失効します。マイルは相続できる場合があります。',
    templates: ['楽天ポイント', 'Vポイント', 'dポイント', 'Pontaポイント', 'JAL マイル', 'ANA マイル'],
    defaultWish: 'keep',
  },
  {
    id: 'other', name: 'その他',
    note: 'ネット通販、ふるさと納税サイト、オンラインゲームなど。',
    templates: ['Amazon（買い物）', '楽天市場', 'メルカリ', 'ふるさと納税サイト'],
    defaultWish: 'cancel',
  },
];

/** 死後の希望 */
export const DIGITAL_WISHES = [
  { value: 'cancel', label: '解約する' },
  { value: 'delete', label: 'データごと削除する' },
  { value: 'memorial', label: '追悼アカウントにする' },
  { value: 'handover', label: '家族に引き継ぐ' },
  { value: 'keep', label: 'そのままにする' },
];

/** 支払い方法 */
export const DIGITAL_PAYMENTS = [
  { value: '', label: '選んでください' },
  { value: 'free', label: '無料' },
  { value: 'card', label: 'クレジットカード' },
  { value: 'bank', label: '口座引き落とし' },
  { value: 'carrier', label: '携帯電話料金と一緒' },
  { value: 'prepaid', label: 'チャージ・前払い' },
  { value: 'unknown', label: 'わからない' },
];

/** 「残さないもの」の処分方法 */
export const NOKEEP_ACTIONS = [
  { value: 'deleteUnopened', label: '開かずに削除してほしい' },
  { value: 'wipeDevice', label: '端末ごと初期化・処分してほしい' },
  { value: 'trusted', label: '指定した人に処分を任せたい' },
];

export function wishLabel(value) {
  return DIGITAL_WISHES.find((w) => w.value === value)?.label || '未定';
}

export function paymentLabel(value) {
  return DIGITAL_PAYMENTS.find((p) => p.value === value && value)?.label || '';
}

export function nokeepLabel(value) {
  return NOKEEP_ACTIONS.find((a) => a.value === value)?.label || '';
}

export function groupById(id) {
  return DIGITAL_GROUPS.find((g) => g.id === id) || DIGITAL_GROUPS[DIGITAL_GROUPS.length - 1];
}
