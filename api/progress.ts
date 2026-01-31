import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from './lib/db';
import { sanitizeInput, sanitizeResponses } from './lib/sanitize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Get progress
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const sanitizedUserId = sanitizeInput(userId, 100);

    try {
      const progress = await prisma.progress.findUnique({
        where: { userId: sanitizedUserId },
      });

      if (!progress) {
        return res.status(200).json({ success: true, data: null });
      }

      return res.status(200).json({
        success: true,
        data: {
          responses: typeof progress.responses === 'string' ? JSON.parse(progress.responses) : progress.responses,
          updatedAt: progress.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get progress error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  if (req.method === 'POST') {
    // Save progress
    const { userId, responses } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const sanitizedUserId = sanitizeInput(userId, 100);
    const sanitizedResponses = sanitizeResponses(responses || {});

    try {
      await prisma.progress.upsert({
        where: { userId: sanitizedUserId },
        update: { responses: JSON.stringify(sanitizedResponses) },
        create: {
          userId: sanitizedUserId,
          responses: JSON.stringify(sanitizedResponses),
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Save progress error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  if (req.method === 'DELETE') {
    // Clear progress
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const sanitizedUserId = sanitizeInput(userId, 100);

    try {
      await prisma.progress.deleteMany({
        where: { userId: sanitizedUserId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete progress error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  return res.status(405).json({ error: '方法不允许' });
}
