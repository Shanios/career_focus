import { createJournalService } from '../services/journal.service.js';
import { validateJournalBody, validateJournalId, validateJournalListQuery } from '../validators/journal.validator.js';

export function createJournalController(prisma) {
  const service = createJournalService(prisma);
  return {
    create: async (req, res) => { const entry = await service.create(validateJournalBody(req.body)); res.status(201).json({ success: true, data: { entry } }); },
    list: async (req, res) => { const result = await service.list(validateJournalListQuery(req.query)); res.json({ success: true, data: result }); },
    getById: async (req, res) => { const entry = await service.getById(validateJournalId(req.params.id)); res.json({ success: true, data: { entry } }); },
    update: async (req, res) => { const id = validateJournalId(req.params.id); const data = validateJournalBody(req.body, { partial: true }); const entry = await service.update(id, data); res.json({ success: true, data: { entry } }); },
    remove: async (req, res) => { const result = await service.remove(validateJournalId(req.params.id)); res.json({ success: true, data: result }); },
  };
}
