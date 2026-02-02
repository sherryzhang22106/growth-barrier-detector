import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from './lib/db';
import { sanitizeForAI } from './lib/sanitize';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// Streaming analyze endpoint
async function analyzeStream(req: VercelRequest, res: VercelResponse) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return res.status(500).json({ error: 'AI服务未配置' });
  }

  const { assessmentId, userData } = req.body;

  if (!assessmentId || !userData) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment) {
    return res.status(404).json({ error: '测评不存在' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { aiStatus: 'generating' },
  });

  const sanitizedUserData = {
    basic_info: {
      age_group: sanitizeForAI(userData.basic_info?.age_group || '', 50),
      focus_areas: (userData.basic_info?.focus_areas || []).map((a: string) => sanitizeForAI(a, 50)),
      stuck_duration: sanitizeForAI(userData.basic_info?.stuck_duration || '', 50),
      change_expectation: sanitizeForAI(userData.basic_info?.change_expectation || '', 100),
      life_satisfaction: Math.max(1, Math.min(10, userData.basic_info?.life_satisfaction || 5)),
    },
    scores: userData.scores,
    core_issues: userData.core_issues,
    open_responses: {
      q48_limiting_voice: sanitizeForAI(userData.open_responses?.q48_limiting_voice || '', 500),
      q49_fear: sanitizeForAI(userData.open_responses?.q49_fear || '', 500),
      q50_ideal_future: sanitizeForAI(userData.open_responses?.q50_ideal_future || '', 500),
    },
    high_score_summary: sanitizeForAI(userData.high_score_summary || '', 2000),
  };

  const prompt = buildAIPrompt(sanitizedUserData);

  try {
    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位资深的"成长观察员"和个人成长导师，致力于通过行为细节揭示一个人的内在防御机制。你的分析深刻、温暖且具有洞察力。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 8000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API error:', errorData);
      res.write(`data: ${JSON.stringify({ error: 'AI API 调用失败' })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // Save to database
              await prisma.assessment.update({
                where: { id: assessmentId },
                data: {
                  aiAnalysis: fullContent,
                  aiStatus: 'completed',
                  completedAt: new Date(),
                },
              });

              res.write(`data: ${JSON.stringify({
                done: true,
                fullContent,
                aiStatus: 'completed',
                aiWordCount: fullContent.length
              })}\n\n`);
              res.end();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Fallback: if stream ended without [DONE]
      if (fullContent) {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            aiAnalysis: fullContent,
            aiStatus: 'completed',
            completedAt: new Date(),
          },
        });

        res.write(`data: ${JSON.stringify({
          done: true,
          fullContent,
          aiStatus: 'completed',
          aiWordCount: fullContent.length
        })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { aiStatus: 'failed' },
    }).catch(() => {});

    res.write(`data: ${JSON.stringify({ error: 'AI服务错误' })}\n\n`);
    res.end();
  }
}

// Report endpoint (non-streaming, for quick JSON response)
async function report(req: VercelRequest, res: VercelResponse) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return res.status(500).json({ error: 'AI服务未配置' });
  }

  const { scores, openAnswers } = req.body;

  if (!scores) {
    return res.status(400).json({ error: '缺少评分数据' });
  }

  const sanitizedAnswers = (openAnswers || []).map((a: string) => sanitizeForAI(a, 500));

  const prompt = `作为资深"成长观察员"与"个人成长导师"，根据以下探测量化结果生成一份针对性的简要指南。请保持冷静、客观且极具洞察力的分析风格，严禁出现任何医疗或心理咨询建议的措辞。

# 重要原则
- 严禁使用"架构师"、"解码"、"代码"、"逻辑扫描"等技术词汇。
- 使用人文、心理、成长相关的词汇，关注"生命脚本"与"重塑"。

# 探测数据
- 8个信念维度: ${JSON.stringify(scores.beliefScores)}
- 6个行为模式: ${JSON.stringify(scores.patternScores)}
- 综合阻碍指数: ${scores.overallIndex}/10
- 核心卡点: ${scores.coreBarrier}

# 用户心声
${sanitizedAnswers.join('\n')}

请输出严格的 JSON 格式报告，包含以下字段：
- analysis: 针对核心卡点的心智解读，指出潜意识是如何为了维持现状的"心理安全感"而牺牲了"真实成长"。(200-300字)
- immediateActions: 3个在24小时内可立即执行的小动作（具体、简单、不带压力）。
- plan21Days: 包含week1, week2, week3的对象，每周3条具体建议。
- relapseWarnings: 包含3个对象，每个对象有signal(预警信号)和strategy(应对策略)。

只输出 JSON，不要有其他内容。`;

  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的心理成长分析师，擅长输出结构化的 JSON 格式报告。只输出有效的 JSON，不要有任何其他文字。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('DeepSeek API error:', errorData);
    throw new Error('AI API 调用失败');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  let rawData: any = {};
  try {
    rawData = JSON.parse(content);
  } catch (e) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let cleanJson = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, ' ');
        rawData = JSON.parse(cleanJson);
      }
    } catch (e2) {
      rawData = {};
    }
  }

  const result = {
    analysis: rawData.analysis || '正在分析您的成长阻碍模式...',
    immediateActions: rawData.immediateActions || [
      '今天花5分钟写下一个小小的成功经历',
      '对镜子里的自己说一句鼓励的话',
      '完成一件一直拖延的小事'
    ],
    plan21Days: rawData.plan21Days || {
      week1: ['观察自己的内心声音', '记录触发情绪的时刻', '每天肯定自己一次'],
      week2: ['尝试一个小小的改变', '与信任的人分享感受', '练习说"不"'],
      week3: ['回顾进步', '调整策略', '建立新习惯']
    },
    relapseWarnings: rawData.relapseWarnings || [
      { signal: '开始自我批评', strategy: '暂停，深呼吸，提醒自己进步需要时间' },
      { signal: '想要放弃', strategy: '回顾已取得的小进步' },
      { signal: '感到焦虑', strategy: '做一件让自己放松的事' }
    ],
    scores
  };

  return res.status(200).json({
    success: true,
    data: result,
  });
}

