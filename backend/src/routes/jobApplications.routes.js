import { Router } from 'express';
import { createJobApplicationsController } from '../controllers/jobApplications.controller.js';

export function createJobApplicationsRouter(prisma) {
  const router = Router();
  const controller = createJobApplicationsController(prisma);
  router.get('/stats', controller.stats);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
