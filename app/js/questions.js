// のこす手帖：設問データ
// DOM に依存しない純粋なデータモジュール（Node のテストからも読み込む）。
//
// 設問の型（type）
//   radio    … ひとつ選ぶ
//   check    … いくつでも選ぶ
//   text     … 1行の自由記述
//   textarea … 複数行の自由記述（補助）
//   person   … 「家族・大切な人」に登録した人から選ぶ
//   fields   … 小さな入力欄のまとまり（1件だけ）
//   repeat   … 行を追加・削除できる繰り返し項目
//
// hint は「存在だけ記録すればよい」ことを伝える書き方のヒント。

/** 手帖のカテゴリ（表示順） */
export const CATEGORIES = [
  { id: 'me', name: 'わたしのこと', lead: '' },
  { id: 'family', name: '家族・大切な人', lead: '' },
  { id: 'money', name: 'お金と財産', lead: '' },
  { id: 'insurance', name: '保険・年金', lead: '' },
  { id: 'medical', name: '医療・介護', lead: '法的な拘束力はありません。' },
  { id: 'funeral', name: '葬儀・お墓', lead: '' },
  { id: 'will', name: '相続・遺言', lead: '遺言書の有無と場所だけ。分け方は遺言書に。' },
  { id: 'pet', name: 'ペット', lead: '' },
  { id: 'words', name: '家族へのことば', lead: '' },
];

/** 開示設定の対象（手帖のカテゴリ ＋ デジタル遺品） */
export const DISCLOSURE_CATEGORIES = [
  ...CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
  { id: 'digital', name: 'デジタル遺品' },
];

/** 続柄の選択肢。family: true は開示設定の初期値で「家族」として扱う */
export const RELATIONS = [
  { value: 'spouse', label: '配偶者', family: true },
  { value: 'son1', label: '長男', family: true },
  { value: 'daughter1', label: '長女', family: true },
  { value: 'son2', label: '次男', family: true },
  { value: 'daughter2', label: '次女', family: true },
  { value: 'child', label: '子', family: true },
  { value: 'childSpouse', label: '子の配偶者', family: true },
  { value: 'grandchild', label: '孫', family: true },
  { value: 'parent', label: '親', family: true },
  { value: 'sibling', label: '兄弟姉妹', family: true },
  { value: 'relative', label: 'その他の親族', family: true },
  { value: 'friend', label: '友人', family: false },
  { value: 'neighbor', label: '知人・近所の人', family: false },
  { value: 'professional', label: '専門家（弁護士・司法書士・税理士など）', family: false },
  { value: 'other', label: 'その他', family: false },
];

const opts = (...labels) => labels.map(([value, label]) => ({ value, label }));

