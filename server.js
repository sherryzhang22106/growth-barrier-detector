import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 根据环境加载不同的配置文件
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
dotenv.config({ path: envFile });

import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 生产环境：提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Import handlers
import codesHandler from './api/codes.ts';
import aiHandler from './api/ai.ts';
import paymentHandler from './api/payment.ts';
import assessmentsSubmit from './api/assessments/submit.ts';
import assessmentsList from './api/assessments/list.ts';
import assessmentsExport from './api/assessments/export.ts';
import assessmentById from './api/assessments/[id].ts';
import assessmentsPdf from './api/assessments/pdf.ts';
import adminLogin from './api/auth/admin-login.ts';
import progress from './api/progress.ts';

// Helper to convert Vercel handler to Express middleware
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Codes API Routes (unified handler with action query param)
app.all('/api/codes', wrap(codesHandler));
app.post('/api/codes/validate', (req, res) => {
  req.query.action = 'validate';
  wrap(codesHandler)(req, res);
});
app.get('/api/codes/list', (req, res) => {
  req.query.action = 'list';
  wrap(codesHandler)(req, res);
});
app.post('/api/codes/create', (req, res) => {
  req.query.action = 'create';
  wrap(codesHandler)(req, res);
});
app.post('/api/codes/revoke', (req, res) => {
  req.query.action = 'revoke';
  wrap(codesHandler)(req, res);
});
app.post('/api/codes/delete-all-unused', (req, res) => {
  req.query.action = 'delete-all-unused';
  wrap(codesHandler)(req, res);
});

// Assessments API Routes
app.post('/api/assessments/submit', wrap(assessmentsSubmit));
app.get('/api/assessments/list', wrap(assessmentsList));
app.get('/api/assessments/export', wrap(assessmentsExport));
app.get('/api/assessments/pdf', wrap(assessmentsPdf));
app.get('/api/assessments/:id', (req, res) => {
  req.query.id = req.params.id;
  wrap(assessmentById)(req, res);
});

// Auth API Routes
app.post('/api/auth/admin-login', wrap(adminLogin));

// AI API Routes (unified handler with action query param)
app.all('/api/ai', wrap(aiHandler));
app.post('/api/ai/analyze', (req, res) => {
  req.query.action = 'analyze';
  wrap(aiHandler)(req, res);
});
app.post('/api/ai/report', (req, res) => {
  req.query.action = 'report';
  wrap(aiHandler)(req, res);
});

// Progress API Routes
app.get('/api/progress', wrap(progress));
app.post('/api/progress', wrap(progress));
app.delete('/api/progress', wrap(progress));

// Payment API Routes
app.all('/api/payment', wrap(paymentHandler));

// 生产环境：所有其他路由返回 index.html（SPA 支持）
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // 如果不是 API 请求，返回 index.html
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      next();
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
