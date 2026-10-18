import { Router } from 'express';
import { createDailyProgressController } from '../controllers/dailyProgress.controller.js';

export function createDailyProgressRouter(prisma) {
  const router = Router();
  const controller = createDailyProgressController(prisma);
  router.get('/targets', controller.getTargets);
  router.patch('/targets', controller.updateTargets);
  router.get('/', controller.getProgress);
  return router;
}
