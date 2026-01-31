import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sanitizeForAI } from '../lib/sanitize';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured, env:', Object.keys(process.env).filter(k => k.includes('DEEP')));
    return res.status(500).json({ error: 'AI服务未配置' });
  }

  try {
    const { scores, openAnswers } = req.body;

    if (!scores) {
      return res.status(400).json({ error: '缺少评分数据' });
    }

    // Sanitize open answers
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

    // Call DeepSeek API
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

    console.log('DeepSeek response content:', content.substring(0, 500));

    // Parse JSON response with better error handling
    let rawData: any = {};
    try {
      // First try direct parse
      rawData = JSON.parse(content);
    } catch (e) {
      console.log('Direct JSON parse failed, trying to extract...');
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // Clean up common JSON issues
          let cleanJson = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas
            .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
            .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
          rawData = JSON.parse(cleanJson);
        }
      } catch (e2) {
        console.error('JSON extraction also failed:', e2);
        // Use defaults if parsing fails completely
        rawData = {};
      }
    }

    // Ensure required fields exist with defaults
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
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: '报告生成失败' });
  }
}
