import { Router } from 'express';
import { createJournalController } from '../controllers/journal.controller.js';

export function createJournalRouter(prisma) {
  const router = Router(); const controller = createJournalController(prisma);
  router.get('/', controller.list); router.post('/', controller.create); router.get('/:id', controller.getById); router.patch('/:id', controller.update); router.delete('/:id', controller.remove);
  return router;
}
