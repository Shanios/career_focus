import { createPythonLearningService } from '../services/pythonLearning.service.js';
import { validatePythonLearningBody, validatePythonLearningId, validatePythonLearningListQuery } from '../validators/pythonLearning.validator.js';

export function createPythonLearningController(prisma) {
  const service = createPythonLearningService(prisma);
  return {
    create: async (req, res) => { const entry = await service.create(validatePythonLearningBody(req.body)); res.status(201).json({ success: true, data: { entry } }); },
    list: async (req, res) => { const result = await service.list(validatePythonLearningListQuery(req.query)); res.json({ success: true, data: result }); },
    getById: async (req, res) => { const entry = await service.getById(validatePythonLearningId(req.params.id)); res.json({ success: true, data: { entry } }); },
    update: async (req, res) => { const id = validatePythonLearningId(req.params.id); const data = validatePythonLearningBody(req.body, { partial: true }); const entry = await service.update(id, data); res.json({ success: true, data: { entry } }); },
    remove: async (req, res) => { const result = await service.remove(validatePythonLearningId(req.params.id)); res.json({ success: true, data: result }); },
    stats: async (_req, res) => { const result = await service.stats(); res.json({ success: true, data: result }); },
  };
}
