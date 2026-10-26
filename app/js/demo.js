// 共有版（ステージング）で最初に入れておく記入例。架空の人物で、実在の人・団体とは関係ありません。

export function demoState() {
  return {
    version: 1,
    settings: { fontSize: 'standard', name: '山田 和子' },
    answers: {
      'me.profile': { name: '山田 和子', kana: 'やまだ かずこ', birth: '1951-04-12' },
      'me.honseki': '長野県松本市',
      'me.living': 'alone',
      'me.docs': [
        { id: 'doc1', doc: 'マイナンバーカード', place: '居間のたんす 右上の引き出し' },
        { id: 'doc2', doc: '年金証書・基礎年金番号通知書', place: '仏間の書類箱' },
        { id: 'doc3', doc: '通帳・キャッシュカード', place: '寝室の金庫' },
      ],
      'family.people': [
        { id: 'p1', name: '山田 美紀', relation: 'daughter1', phone: '090-1234-5678', memo: '入院したら最初に連絡' },
        { id: 'p2', name: '山田 健一', relation: 'son1', phone: '080-2345-6789' },
        { id: 'p3', name: '佐藤 文子', relation: 'friend', memo: '書道教室の友人' },
      ],
      'family.first': 'p1',
      'family.notify': 'close',
      'family.addressbook': ['nengajo', 'phone'],
      'money.banks': [
        { id: 'b1', bank: 'ひまわり銀行', branch: '駅前支店', kind: 'both', memo: '年金の振込先' },
        { id: 'b2', bank: 'ゆうちょ銀行', branch: '', kind: 'ordinary' },
      ],
      'money.debts': ['none'],
      'money.cards': [{ id: 'c1', company: 'さくらカード', account: 'ひまわり銀行', memo: '電気・ガスの支払い' }],
      'insurance.policies': [{ id: 'i1', company: 'あおぞら生命', kind: 'life', beneficiary: '山田 美紀', place: '仏壇の引き出し' }],
      'insurance.pension': ['kokumin', 'kosei'],
      'insurance.health': 'koki',
      'medical.clinic': { name: '松本みどりクリニック', phone: '0263-00-0000' },
      'medical.lifeSupport': 'comfort',
      'medical.proxy': 'p1',
      'medical.carePlace': 'home',
      'funeral.style': 'family',
      'funeral.religion': 'buddhism',
      'funeral.mutual': 'yes',
      'funeral.photo': '2019年 上高地の旅行の写真',
      'funeral.grave': 'family',
      'will.exists': 'planning',
      'words.thanks': '美紀、健一へ。いつも気にかけてくれてありがとう。二人がいてくれて、本当にしあわせでした。',
    },
    skipped: {},
    disclosure: {
      p1: { medical: 'incapacity', family: 'now' },
      p3: { funeral: 'after', words: 'after' },
    },
    digital: {
      items: [
        { id: 'd1', group: 'device', name: 'iPhone', device: '', wish: 'handover', payment: '', hint: 'ロック解除の番号は金庫の白い封筒', memo: '写真は美紀に残してほしい' },
        { id: 'd2', group: 'sns', name: 'LINE', device: 'iPhone', wish: 'delete', payment: 'free', hint: '', memo: '' },
        { id: 'd3', group: 'subs', name: 'Netflix', device: 'テレビ', wish: 'cancel', payment: 'card', hint: '青い手帳', memo: '' },
        { id: 'd4', group: 'bank', name: '楽天銀行', device: 'iPhone', wish: 'handover', payment: '', hint: '青い手帳', memo: '書道教室の月謝の引き落とし' },
      ],
      noKeep: [{ id: 'n1', target: 'パソコンの「日記」フォルダ', action: 'deleteUnopened', memo: '' }],
      spareKey: { device: 'iPhone（えんじ色のケース）', unlockHint: '寝室の金庫の白い封筒', contact: '長女 美紀' },
    },
    letters: [
      { id: 'l1', to: 'p1', timing: 'event', date: '', event: '結婚', title: '結婚するあなたへ', body: '美紀、結婚おめでとう。\nあなたが選んだ人なら大丈夫。ふたりで、ゆっくり歩いていってね。', createdAt: '' },
      { id: 'l2', to: 'p2', timing: 'after', date: '', event: '', title: '健一へ', body: '庭の梅の木の世話を、ときどきお願いします。', createdAt: '' },
    ],
    navi: { deathDate: '', checked: {} },
    updatedAt: '',
  };
}

/**
 * 保存されている手帖が、この記入例そのものか。
 * 以前のステージング版は本番と同じ場所に記入例を保存していたので、本番で見つけたら空にするか確かめる
 */
export function isDemoSample(state) {
  const people = Array.isArray(state.answers['family.people']) ? state.answers['family.people'] : [];
  const sample = demoState().answers['family.people'];
  return state.settings.name === demoState().settings.name
    && sample.every((p) => people.some((x) => x.id === p.id && x.name === p.name));
}