function buildAIPrompt(userData: any): string {
  return `# 任务说明
现在有一位用户完成了"成长阻碍探测器"测评，你需要基于其50道题的答题数据，撰写一份**深度个性化的成长分析报告**。

⚠️ 关键要求：
1. **字数严格控制在 5000-7000 字**（这是硬性指标）。
2. **严禁使用 Markdown 的双星号 (**) 进行加粗**。请使用清晰的标题结构（# 和 ##）以及优美的排版来区分段落，不要在正文中使用任何加粗标记。
3. **每个判断必须有具体答题证据支撑**（引用题号和选项，如：你在 Q12 选择了...）。
4. **至少还原 4 个具体生活场景**（像电影慢镜头一样生动拆解）。
5. **绝对禁止技术术语**：严禁出现"架构师"、"解码"、"逻辑"、"代码"、"漏洞"、"系统"、"扫描"等程序员或工程词汇。
6. **身份统一**：你是"成长观察员"。严禁自称"咨询师"、"医生"或"伙伴"。

---

# 用户测评数据
## 基础信息
- 年龄段：${userData.basic_info.age_group}
- 关注领域：${userData.basic_info.focus_areas.join('、')}
- 被卡住时长：${userData.basic_info.stuck_duration}
- 改变期待：${userData.basic_info.change_expectation}
- 生活满意度：${userData.basic_info.life_satisfaction}/10
## 核心评分
- 阻碍指数：${userData.scores.obstacle_index}/10
- 状态评估：${userData.scores.level}
- 核心心智障碍：${userData.core_issues.primary_belief}（分值：${userData.core_issues.primary_score}/12）
- 次要心智障碍：${userData.core_issues.secondary_belief}
- 关键行为模式：${userData.core_issues.key_behavior}
## 信念维度详细得分
${JSON.stringify(userData.scores.dimensions, null, 2)}
## 行为模式详细得分
${JSON.stringify(userData.scores.behaviors, null, 2)}
## 开放题原文
Q48 - 内心的声音：${userData.open_responses.q48_limiting_voice}
Q49 - 最害怕的是：${userData.open_responses.q49_fear}
Q50 - 理想中的我：${userData.open_responses.q50_ideal_future}
## 显著特征题目
${userData.high_score_summary}

---

# 报告结构要求

## 第一部分：深层心理机制透视（1200-1500字）
1. 开篇锚定：引用阻碍指数 ${userData.scores.obstacle_index} 开启对话。
2. 核心矛盾揭示：基于最高分维度，通过至少 3 道具体题目拆解内心冲突。
3. 隐藏功能分析：分析 "${userData.open_responses.q48_limiting_voice}" 的自我保护意图。
4. 自动化循环推测：描述触发、想法、情绪、行为到结果的闭环。

## 第二部分：早期经验与生命印记（800-1000字）
1. 答题模式中的印记：从关系维度推测早期环境。
2. 三个可能的童年场景假设：生动描述场景、信念形成及当代影响。
3. 生存策略的当代后果：以前的"聪明选择"如何变成现在的"沉重负担"。

## 第三部分：典型场景深度还原（1500-1800字）⭐最重要
1. 场景1：机会来临的那一刻。结合 Q33 拆解 T-24h 到 T+24h 的内心戏剧。
2. 场景2：获得赞美的瞬间。结合 Q9 拆解由于自我否定导致的"不适感"。
3. 场景3：[根据用户突出问题定制场景，如做决定的时刻]。
4. 场景4：理想与现实的对话。分析现实中的你与 Q50 中"理想我"之间的恐惧墙。

## 第四部分：限制性心智图谱（800-1000字）
1. 信念闭环可视化描述：用文字描绘一张从核心恐惧到行为逃避的地图。
2. 最难撼动的那一环：为什么它能长久存在？
3. 撬动改变的缝隙：具体的替换实验设计。

## 第五部分：行为模式的维持力量（600-800字）
1. 现状的"奖赏"：你的拖延或防御在潜意识里为你争取到了什么？
2. 循环图解说：详细解释每个环节的心理连接。

## 第六部分：突破路径规划（1200-1500字）
1. 阶段1：意识觉醒期（1-2周）。每日练习：反例搜集、声音监测。
2. 阶段2：小范围实验期（3-4周）。针对 ${userData.core_issues.key_behavior} 的微突破动作。
3. 阶段3：重塑期（5-8周）。心智替换练习。
4. 阶段4：巩固期（9-12周）。应对反复，建立长期观察机制。

## 第七部分：写给你的信（500-700字）
回应用户的恐惧 "${userData.open_responses.q49_fear}"。
署名：你的成长观察员。
注意：严禁展示日期。

---

现在，请开始生成这份专属于用户的深度生命报告。记住：不需要加粗语法，用文字的深度去触动内心。`;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'analyze':
        return analyzeStream(req, res);
      case 'report':
        return report(req, res);
      default:
        return res.status(400).json({ error: '无效的操作' });
    }
  } catch (error) {
    console.error('AI API error:', error);

    const { assessmentId } = req.body;
    if (assessmentId) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { aiStatus: 'failed' },
      }).catch(() => {});
    }

    return res.status(500).json({ error: 'AI服务错误' });
  }
}
