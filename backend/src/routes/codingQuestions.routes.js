import { Router } from 'express';
import { createCodingQuestionsController } from '../controllers/codingQuestions.controller.js';

export function createCodingQuestionRouter(prisma) {
  const router = Router();
  const controller = createCodingQuestionsController(prisma);

  router.get('/stats', controller.stats);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
