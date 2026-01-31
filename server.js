import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Import handlers
import codesValidate from './api/codes/validate.js';
import codesList from './api/codes/list.js';
import codesCreate from './api/codes/create.js';
import codesRevoke from './api/codes/revoke.js';
import assessmentsSubmit from './api/assessments/submit.js';
import assessmentsList from './api/assessments/list.js';
import assessmentsExport from './api/assessments/export.js';
import assessmentById from './api/assessments/[id].js';
import assessmentsPdf from './api/assessments/pdf.js';
import adminLogin from './api/auth/admin-login.js';
import aiAnalyze from './api/ai/analyze.js';
import aiReport from './api/ai/report.js';
import progress from './api/progress.js';

// Helper to convert Vercel handler to Express middleware
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// API Routes
app.post('/api/codes/validate', wrap(codesValidate));
app.get('/api/codes/list', wrap(codesList));
app.post('/api/codes/create', wrap(codesCreate));
app.post('/api/codes/revoke', wrap(codesRevoke));

app.post('/api/assessments/submit', wrap(assessmentsSubmit));
app.get('/api/assessments/list', wrap(assessmentsList));
app.get('/api/assessments/export', wrap(assessmentsExport));
app.get('/api/assessments/pdf', wrap(assessmentsPdf));
app.get('/api/assessments/:id', (req, res) => {
  req.query.id = req.params.id;
  wrap(assessmentById)(req, res);
});

app.post('/api/auth/admin-login', wrap(adminLogin));

app.post('/api/ai/analyze', wrap(aiAnalyze));
app.post('/api/ai/report', wrap(aiReport));

app.get('/api/progress', wrap(progress));
app.post('/api/progress', wrap(progress));
app.delete('/api/progress', wrap(progress));

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
