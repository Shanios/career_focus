import { createCommunicationPracticeService } from '../services/communicationPractice.service.js';
import { validateCommunicationPracticeBody, validateCommunicationPracticeId, validateCommunicationPracticeListQuery } from '../validators/communicationPractice.validator.js';

export function createCommunicationPracticeController(prisma) {
  const service = createCommunicationPracticeService(prisma);
  return {
    create: async (req, res) => { const session = await service.create(validateCommunicationPracticeBody(req.body)); res.status(201).json({ success: true, data: { session } }); },
    list: async (req, res) => { const result = await service.list(validateCommunicationPracticeListQuery(req.query)); res.json({ success: true, data: result }); },
    getById: async (req, res) => { const session = await service.getById(validateCommunicationPracticeId(req.params.id)); res.json({ success: true, data: { session } }); },
    update: async (req, res) => { const id = validateCommunicationPracticeId(req.params.id); const data = validateCommunicationPracticeBody(req.body, { partial: true }); const session = await service.update(id, data); res.json({ success: true, data: { session } }); },
    remove: async (req, res) => { const result = await service.remove(validateCommunicationPracticeId(req.params.id)); res.json({ success: true, data: result }); },
    stats: async (_req, res) => { const result = await service.stats(); res.json({ success: true, data: result }); },
  };
}
