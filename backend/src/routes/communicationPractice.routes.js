import { Router } from 'express';
import { createCommunicationPracticeController } from '../controllers/communicationPractice.controller.js';

export function createCommunicationPracticeRouter(prisma) {
  const router = Router();
  const controller = createCommunicationPracticeController(prisma);
  router.get('/stats', controller.stats);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
