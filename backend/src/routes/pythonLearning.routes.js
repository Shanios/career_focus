import { Router } from 'express';
import { createPythonLearningController } from '../controllers/pythonLearning.controller.js';

export function createPythonLearningRouter(prisma) {
  const router = Router();
  const controller = createPythonLearningController(prisma);
  router.get('/stats', controller.stats);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