export const QUESTIONS = [
  // ───────── 1. わたしのこと ─────────
  {
    id: 'me.profile', cat: 'me', type: 'fields',
    title: 'お名前と生年月日',
    hint: '戸籍に書かれている漢字で書いておくと、手続きのときに確かめやすくなります。',
    fields: [
      { key: 'name', label: '氏名', type: 'text', autocomplete: 'name' },
      { key: 'kana', label: 'ふりがな', type: 'text' },
      { key: 'birth', label: '生年月日', type: 'date', era: true },
    ],
  },
  {
    id: 'me.honseki', cat: 'me', type: 'text',
    title: '本籍地はどこですか',
    hint: '相続では、生まれてからの戸籍をすべて集めます。都道府県と市区町村だけでも助かります。',
    placeholder: '例：長野県松本市',
  },
  {
    id: 'me.living', cat: 'me', type: 'radio',
    title: 'いまの暮らし方',
    hint: '世帯主の変更届が必要かどうかの目安になります。',
    options: opts(['alone', 'ひとりで暮らしている'], ['spouse', '配偶者と暮らしている'], ['children', '子どもの家族と暮らしている'], ['facility', '施設で暮らしている'], ['other', 'その他']),
  },
  {
    id: 'me.docs', cat: 'me', type: 'repeat',
    title: '大切な書類の保管場所',
    hint: '「どの引き出しか」だけで十分です。番号は書かなくてかまいません。',
    itemLabel: '書類',
    fields: [
      {
        key: 'doc', label: '書類', type: 'select',
        options: ['マイナンバーカード', '健康保険証・資格確認書', '年金証書・基礎年金番号通知書', '通帳・キャッシュカード', '実印・印鑑登録証', '不動産の権利証（登記識別情報）', 'パスポート', '運転免許証', 'その他'].map((l) => ({ value: l, label: l })),
      },
      { key: 'place', label: '保管場所', type: 'text', placeholder: '例：居間のたんす 右上の引き出し' },
    ],
  },
  {
    id: 'me.history', cat: 'me', type: 'textarea',
    title: '自分史のメモ（好きなもの・大事にしてきたこと）',
    hint: '書きたいときに、少しずつ。ひとことでもかまいません。',
  },

  // ───────── 2. 家族・大切な人 ─────────
  {
    id: 'family.people', cat: 'family', type: 'repeat', role: 'people',
    title: '連絡してほしい家族・大切な人',
    hint: '名前と続柄だけでも登録できます。',
    itemLabel: '人',
    fields: [
      { key: 'name', label: 'お名前', type: 'text' },
      { key: 'relation', label: '続柄', type: 'select', options: RELATIONS.map(({ value, label }) => ({ value, label })) },
      { key: 'relationNote', label: '続柄（自由に書く）', type: 'text', placeholder: '例：三女、甥、いとこ' },
      { key: 'phone', label: '電話番号', type: 'tel', autocomplete: 'off' },
      { key: 'email', label: 'メールアドレス', type: 'email', autocomplete: 'off' },
      { key: 'address', label: '住所', type: 'text' },
      { key: 'memo', label: 'メモ', type: 'text', placeholder: '例：入院したら最初に連絡' },
    ],
  },
  {
    id: 'family.first', cat: 'family', type: 'person',
    title: '入院や急なときに、まず連絡してほしい人',
    hint: '上で登録した人から選びます。まだいなければ、先に上の欄に登録してください。',
  },
  {
    id: 'family.notify', cat: 'family', type: 'radio',
    title: '亡くなったことを知らせてほしい範囲',
    hint: '家族葬にしたい場合も、知らせる範囲を決めておくと家族が迷いません。',
    options: opts(['family', '家族・親族だけ'], ['close', '親しい友人まで'], ['nengajo', '年賀状をやりとりしている人まで'], ['leave', '家族に任せる']),
  },
  {
    id: 'family.addressbook', cat: 'family', type: 'check',
    title: '知らせてほしい人の連絡先がわかるもの',
    hint: '置き場所がわかれば、家族が連絡先を探せます。',
    options: opts(['nengajo', '年賀状・はがきの束'], ['phone', 'スマホの連絡先'], ['notebook', '住所録・手帳'], ['pc', 'パソコンの住所録'], ['none', '特にない']),
  },

  // ───────── 3. お金と財産 ─────────
  {
    id: 'money.banks', cat: 'money', type: 'repeat', naviKind: 'bank',
    title: '預貯金の口座',
    hint: '「〇〇銀行に口座がある」だけで十分です。口座番号・暗証番号は書かないでください。',
    itemLabel: '預金口座',
    fields: [
      { key: 'bank', label: '金融機関名', type: 'text', placeholder: '例：〇〇銀行、ゆうちょ銀行' },
      { key: 'branch', label: '支店名', type: 'text' },
      { key: 'kind', label: '種類', type: 'select', options: opts(['ordinary', '普通預金'], ['time', '定期預金'], ['both', '普通と定期'], ['other', 'その他・わからない']) },
      { key: 'memo', label: 'メモ', type: 'text', placeholder: '例：年金の振込先' },
    ],
  },
  {
    id: 'money.securities', cat: 'money', type: 'repeat', naviKind: 'securities',
    title: '株式・投資信託などの口座',
    hint: '証券会社の名前だけでもかまいません。ネット証券は郵便物が届かないことがあるので特に大切です。',
    itemLabel: '証券口座',
    fields: [
      { key: 'company', label: '証券会社・金融機関', type: 'text' },
      { key: 'kind', label: '内容', type: 'select', options: opts(['stock', '株式'], ['fund', '投資信託'], ['bond', '国債・債券'], ['nisa', 'NISA'], ['ideco', 'iDeCo'], ['other', 'その他・わからない']) },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
  },
  {
    id: 'money.realestate', cat: 'money', type: 'check',
    title: '持っている不動産',
    hint: '固定資産税の通知書の保管場所を書いておくと、家族が調べやすくなります。',
    options: opts(['home', '自宅（土地・建物）'], ['mansion', '自宅（マンション）'], ['land', '自宅以外の土地'], ['rental', '貸している建物'], ['none', '持っていない']),
  },
  {
    id: 'money.debts', cat: 'money', type: 'check',
    title: '借入れ・保証人',
    hint: '借入れや保証人は、家族が「相続放棄」をするかの判断（3か月以内）に関わります。ない場合も「ない」と残しておきましょう。',
    options: opts(['none', 'ない'], ['housing', '住宅ローン'], ['car', '自動車ローン'], ['card', 'カードローン・キャッシング'], ['guarantor', '誰かの保証人になっている'], ['other', 'その他']),
  },
  {
    id: 'money.cards', cat: 'money', type: 'repeat', naviKind: 'card',
    title: 'クレジットカード',
    hint: 'カード会社の名前だけで大丈夫です。カード番号は書かないでください。',
    itemLabel: 'カード',
    fields: [
      { key: 'company', label: 'カード会社・カード名', type: 'text' },
      { key: 'account', label: '引き落とし口座', type: 'text', placeholder: '例：〇〇銀行' },
      { key: 'memo', label: 'メモ', type: 'text', placeholder: '例：公共料金の支払いに使用' },
    ],
  },
  {
    id: 'money.valuables', cat: 'money', type: 'textarea',
    title: '貴金属・美術品・貸金庫など',
    hint: 'あるかどうかと、置いてある場所だけで十分です。',
  },

  // ───────── 4. 保険・年金 ─────────
  {
    id: 'insurance.policies', cat: 'insurance', type: 'repeat', naviKind: 'insurance',
    title: '入っている保険・共済',
    hint: '保険会社の名前と、保険証券の場所がわかれば請求できます。生命保険の請求は3年以内が目安です。',
    itemLabel: '保険',
    fields: [
      { key: 'company', label: '保険会社・共済', type: 'text' },
      { key: 'kind', label: '種類', type: 'select', options: opts(['life', '生命保険'], ['medical', '医療保険'], ['cancer', 'がん保険'], ['fire', '火災保険'], ['car', '自動車保険'], ['kyosai', '共済'], ['other', 'その他']) },
      { key: 'beneficiary', label: '受取人', type: 'text' },
      { key: 'place', label: '保険証券の保管場所', type: 'text' },
    ],
  },
  {
    id: 'insurance.pension', cat: 'insurance', type: 'check',
    title: '受け取っている年金',
    hint: '亡くなったあとは年金の受給を止める届けが必要です（厚生年金は10日以内、国民年金は14日以内）。',
    options: opts(['kokumin', '国民年金（老齢基礎年金）'], ['kosei', '厚生年金'], ['kyosai', '共済年金'], ['private', '企業年金・個人年金'], ['notyet', 'まだ受け取っていない']),
  },
  {
    id: 'insurance.pensionDoc', cat: 'insurance', type: 'text',
    title: '年金証書・基礎年金番号がわかる書類の保管場所',
    hint: '番号そのものは書かず、置き場所だけを書きます。',
    placeholder: '例：仏間の書類箱',
  },
  {
    id: 'insurance.health', cat: 'insurance', type: 'radio',
    title: '加入している健康保険',
    hint: '亡くなったあと、資格喪失の届けを出す先がわかります（国民健康保険・後期高齢者医療は14日以内、会社の健康保険や扶養の場合は勤め先が手続きします）。',
    options: opts(['kokuho', '国民健康保険'], ['koki', '後期高齢者医療制度'], ['shaho', '勤め先の健康保険'], ['fuyo', '家族の扶養に入っている'], ['unknown', 'わからない']),
  },
  {
    id: 'insurance.care', cat: 'insurance', type: 'radio',
    title: '介護保険の認定',
    hint: '認定を受けていなくても、65歳以上なら介護保険証が届いています。',
    options: opts(['none', '受けていない'], ['support', '要支援'], ['care', '要介護'], ['unknown', 'わからない']),
  },

  // ───────── 5. 医療・介護 ─────────
  {
    id: 'medical.clinic', cat: 'medical', type: 'fields',
    title: 'かかりつけの医療機関',
    hint: '病院の名前だけでも大丈夫です。',
    fields: [
      { key: 'name', label: '病院・診療所の名前', type: 'text' },
      { key: 'phone', label: '電話番号', type: 'tel', autocomplete: 'off' },
    ],
  },
  {
    id: 'medical.conditions', cat: 'medical', type: 'textarea',
    title: '持病・飲んでいる薬',
    hint: '「お薬手帳は台所の棚」のように、置き場所だけでも役に立ちます。',
  },
  {
    id: 'medical.allergy', cat: 'medical', type: 'text',
    title: 'アレルギー',
    hint: '薬や食べ物のアレルギーがあれば。ない場合は「なし」と書いておきます。',
  },
  {
    id: 'medical.notice', cat: 'medical', type: 'radio',
    title: '病名や余命を知らせてほしいか',
    hint: '気持ちが変わったら、いつでも書き直せます。',
    options: opts(['all', '病名も余命も知りたい'], ['name', '病名だけ知りたい'], ['family', '家族に任せる'], ['no', '知りたくない'], ['undecided', 'まだ決められない']),
  },
  {
    id: 'medical.lifeSupport', cat: 'medical', type: 'radio',
    title: '回復の見込みがないときの延命治療',
    hint: '家族や医療者と話し合う「人生会議（ACP）」のきっかけにしてください。',
    options: opts(['want', 'できるかぎり続けてほしい'], ['comfort', '苦痛をやわらげる治療だけにしてほしい'], ['entrust', '家族と医師に任せる'], ['undecided', 'まだ決められない']),
  },
  {
    id: 'medical.organ', cat: 'medical', type: 'radio',
    title: '臓器提供の意思',
    hint: '正式な意思表示は、マイナンバーカード・運転免許証・資格確認書の意思表示欄、意思表示カード、インターネットでの登録でできます。',
    options: opts(['yes', '提供したい'], ['no', '提供しない'], ['card', 'カード・免許証などに記入済み'], ['undecided', '決めていない']),
  },
  {
    id: 'medical.carePlace', cat: 'medical', type: 'radio',
    title: '介護が必要になったら、どこで過ごしたいか',
    hint: '理想を書いておくだけで大丈夫です。',
    options: opts(['home', 'できるだけ自宅で'], ['facility', '施設で'], ['discuss', '家族と相談して決めたい'], ['undecided', '決めていない']),
  },
  {
    id: 'medical.proxy', cat: 'medical', type: 'person',
    title: '判断がむずかしくなったとき、医療の相談をしてほしい人',
    hint: '病院から意思を聞かれたときに、代わりに話してほしい人です。',
  },

  // ───────── 6. 葬儀・お墓 ─────────
  {
    id: 'funeral.style', cat: 'funeral', type: 'radio',
    title: '希望する葬儀のかたち',
    hint: '迷っていれば「家族に任せる」でかまいません。',
    options: opts(['general', '一般葬（広く知らせる）'], ['family', '家族葬（身内と親しい人だけ）'], ['oneday', '一日葬（通夜をしない）'], ['direct', '火葬式・直葬（式をしない）'], ['leave', '家族に任せる']),
  },
  {
    id: 'funeral.religion', cat: 'funeral', type: 'radio',
    title: '宗教・宗派',
    hint: '仏教なら宗派も書いておくと、お寺との相談がスムーズです。',
    options: opts(['buddhism', '仏教'], ['shinto', '神道'], ['christian', 'キリスト教'], ['none', '無宗教'], ['unknown', 'わからない']),
  },
  {
    id: 'funeral.temple', cat: 'funeral', type: 'fields',
    title: '菩提寺・教会などの連絡先',
    hint: '付き合いのあるお寺や教会があれば。名前だけでも大丈夫です。',
    fields: [
      { key: 'sect', label: '宗派', type: 'text' },
      { key: 'name', label: 'お寺・教会などの名前', type: 'text' },
      { key: 'phone', label: '電話番号', type: 'tel', autocomplete: 'off' },
    ],
  },
  {
    id: 'funeral.mutual', cat: 'funeral', type: 'radio',
    title: '葬儀社の会員・互助会への加入',
    hint: '会員証の場所も書いておくと、積立金を使い忘れずにすみます。',
    options: opts(['yes', '入っている'], ['no', '入っていない'], ['unknown', 'わからない']),
  },
  {
    id: 'funeral.photo', cat: 'funeral', type: 'text',
    title: '遺影に使ってほしい写真',
    hint: '「〇年の旅行の写真」「アルバムの最初のページ」のように書きます。',
  },
  {
    id: 'funeral.grave', cat: 'funeral', type: 'radio',
    title: 'お墓・納骨の希望',
    hint: '墓じまいを考えている場合は「決めていない」にしてメモを残しても大丈夫です。',
    options: opts(['family', '先祖代々のお墓に入る'], ['bought', '購入済みのお墓がある'], ['tree', '樹木葬・納骨堂'], ['sea', '散骨'], ['undecided', '決めていない']),
  },

  // ───────── 7. 相続・遺言 ─────────
  {
    id: 'will.exists', cat: 'will', type: 'radio',
    title: '遺言書はありますか',
    hint: 'この手帖には法的効力がありません。財産の分け方は遺言書で決めます。',
    options: opts(['holograph', '自筆で書いた遺言書がある'], ['notarial', '公正証書遺言がある'], ['planning', 'これから書く予定'], ['none', '書いていない']),
  },
  {
    id: 'will.storage', cat: 'will', type: 'radio',
    title: '遺言書の保管方法',
    hint: '法務局の「自筆証書遺言書保管制度」を使うと、家庭裁判所の検認が不要になります。保管の申請のときに希望すれば、亡くなったあと指定した人（3名まで）に通知も届きます。',
    options: opts(['houmukyoku', '法務局の保管制度を利用している'], ['koshonin', '公証役場に原本がある（公正証書遺言）'], ['home', '自宅に保管している'], ['expert', '専門家に預けている'], ['na', '遺言書はない']),
  },
  {
    id: 'will.place', cat: 'will', type: 'text',
    title: '遺言書（または保管証・正本）の置き場所',
    hint: '自宅で見つかった自筆の遺言書は、開封せずに家庭裁判所で検認を受けます。家族にそのことも伝わるようにしておきましょう。',
  },
  {
    id: 'will.expert', cat: 'will', type: 'text',
    title: '相談している専門家・遺言執行者',
    hint: '事務所名だけでも大丈夫です。',
    placeholder: '例：〇〇司法書士事務所',
  },
  {
    id: 'will.wish', cat: 'will', type: 'textarea',
    title: '財産について家族に伝えておきたい気持ち',
    hint: 'ここに書いた内容に法的効力はありません。分け方を決めたい場合は遺言書を作ってください。',
  },

  // ───────── 8. ペット ─────────
  {
    id: 'pet.list', cat: 'pet', type: 'repeat',
    title: '一緒に暮らしている動物',
    hint: '名前と種類だけでも登録できます。',
    itemLabel: 'ペット',
    fields: [
      { key: 'name', label: '名前', type: 'text' },
      { key: 'kind', label: '種類', type: 'text', placeholder: '例：柴犬、三毛猫' },
      { key: 'age', label: '年齢・生まれた年', type: 'text' },
      { key: 'vet', label: 'かかりつけ動物病院', type: 'text' },
    ],
  },
  {
    id: 'pet.caretaker', cat: 'pet', type: 'person',
    title: '世話をお願いしたい人',
    hint: '引き受けてもらえるか、事前に話しておけると安心です。',
  },
  {
    id: 'pet.care', cat: 'pet', type: 'textarea',
    title: 'ごはん・薬・くせなど',
    hint: 'いつものごはんの銘柄や、苦手なことなど。',
  },
  {
    id: 'pet.insurance', cat: 'pet', type: 'radio',
    title: 'ペット保険',
    hint: '',
    options: opts(['yes', '入っている'], ['no', '入っていない'], ['none', 'ペットはいない']),
  },

  // ───────── 9. 家族へのことば ─────────
  {
    id: 'words.thanks', cat: 'words', type: 'textarea',
    title: '家族に伝えたい感謝',
    hint: '特定の人に宛てた手紙は「手紙」の画面で書けます。',
  },
  {
    id: 'words.remember', cat: 'words', type: 'textarea',
    title: '覚えていてほしいこと',
    hint: '家の言い伝え、得意料理の作り方、なんでも。',
  },
  {
    id: 'words.keepsakes', cat: 'words', type: 'textarea',
    title: '形見分けの希望',
    hint: '「時計は長男に」など。法的効力はないので、高価なものは遺言書に書いてください。',
  },
];

export function questionsOf(catId) {
  return QUESTIONS.filter((q) => q.cat === catId);
}

export function categoryById(catId) {
  return DISCLOSURE_CATEGORIES.find((c) => c.id === catId) || null;
}

export function questionById(id) {
  return QUESTIONS.find((q) => q.id === id) || null;
}

/** 「家族・大切な人」の設問ID（開示設定の対象者リスト） */
export const PEOPLE_QUESTION_ID = 'family.people';
