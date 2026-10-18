import cors from 'cors';
import express from 'express';
import { createCodingQuestionRouter } from './routes/codingQuestions.routes.js';
import { createJobApplicationsRouter } from './routes/jobApplications.routes.js';
import { createPythonLearningRouter } from './routes/pythonLearning.routes.js';
import { createCommunicationPracticeRouter } from './routes/communicationPractice.routes.js';
import { createDailyProgressRouter } from './routes/dailyProgress.routes.js';
import { createJournalRouter } from './routes/journal.routes.js';
import { createErrorHandler } from './middleware/errorHandler.js';

export function createApp({ corsOrigin, prisma } = {}) {
  if (!prisma) throw new Error('createApp requires a Prisma client.');
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, data: { status: 'ok', database: 'reachable' } });
    } catch {
      res.status(503).json({ success: false, error: { message: 'Database is unavailable.' } });
    }
  });

  app.get('/api', (_req, res) => {
    res.json({ success: true, data: { name: 'Job Search & Learning Tracker', version: '1.0.0' } });
  });

  app.use('/api/coding-questions', createCodingQuestionRouter(prisma));
  app.use('/api/job-applications', createJobApplicationsRouter(prisma));
  app.use('/api/python-learning', createPythonLearningRouter(prisma));
  app.use('/api/communication-practice', createCommunicationPracticeRouter(prisma));
  app.use('/api/daily-progress', createDailyProgressRouter(prisma));
  app.use('/api/journal', createJournalRouter(prisma));

  app.use((req, res) => {
    res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.path}` } });
  });

  app.use(createErrorHandler());

  return app;
}

