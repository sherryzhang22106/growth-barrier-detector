
import { Question } from './types';

export const BELIEF_DIMENSIONS = {
  '金钱与价值': { weight: 0.12, questions: [6, 7, 8] },
  '自我价值': { weight: 0.20, questions: [9, 10, 11] },
  '能力信念': { weight: 0.15, questions: [12, 13, 14] },
  '关系模式': { weight: 0.13, questions: [15, 16, 17] },
  '时间与年龄': { weight: 0.08, questions: [18, 19, 20] },
  '风险与失败': { weight: 0.12, questions: [21, 22, 23] },
  '世界观': { weight: 0.08, questions: [24, 25, 26] },
  '完美主义': { weight: 0.12, questions: [27, 28, 29] }
};

export const BEHAVIOR_PATTERNS = {
  '拖延与逃避': [30, 31, 32],
  '自我破坏': [33, 34, 35],
  '过度补偿': [36, 37, 38],
  '过度防御': [39, 40, 41],
  '能量内耗': [42, 43, 44],
  '完美主义行为': [45, 46, 47]
};

export const QUESTIONS: Question[] = [
  // Page 1: Basic (1-5)
  { id: 1, text: '您的年龄段？', type: 'CHOICE', options: [{ value: 0, label: '18-25岁' }, { value: 1, label: '26-35岁' }, { value: 2, label: '36-45岁' }, { value: 3, label: '46岁以上' }] },
  { id: 2, text: '当前最想突破的领域？', type: 'CHOICE', options: [{ value: 0, label: '职业发展' }, { value: 1, label: '财富增长' }, { value: 2, label: '亲密关系' }, { value: 3, label: '健康管理' }, { value: 4, label: '学习成长' }, { value: 5, label: '创业/副业' }] },
  { id: 3, text: '您感觉被"卡住"多久了？', type: 'CHOICE', options: [{ value: 1.0, label: '最近3个月内' }, { value: 1.1, label: '半年到1年' }, { value: 1.2, label: '1-3年' }, { value: 1.3, label: '3年以上' }] },
  { id: 4, text: '您对改变的期待是？', type: 'CHOICE', options: [{ value: 0, label: '只是好奇了解自己' }, { value: 1, label: '希望有具体改变方法' }, { value: 2, label: '准备认真执行突破计划' }, { value: 3, label: '已经尝试过很多方法但没用' }] },
  { id: 5, text: '目前生活满意度？(1-10)', type: 'SCALE', options: Array.from({ length: 10 }).map((_, i) => ({ value: i + 1, label: (i + 1).toString() })) },

  // Page 2-3: Core Beliefs (6-29)
  // 金钱与价值
  { id: 6, text: '看到别人赚钱，我的第一反应是：', type: 'CHOICE', dimension: '金钱与价值', options: [{ value: 3, label: '他们肯定有特殊资源/背景/运气' }, { value: 0, label: '我也可以研究方法去做' }, { value: 2, label: '羡慕但觉得自己做不到' }, { value: 4, label: '赚大钱的人道德上有问题' }] },
  { id: 7, text: '关于"提高收费/要求加薪"，我会：', type: 'CHOICE', dimension: '金钱与价值', options: [{ value: 4, label: '觉得自己不值那个价' }, { value: 3, label: '担心别人觉得我贪心' }, { value: 0, label: '评估价值后合理争取' }, { value: 3, label: '不敢提，怕失去机会' }] },
  { id: 8, text: '我内心深处相信：', type: 'CHOICE', dimension: '金钱与价值', options: [{ value: 3, label: '钱很难赚，要付出巨大代价' }, { value: 4, label: '我不配拥有很多钱' }, { value: 0, label: '钱是流动的，有付出就有回报' }, { value: 2, label: '谈钱很俗，我更在乎精神追求' }] },
  // 自我价值
  { id: 9, text: '当获得赞美时，我通常：', type: 'CHOICE', dimension: '自我价值', options: [{ value: 3, label: '觉得对方只是客气' }, { value: 4, label: '立刻说"没有没有，我做得不好"' }, { value: 0, label: '感谢并内心认可' }, { value: 2, label: '怀疑对方有别的目的' }] },
  { id: 10, text: '面对新机会/挑战时，我脑海中第一句话：', type: 'CHOICE', dimension: '自我价值', options: [{ value: 4, label: '"我可能做不好"' }, { value: 0, label: '"让我试试看"' }, { value: 3, label: '"这太难了，不适合我"' }, { value: 2, label: '"万一失败了怎么办"' }] },
  { id: 11, text: '当别人成功时，我会：', type: 'CHOICE', dimension: '自我价值', options: [{ value: 4, label: '感觉自己更失败了' }, { value: 0, label: '真诚为他们高兴并学习' }, { value: 3, label: '表面祝贺但内心不舒服' }, { value: 3, label: '觉得"他们行我也应该行"然后自责' }] },
  // 能力信念
  { id: 12, text: '面对不熟悉的领域，我认为：', type: 'CHOICE', dimension: '能力信念', options: [{ value: 4, label: '我学不会这么复杂的东西' }, { value: 0, label: '给我时间我可以掌握' }, { value: 4, label: '这需要天赋，我没有' }, { value: 3, label: '学习新东西对我来说太难' }] },
  { id: 13, text: '过去尝试新技能时，我通常：', type: 'CHOICE', dimension: '能力信念', options: [{ value: 4, label: '遇到困难就觉得"我不是这块料"' }, { value: 0, label: '持续练习直到掌握' }, { value: 2, label: '跟别人比较后觉得自己太慢' }, { value: 3, label: '开始就觉得困难，很快放弃' }] },
  { id: 14, text: '关于"10000小时定律"，我相信：', type: 'CHOICE', dimension: '能力信念', options: [{ value: 3, label: '对别人有用，对我没用' }, { value: 4, label: '练习了也没用，还是要靠天赋' }, { value: 0, label: '刻意练习确实能带来改变' }, { value: 2, label: '我坚持不了那么久' }] },
  // 关系模式
  { id: 15, text: '在亲密关系中，我经常：', type: 'CHOICE', dimension: '关系模式', options: [{ value: 3, label: '担心被抛弃，过度付出' }, { value: 3, label: '保持距离，不敢完全信任' }, { value: 0, label: '自然表达需求和界限' }, { value: 4, label: '觉得"我爱的人总会离开"' }] },
  { id: 16, text: '对"求助他人"的态度：', type: 'CHOICE', dimension: '关系模式', options: [{ value: 4, label: '求助=承认自己无能' }, { value: 3, label: '很难开口，怕麻烦别人' }, { value: 0, label: '必要时会主动寻求帮助' }, { value: 3, label: '我不能依赖任何人' }] },
  { id: 17, text: '在冲突中，我倾向于：', type: 'CHOICE', dimension: '关系模式', options: [{ value: 3, label: '立即道歉，即使不是我的错' }, { value: 2, label: '冷战，等对方先来和解' }, { value: 0, label: '平静沟通，寻找解决方案' }, { value: 4, label: '觉得"又证明了我不值得被爱"' }] },
  // 时间与年龄
  { id: 18, text: '关于年龄，我常想：', type: 'CHOICE', dimension: '时间与年龄', options: [{ value: 4, label: '已经XX岁了，太晚了' }, { value: 2, label: '还年轻，以后再说' }, { value: 0, label: '每个阶段都有独特机会' }, { value: 3, label: '同龄人都XXX了，我还在原地' }] },
  { id: 19, text: '制定计划时，我通常：', type: 'CHOICE', dimension: '时间与年龄', options: [{ value: 3, label: '做超详细的计划但从不开始' }, { value: 0, label: '快速规划然后边做边调整' }, { value: 2, label: '害怕计划赶不上变化所以不做' }, { value: 1, label: '想到就做，不做计划' }] },
  { id: 20, text: '当错过一个机会时：', type: 'CHOICE', dimension: '时间与年龄', options: [{ value: 4, label: '"我的人生完了"' }, { value: 3, label: '反复懊悔很长时间' }, { value: 0, label: '总结教训，关注下一个' }, { value: 3, label: '又一个证明"我就是倒霉"' }] },
  // 风险与失败
  { id: 21, text: '面对"失败"，我认为：', type: 'CHOICE', dimension: '风险与失败', options: [{ value: 4, label: '失败=我这个人是失败者' }, { value: 3, label: '失败会被所有人看不起' }, { value: 0, label: '失败是学习的一部分' }, { value: 3, label: '我承受不了失败的后果' }] },
  { id: 22, text: '当需要走出舒适区时：', type: 'CHOICE', dimension: '风险与失败', options: [{ value: 4, label: '身体会出现不适（心慌、胃痛）' }, { value: 3, label: '找各种理由延迟' }, { value: 0, label: '有紧张但能调节' }, { value: 3, label: '直接说服自己"不适合我"' }] },
  { id: 23, text: '做决策时，我更关注：', type: 'CHOICE', dimension: '风险与失败', options: [{ value: 4, label: '最坏情况，并因此放弃' }, { value: 3, label: '可能失去什么' }, { value: 0, label: '可能得到什么' }, { value: 2, label: '别人会怎么看我的选择' }] },
  // 世界观
  { id: 24, text: '我相信这个世界：', type: 'CHOICE', dimension: '世界观', options: [{ value: 4, label: '大部分是危险和恶意的' }, { value: 3, label: '机会只属于少数幸运儿' }, { value: 0, label: '充满可能性，取决于自己' }, { value: 3, label: '已经固化，普通人很难翻身' }] },
  { id: 25, text: '关于"公平"：', type: 'CHOICE', dimension: '世界观', options: [{ value: 4, label: '世界根本不公平，努力没用' }, { value: 3, label: '有人天生就在终点线' }, { value: 0, label: '公平是相对的，专注自己能控制的' }, { value: 4, label: '我总是不公平的受害者' }] },
  { id: 26, text: '我相信改变：', type: 'CHOICE', dimension: '世界观', options: [{ value: 4, label: '基因/原生家庭决定一切' }, { value: 3, label: '某个年龄后就定型了' }, { value: 0, label: '任何时候都可以成长' }, { value: 3, label: '对别人有用，对我没用' }] },
  // 完美主义
  { id: 27, text: '开始一件事前，我必须：', type: 'CHOICE', dimension: '完美主义', options: [{ value: 4, label: '等到条件完美' }, { value: 3, label: '学完所有知识再开始' }, { value: 0, label: '了解基础后就动手' }, { value: 3, label: '确保不会出错' }] },
  { id: 28, text: '当工作完成80%时：', type: 'CHOICE', dimension: '完美主义', options: [{ value: 4, label: '花80%时间纠结最后20%' }, { value: 3, label: '反复修改，迟迟不交付' }, { value: 0, label: '评估性价比，该止损时止损' }, { value: 4, label: '觉得"还不够好"然后推倒重来' }] },
  { id: 29, text: '我对"犯错"的恐惧：', type: 'CHOICE', dimension: '完美主义', options: [{ value: 5, label: '极度恐惧，宁愿不做' }, { value: 1, label: '担心但能接受' }, { value: 0, label: '视为学习机会' }, { value: 4, label: '一个错误就否定全部努力' }] },

  // Page 4-5: Behavioral Patterns (30-47)
  // 拖延与逃避
  { id: 30, text: '面对重要任务，我会：', type: 'CHOICE', dimension: '拖延与逃避', options: [{ value: 3, label: '先刷手机/做不重要的事' }, { value: 0, label: '立即开始执行' }, { value: 2, label: '想太多导致迟迟不开始' }, { value: 4, label: '等到deadline前才匆忙完成' }] },
  { id: 31, text: '过去一个月，我因拖延错过的事情有：', type: 'CHOICE', dimension: '拖延与逃避', options: [{ value: 0, label: '0-1件' }, { value: 2, label: '2-3件' }, { value: 3, label: '4-5件' }, { value: 5, label: '6件以上' }] },
  { id: 32, text: '压力大时，我会：', type: 'CHOICE', dimension: '拖延与逃避', options: [{ value: 4, label: '刷短视频/打游戏逃避' }, { value: 0, label: '运动或找人倾诉' }, { value: 3, label: '暴饮暴食或疯狂购物' }, { value: 3, label: '睡觉或假装问题不存在' }] },
  // 自我破坏
  { id: 33, text: '当机会来临时，我会：', type: 'CHOICE', dimension: '自我破坏', options: [{ value: 4, label: '找证据证明"我不行"然后放弃' }, { value: 0, label: '全力以赴争取' }, { value: 4, label: '表现得不够好，印证担心' }, { value: 5, label: '自我设障（突然生病/拖延）' }] },
  { id: 34, text: '遇到贵人/好运时：', type: 'CHOICE', dimension: '自我破坏', options: [{ value: 3, label: '怀疑，觉得"我不配"' }, { value: 4, label: '下意识破坏这个机会' }, { value: 0, label: '感恩并珍惜' }, { value: 3, label: '等着"好事之后必有坏事"' }] },
  { id: 35, text: '我发现自己：', type: 'CHOICE', dimension: '自我破坏', options: [{ value: 5, label: '总在证明"我就是不行"' }, { value: 4, label: '总在重复相同的失败模式' }, { value: 0, label: '每次都有新收获' }, { value: 4, label: '成功后会搞砸后续' }] },
  // 过度补偿
  { id: 36, text: '在团队/家庭中，我经常：', type: 'CHOICE', dimension: '过度补偿', options: [{ value: 4, label: '过度照顾他人，忽略自己' }, { value: 0, label: '角色灵活，边界清晰' }, { value: 4, label: '觉得"我必须拯救所有人"' }, { value: 3, label: '总是那个被误解/被欺负的' }] },
  { id: 37, text: '当别人拒绝我的帮助时：', type: 'CHOICE', dimension: '过度补偿', options: [{ value: 3, label: '觉得自己不被需要，很受伤' }, { value: 0, label: '尊重对方的选择' }, { value: 3, label: '生气，觉得"好心当驴肝肺"' }, { value: 4, label: '继续坚持，直到对方接受' }] },
  { id: 38, text: '我的人际模式：', type: 'CHOICE', dimension: '过度补偿', options: [{ value: 4, label: '总是我在付出，别人不感恩' }, { value: 0, label: '互惠互利，边界清晰' }, { value: 3, label: '总有人让我失望' }, { value: 3, label: '我不得不照顾所有人' }] },
  // 过度防御
  { id: 39, text: '当收到批评/建议时：', type: 'CHOICE', dimension: '过度防御', options: [{ value: 3, label: '立即找理由反驳' }, { value: 4, label: '觉得对方在攻击我' }, { value: 0, label: '评估是否有道理' }, { value: 3, label: '表面接受，内心否认' }] },
  { id: 40, text: '遇到挫折后：', type: 'CHOICE', dimension: '过度防御', options: [{ value: 4, label: '都是环境/别人的错' }, { value: 3, label: '合理化：其实我不想要' }, { value: 0, label: '反思自己的部分' }, { value: 2, label: '这说明我运气就是差' }] },
  { id: 41, text: '对待自己的失误：', type: 'CHOICE', dimension: '过度防御', options: [{ value: 4, label: '编故事自我欺骗' }, { value: 4, label: '甩锅给运气/他人' }, { value: 0, label: '承认并寻求改进' }, { value: 3, label: '完全压抑，假装没发生' }] },
  // 能量内耗
  { id: 42, text: '做决定时，我会：', type: 'CHOICE', dimension: '能量内耗', options: [{ value: 4, label: '反复纠结，耗时极长' }, { value: 0, label: '快速决策，错了就调整' }, { value: 3, label: '做了决定还在后悔' }, { value: 4, label: '分析瘫痪，最后不了了之' }] },
  { id: 43, text: '我的大脑：', type: 'CHOICE', dimension: '能量内耗', options: [{ value: 4, label: '总在反刍过去的事' }, { value: 3, label: '总在担心未来' }, { value: 0, label: '能专注在当下' }, { value: 4, label: '同时想太多，很混乱' }] },
  { id: 44, text: '我的能量状态：', type: 'CHOICE', dimension: '能量内耗', options: [{ value: 5, label: '经常身心俱疲但没做什么实事' }, { value: 0, label: '行动后疲惫是健康的' }, { value: 4, label: '想太多做太少' }, { value: 4, label: '内心总有各种声音在争吵' }] },
  // 完美主义行为
  { id: 45, text: '开始后中途放弃的频率：', type: 'CHOICE', dimension: '完美主义行为', options: [{ value: 0, label: '几乎不放弃' }, { value: 1, label: '偶尔' }, { value: 4, label: '经常因为"做不到最好"而放弃' }, { value: 5, label: '大部分都半途而废' }] },
  { id: 46, text: '看到自己的作品/成果时：', type: 'CHOICE', dimension: '完美主义行为', options: [{ value: 4, label: '只看到缺陷和不足' }, { value: 0, label: '客观评价优缺点' }, { value: 3, label: '觉得"别人能做得更好"' }, { value: 3, label: '羞于展示，怕被批评' }] },
  { id: 47, text: '拖延后我会：', type: 'CHOICE', dimension: '完美主义行为', options: [{ value: 4, label: '严厉自责但下次还是拖延' }, { value: 3, label: '找理由合理化' }, { value: 0, label: '分析原因调整策略' }, { value: 5, label: '觉得"我就是个废物"' }] },

  // Page 6: Deep Dive (48-50)
  { id: 48, text: '如果有一个声音总在限制你，它会说什么？', type: 'OPEN' },
  { id: 49, text: '你最想突破但最害怕的是什么？', type: 'OPEN' },
  { id: 50, text: '如果所有限制都消失，1年后的你在做什么？', type: 'OPEN' },
];

export const MOCK_VALID_CODE = "GROW2025";
