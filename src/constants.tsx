
import { Question } from './types';

// 内耗维度定义
export const OVERTHINKING_DIMENSIONS = {
  '思维内耗': { maxScore: 28, questions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  '情绪内耗': { maxScore: 28, questions: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  '行动内耗': { maxScore: 24, questions: [21, 22, 23, 24, 25, 26, 27, 28] },
  '关系内耗': { maxScore: 20, questions: [29, 30, 31, 32, 33, 34, 35] }
};

// 结果分级
export const RESULT_LEVELS = [
  { min: 0, max: 25, level: '能量自由型', emoji: '🌟', percent: '12%', tags: ['#人间清醒', '#松弛感天花板', '#低内耗体质'] },
  { min: 26, max: 50, level: '轻度内耗型', emoji: '🌤️', percent: '38%', tags: ['#还算正常人', '#偶尔emo', '#可控范围内'] },
  { min: 51, max: 75, level: '中度内耗型', emoji: '⛅', percent: '35%', tags: ['#精神内耗重灾区', '#长期疲惫', '#该重视了'] },
  { min: 76, max: 100, level: '重度内耗型', emoji: '🌧️', percent: '15%', tags: ['#能量耗竭', '#需要帮助', '#抱抱你'] }
];

export const QUESTIONS: Question[] = [
  // ========== 模块1：思维内耗（10题，共28分）==========
  {
    id: 1,
    text: '今晚吃什么这个世纪难题，你一般纠结多久？',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '秒选！跟着感觉走' },
      { value: 1, label: '5-10分钟，问问室友意见' },
      { value: 2, label: '半小时起步，最后还是随便吃' },
      { value: 3, label: '能想一下午，纠结到错过饭点' }
    ]
  },
  {
    id: 2,
    text: '发消息对方半小时没回，你的脑内剧场：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '可能在忙，该干嘛干嘛' },
      { value: 1, label: '看一眼手机，继续做事' },
      { value: 2, label: '反复确认消息内容，是不是说错话了' },
      { value: 3, label: '已经脑补出一部8集连续剧' }
    ]
  },
  {
    id: 3,
    text: '睡前的你最常做什么？',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '倒头就睡/刷会儿视频就困了' },
      { value: 1, label: '想想明天的安排' },
      { value: 2, label: '复盘今天的社交细节，越想越清醒' },
      { value: 3, label: '从小学吵架开始反思人生' }
    ]
  },
  {
    id: 4,
    text: '做决定的时候，你的状态是：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '快准狠，错了再说' },
      { value: 1, label: '列个pros & cons，理性分析' },
      { value: 2, label: '反复横跳，问遍所有朋友' },
      { value: 3, label: '选择困难晚期，最后让别人帮我选' }
    ]
  },
  {
    id: 5,
    text: '看到朋友圈/小红书别人的精彩生活：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '点个赞，该干嘛干嘛' },
      { value: 1, label: '有点羡慕，但很快就忘了' },
      { value: 2, label: '开始焦虑自己是不是太废了' },
      { value: 3, label: '直接emo，陷入自我怀疑深渊' }
    ]
  },
  {
    id: 6,
    text: '工作/学习时，脑子突然冒出奇怪的想法：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '几乎不会，专注力还行' },
      { value: 1, label: '偶尔走神，能拉回来' },
      { value: 2, label: '经常走神，效率打折' },
      { value: 3, label: '人在自习室，心在环游世界' }
    ]
  },
  {
    id: 7,
    text: '别人的一句"你好像变了"：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '哦？怎么变了？正常交流' },
      { value: 1, label: '会想一下，但不会太在意' },
      { value: 2, label: '开始疯狂回忆自己做了什么' },
      { value: 3, label: '失眠级别的困扰，反复求证' }
    ]
  },
  {
    id: 8,
    text: '立了flag没完成：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '没事，明天继续' },
      { value: 1, label: '有点小愧疚，调整计划' },
      { value: 2, label: '狠狠自责，觉得自己很失败' },
      { value: 3, label: '破罐破摔，干脆躺平' }
    ]
  },
  {
    id: 9,
    text: '看到热搜"30岁前必须..."这类内容：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '笑笑划走，不care' },
      { value: 0.5, label: '看看就算，不会对号入座' },
      { value: 1, label: '有点慌，开始对比自己' },
      { value: 2, label: '直接破防，陷入年龄焦虑' }
    ]
  },
  {
    id: 10,
    text: '做一件事前，你的内心OS：',
    type: 'CHOICE',
    dimension: '思维内耗',
    options: [
      { value: 0, label: '冲就完了！' },
      { value: 0.5, label: '简单预想一下可能的情况' },
      { value: 1, label: '预演N种尴尬场景' },
      { value: 2, label: '光想象就已经社死100次' }
    ]
  },

  // ========== 模块2：情绪内耗（10题，共28分）==========
  {
    id: 11,
    text: '最近一周，你的情绪状态：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '整体稳定，该快乐快乐' },
      { value: 1, label: '小波动，但恢复得快' },
      { value: 2, label: '像坐过山车，忽上忽下' },
      { value: 3, label: '持续低气压/麻木' }
    ]
  },
  {
    id: 12,
    text: '突然想哭的频率：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '很少，除非真的很难过' },
      { value: 1, label: '偶尔，看个视频会泪目' },
      { value: 2, label: '经常，一点小事就绷不住' },
      { value: 3, label: '已经哭不出来了/每天都在哭' }
    ]
  },
  {
    id: 13,
    text: '你的"电量"一般能维持：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '一整天都很有活力' },
      { value: 1, label: '下午开始有点累' },
      { value: 2, label: '刚起床就想下班/放学' },
      { value: 3, label: '长期低电量，靠咖啡续命' }
    ]
  },
  {
    id: 14,
    text: '面对他人的情绪垃圾：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '能安慰但不会带入自己' },
      { value: 1, label: '短暂受影响，睡一觉就好' },
      { value: 2, label: '像海绵一样吸收，很难排解' },
      { value: 3, label: '已经被压垮，自己都自顾不暇' }
    ]
  },
  {
    id: 15,
    text: '社交后的状态：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '充电完成！好开心' },
      { value: 1, label: '看情况，有时累有时爽' },
      { value: 2, label: '需要独处三天恢复' },
      { value: 3, label: '每次社交都像渡劫' }
    ]
  },
  {
    id: 16,
    text: '对于"摆烂"这件事：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '偶尔放松，不觉得有问题' },
      { value: 1, label: '摆烂后会有点罪恶感' },
      { value: 2, label: '一边摆烂一边狠狠自责' },
      { value: 3, label: '已经摆麻了但依然焦虑' }
    ]
  },
  {
    id: 17,
    text: '你的快乐阈值：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '很容易快乐，小确幸就能开心' },
      { value: 1, label: '正常水平，该乐就乐' },
      { value: 2, label: '越来越难快乐起来' },
      { value: 3, label: '已经不记得快乐是什么感觉' }
    ]
  },
  {
    id: 18,
    text: '半夜刷手机的原因：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '单纯不想睡/在看有趣的内容' },
      { value: 1, label: '有点焦虑，需要分散注意力' },
      { value: 2, label: '越刷越空虚，但停不下来' },
      { value: 3, label: '不敢面对关机后的自己' }
    ]
  },
  {
    id: 19,
    text: '对于"还行""无所谓"这类词：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '偶尔使用，真的没啥感觉' },
      { value: 0.5, label: '有时候懒得解释就这么说' },
      { value: 1, label: '高频使用，不知道怎么表达了' },
      { value: 2, label: '口头禅，已经情绪钝化' }
    ]
  },
  {
    id: 20,
    text: '你的崩溃周期：',
    type: 'CHOICE',
    dimension: '情绪内耗',
    options: [
      { value: 0, label: '很少崩溃，心态稳' },
      { value: 0.5, label: '几个月一次，有明确原因' },
      { value: 1, label: '一个月好几次小崩溃' },
      { value: 2, label: '随时随地，一个眼神就能破防' }
    ]
  },

  // ========== 模块3：行动内耗（8题，共24分）==========
  {
    id: 21,
    text: '你的待办清单现状：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '基本都能完成，有条不紊' },
      { value: 1, label: '完成70-80%，可以接受' },
      { value: 2, label: '永远在拖延，永远在补救' },
      { value: 3, label: '已经不敢列清单了' }
    ]
  },
  {
    id: 22,
    text: '早上起床的状态：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '闹钟一响就起，开启新的一天' },
      { value: 1, label: '赖床10分钟，但不会迟到' },
      { value: 2, label: '需要定7-8个闹钟，起床困难户' },
      { value: 3, label: '每天都在生死边缘挣扎' }
    ]
  },
  {
    id: 23,
    text: '想学个新技能/开始健身：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '说干就干，行动力max' },
      { value: 1, label: '准备一下，很快能开始' },
      { value: 2, label: '收藏夹吃灰，攻略看了800遍没动手' },
      { value: 3, label: '光想想就累了，算了' }
    ]
  },
  {
    id: 24,
    text: '你的房间/工位状态：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '整洁有序，定期收拾' },
      { value: 1, label: '有点乱但能接受' },
      { value: 2, label: '乱到自己都看不下去但懒得收' },
      { value: 3, label: '灾难现场，已经放弃治疗' }
    ]
  },
  {
    id: 25,
    text: '约朋友见面：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '积极响应，准时赴约' },
      { value: 1, label: '看心情和对象' },
      { value: 2, label: '答应了但出门前各种纠结' },
      { value: 3, label: '能推就推，不想出门' }
    ]
  },
  {
    id: 26,
    text: '面对deadline：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '提前完成，留有余地' },
      { value: 1, label: '按时完成，不拖拉' },
      { value: 2, label: '压线冲刺型选手' },
      { value: 3, label: '不到最后一秒不动手' }
    ]
  },
  {
    id: 27,
    text: '买了网课/办了健身卡：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '物尽其用，好好学/练' },
      { value: 1, label: '至少用了一半' },
      { value: 2, label: '用了不到1/3，在吃灰' },
      { value: 3, label: '买了=学了，充值信仰' }
    ]
  },
  {
    id: 28,
    text: '想做的事情vs实际在做的事：',
    type: 'CHOICE',
    dimension: '行动内耗',
    options: [
      { value: 0, label: '基本一致，执行力不错' },
      { value: 1, label: '有些偏差但还好' },
      { value: 2, label: '完全相反，人在床上心在远方' },
      { value: 3, label: '已经不敢想了，想了更难受' }
    ]
  },

  // ========== 模块4：关系内耗（7题，共20分）==========
  {
    id: 29,
    text: '在群聊里：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '积极互动，该说就说' },
      { value: 1, label: '看到感兴趣的会聊几句' },
      { value: 2, label: '打字删除打字删除，最后不发了' },
      { value: 3, label: '潜水专业户，生怕说错话' }
    ]
  },
  {
    id: 30,
    text: '别人找你帮忙：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '能帮就帮，不能就拒绝' },
      { value: 1, label: '稍微考虑一下，给出答复' },
      { value: 2, label: '很难拒绝，硬着头皮答应' },
      { value: 3, label: '已经帮到自己很累还不敢说' }
    ]
  },
  {
    id: 31,
    text: '维持一段关系你觉得：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '自然而然，不费力' },
      { value: 1, label: '需要经营但还好' },
      { value: 2, label: '很累，总在察言观色' },
      { value: 3, label: '精疲力尽，想逃离社交' }
    ]
  },
  {
    id: 32,
    text: '发朋友圈/发微博：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '想发就发，不在意别人看法' },
      { value: 1, label: '稍微注意一下措辞' },
      { value: 2, label: '反复修改，精心设计可见范围' },
      { value: 3, label: '已经不敢发了/发完秒删' }
    ]
  },
  {
    id: 33,
    text: '在关系中的位置感：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '挺清晰的，知道谁是真朋友' },
      { value: 1, label: '大部分时候清楚' },
      { value: 2, label: '经常不确定，患得患失' },
      { value: 3, label: '完全迷失，觉得自己可有可无' }
    ]
  },
  {
    id: 34,
    text: '看到别人"在线"但不回你消息：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '没啥感觉，可能在忙别的' },
      { value: 0.5, label: '有点在意但能理解' },
      { value: 1, label: '开始脑补各种被忽视的原因' },
      { value: 2, label: '直接emo，觉得不被重视' }
    ]
  },
  {
    id: 35,
    text: '你对"讨好型人格"的共鸣度：',
    type: 'CHOICE',
    dimension: '关系内耗',
    options: [
      { value: 0, label: '完全不懂，我挺自我的' },
      { value: 0.5, label: '偶尔会，但不严重' },
      { value: 1, label: '中枪了，经常委屈自己' },
      { value: 2, label: '完全就是我，为别人活着' }
    ]
  },

  // ========== 开放题部分（3题）==========
  {
    id: 36,
    text: '最近一次"精神内耗"到崩溃是什么时候？当时在纠结/担心什么？',
    type: 'OPEN',
    placeholder: '比如"凌晨3点还在想白天开会时说的一句话是不是冒犯了同事"'
  },
  {
    id: 37,
    text: '如果能给此刻的自己放个假，你最想做什么？为什么？',
    type: 'OPEN',
    placeholder: '是想一个人发呆，还是和朋友疯玩，或是做点一直想做但没做的事？'
  },
  {
    id: 38,
    text: '用三个词形容现在的生活状态，然后说说你理想中的状态是什么样的？',
    type: 'OPEN',
    placeholder: '比如"焦虑、疲惫、麻木"vs"松弛、有趣、掌控感"'
  }
];

// 兼容旧代码的导出
export const BELIEF_DIMENSIONS = OVERTHINKING_DIMENSIONS;
export const BEHAVIOR_PATTERNS = {};

export const MOCK_VALID_CODE = "NEIHO2025";
