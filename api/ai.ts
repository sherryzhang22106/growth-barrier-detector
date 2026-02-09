import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from './lib/db';
import { sanitizeForAI } from './lib/sanitize';
import { rateLimiters, getClientIP, checkDailyAILimit } from './lib/rateLimit';
import { applyCors, handleCorsPreflightRequest, getCorsHeaders } from './lib/cors';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * 带重试的 fetch 请求
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 如果是服务器错误（5xx），尝试重试
      if (response.status >= 500 && attempt < retries) {
        console.log(`AI API attempt ${attempt} failed with status ${response.status}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`AI API attempt ${attempt} error:`, error);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError || new Error('AI API request failed after retries');
}

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

  // 检查限流
  const clientIP = getClientIP(req);
  const userId = userData.userId || assessmentId;

  // IP 级别限流
  const ipLimit = rateLimiters.aiAnalysis(clientIP);
  if (!ipLimit.success) {
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      retryAfter: ipLimit.retryAfter,
    });
  }

  // 用户级别每日限制
  const dailyLimit = checkDailyAILimit(userId, 5);
  if (!dailyLimit.allowed) {
    return res.status(429).json({
      error: '今日 AI 分析次数已用完，请明天再试',
      used: dailyLimit.used,
      remaining: dailyLimit.remaining,
    });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment) {
    return res.status(404).json({ error: '测评不存在' });
  }

  // Set SSE headers with proper CORS
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { aiStatus: 'generating' },
  });

  const sanitizedUserData = {
    scores: userData.scores,
    open_responses: {
      q36_breakdown: sanitizeForAI(userData.open_responses?.q36_breakdown || '', 500),
      q37_vacation: sanitizeForAI(userData.open_responses?.q37_vacation || '', 500),
      q38_status: sanitizeForAI(userData.open_responses?.q38_status || '', 500),
    },
  };

  const prompt = buildAIPrompt(sanitizedUserData);

  try {
    const response = await fetchWithRetry(DEEPSEEK_BASE_URL, {
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
            content: '你是一位温暖、专业且极具洞察力的心理陪伴者，擅长用生动的比喻和具体的场景让用户产生强烈共鸣。你的报告要让用户看完后产生"这也太懂我了吧"的感觉，并忍不住分享给朋友。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 6000,
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

  const prompt = `作为温暖专业的心理陪伴者，根据以下内耗测评结果生成一份针对性的简要指南。

# 测评数据
- 内耗总分：${scores.totalScore}/100分
- 等级：${scores.level}
- 维度得分：
  * 思维内耗：${scores.dimensionPercentages?.['思维内耗'] || 0}%
  * 情绪内耗：${scores.dimensionPercentages?.['情绪内耗'] || 0}%
  * 行动内耗：${scores.dimensionPercentages?.['行动内耗'] || 0}%
  * 关系内耗：${scores.dimensionPercentages?.['关系内耗'] || 0}%
- 最高内耗维度：${scores.topDimension || scores.coreBarrier}

# 用户心声
${sanitizedAnswers.join('\n')}

请输出严格的 JSON 格式报告，包含以下字段：
- analysis: 针对最高内耗维度的心理解读，用温暖共情的语气，指出内耗的隐藏功能和改变的可能性。(200-300字)
- immediateActions: 3个在24小时内可立即执行的小动作（具体、简单、不带压力）。
- plan21Days: 包含week1, week2, week3的对象，每周3条具体建议。
- relapseWarnings: 包含3个对象，每个对象有signal(预警信号)和strategy(应对策略)。

只输出 JSON，不要有其他内容。`;

  const response = await fetchWithRetry(DEEPSEEK_BASE_URL, {
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
          content: '你是一位温暖专业的心理陪伴者，擅长输出结构化的 JSON 格式报告。只输出有效的 JSON，不要有任何其他文字。'
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
    analysis: rawData.analysis || '正在分析您的内耗模式...',
    immediateActions: rawData.immediateActions || [
      '今天花2分钟把脑子里的想法写下来',
      '给自己设置一个"思维熔断"时间',
      '做一件让自己开心的小事'
    ],
    plan21Days: rawData.plan21Days || {
      week1: ['观察自己的内耗时刻', '记录能量消耗的场景', '每天给自己一个小肯定'],
      week2: ['尝试5-5-5法则', '设置社交能量配额', '练习说"这件事明天再想"'],
      week3: ['回顾能量变化', '调整策略', '建立低内耗习惯']
    },
    relapseWarnings: rawData.relapseWarnings || [
      { signal: '开始反复纠结一件小事', strategy: '用2分钟大脑dump法写下来' },
      { signal: '社交后感觉被掏空', strategy: '给自己留出独处恢复时间' },
      { signal: '睡前开始复盘', strategy: '设置思维熔断时间，告诉大脑"已保存，明天处理"' }
    ],
    scores
  };

  return res.status(200).json({
    success: true,
    data: result,
  });
}

function buildAIPrompt(userData: any): string {
  const scores = userData.scores || {};
  const totalScore = scores.totalScore || 0;
  const level = scores.level || scores.levelInfo?.level || '轻度内耗型';
  const beatPercent = scores.beatPercent || 50;
  const dimensionPercentages = scores.dimensionPercentages || scores.patternScores || {};
  const topDimension = scores.topDimension || scores.coreBarrier || '思维内耗';

  return `你是一位温暖、专业且极具洞察力的心理陪伴者，擅长用生动的比喻和具体的场景让用户产生强烈共鸣。你的报告要让用户看完后产生"这也太懂我了吧"的感觉，并忍不住分享给朋友。

【用户数据】
- 内耗总分：${totalScore}/100分
- 等级：${level}
- 击败了全国${beatPercent}%的用户
- 维度得分：
  * 思维内耗：${dimensionPercentages['思维内耗'] || 0}%
  * 情绪内耗：${dimensionPercentages['情绪内耗'] || 0}%
  * 行动内耗：${dimensionPercentages['行动内耗'] || 0}%
  * 关系内耗：${dimensionPercentages['关系内耗'] || 0}%
- 最高内耗维度：${topDimension}
- 开放题回答：
  Q1（崩溃时刻）: ${userData.open_responses?.q36_breakdown || '未填写'}
  Q2（理想放假）: ${userData.open_responses?.q37_vacation || '未填写'}
  Q3（现状vs理想）: ${userData.open_responses?.q38_status || '未填写'}

【报告结构与字数分配】（总计2800-3200字）

---

## 第一部分：破冰开场（300-400字）

目标：用用户自己的话建立强共鸣，让ta感觉"被看见了"

写作要点：
1. 直接引用用户Q1的回答作为开头
2. 用"你知道吗"句式建立对话感
3. 给这个状态起个生动的名字（比如"3am思维风暴""社交后遗症""选择瘫痪症"）
4. 用数据增强说服力（"83%的年轻人都经历过..."）
5. 最后一句引出总分

语言风格：
- 像朋友在咖啡馆跟你聊天
- 适度使用emoji（2-3个）
- 可以用"你是不是..."的句式引发共鸣

---

## 第二部分：精准画像（600-800字）

目标：通过四维数据+开放题，精准描绘用户的内耗人格

写作要点：
1. 用雷达图数据引入："你的雷达图长这样..."
2. 找出最高的1-2个维度深挖
3. 结合开放题的具体场景举例
4. 给用户起个人格标签（比如"思虑型人格""情绪海绵体质""行动瘫痪星人""关系敏感者"）
5. 用比喻让抽象概念具象化
6. 点出内耗的恶性循环链条

必须包含的元素：
- 至少2个生动比喻
- 至少1个用户会点头的具体场景
- 至少1个恶性循环的解释
- 维度之间的关联分析（比如"你的思维内耗会加重情绪内耗"）

---

## 第三部分：能量泄漏诊断（500-700字）

目标：像医生诊断一样，精准指出用户能量流失的具体场景

写作要点：
1. 基于开放题，找出3-5个具体的能量泄漏点
2. 每个泄漏点要有：场景描述+心理机制解释+能量损耗程度
3. 用"能量账单"的形式呈现，让数据可视化
4. 点出最大的那个"能量黑洞"

必须包含：
- 至少3个具体场景
- 每个场景的心理学解释
- 量化的能量损耗（比如"这个场景大约消耗你30%的日常能量"）
- 一个"你可能没意识到的隐形内耗"

---

## 第四部分：对症下药（800-1000字）

目标：给出具体、可操作的改变方法，让用户觉得"我可以试试"

写作要点：
1. 根据最高的2个维度给出针对性建议
2. 每个建议包括：为什么有效+具体怎么做+预期效果
3. 难度从低到高排列（先给个最简单的建立信心）
4. 用"如果...就..."的条件句增强可操作性
5. 引用用户Q2的理想放假方式，给个性化建议
6. 如果是中/重度，必须有"何时需要专业帮助"的提醒

必须包含的建议类型：
- 1个立刻能做的微习惯（难度★☆☆☆☆）
- 2-3个针对性方法（难度★★★☆☆）
- 1个长期养成方案（难度★★★★☆）
- 1个工具/app推荐
- 1个应对急性内耗的"急救方案"

---

## 第五部分：给你的能量管理手册（400-500字）

目标：提供长期的能量管理框架，成为用户收藏的实用工具

写作要点：
1. 提供一个可视化的"能量管理框架"
2. 给出"高能量时刻"和"低能量时刻"的识别方法
3. 提供"每日能量记账"的简单方法
4. 给出3-5条"低内耗生活原则"
5. 结合用户Q3的理想状态，描绘"低内耗生活"的样子

---

## 第六部分：治愈收尾（200-300字）

目标：情感连接，让用户感动、被理解，产生分享冲动

写作要点：
1. 回应用户开放题中的情绪
2. 给一个"不是你的错"的确认
3. 用比喻或金句结尾
4. 留一个钩子引导复测
5. 如果是重度内耗，语气要更加温柔

---

【报告撰写总体要求】

数据运用原则：
- 每个部分至少引用2个具体数据（分数、百分比、排名）
- 数据要有对比（"你的XX分，比平均水平高/低X%"）
- 用数据增强说服力但不生硬堆砌

传播性设计：
- 每300-400字出现一个"金句"（用户可能截图的话）
- 至少5处"扎心又治愈"的共鸣点
- 3-5个生动比喻（能让用户说"这个比喻太形象了"）
- 2-3处幽默/自嘲（让用户会心一笑）
- 标题/小标题要有吸引力（用户想分享）

情感曲线：
- 开头：共鸣（"我懂你"）
- 中段：洞察（"原来是这样"）
- 建议：赋能（"我可以改变"）
- 结尾：治愈（"我被理解了"）

必须避免：
- 空洞鸡汤（"加油""你可以的"）
- 说教口吻（"你应该""你必须"）
- 过度专业术语（如必须使用要解释）
- 责备用户（"都是因为你..."）
- 给医学诊断（用"状态""模式"替代"病""症"）
- 使用Markdown的双星号(**)进行加粗
- 在报告中添加"报告生成时间"或任何日期时间信息

根据不同分数段调整语气：
- 0-25分：欣赏+提醒潜在风险
- 26-50分：肯定+给具体方法
- 51-75分：共情+强调可改变
- 76-100分：温柔+强烈建议专业帮助

现在，请根据用户数据生成这份2800-3200字的定制化报告。`;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }

  // Apply CORS headers
  applyCors(req, res);

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
