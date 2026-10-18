import { validateId, validateListQuery, validateQuestionBody, validateStatsQuery } from '../validators/codingQuestion.validator.js';
import { createCodingQuestionsService } from '../services/codingQuestions.service.js';

export function createCodingQuestionsController(prisma) {
  const service = createCodingQuestionsService(prisma);
  return {
    create: async (req, res) => {
      const data = validateQuestionBody(req.body);
      const question = await service.create(data);
      res.status(201).json({ success: true, data: { question } });
    },
    list: async (req, res) => {
      const result = await service.list(validateListQuery(req.query));
      res.json({ success: true, data: result });
    },
    getById: async (req, res) => {
      const question = await service.getById(validateId(req.params.id));
      res.json({ success: true, data: { question } });
    },
    update: async (req, res) => {
      const id = validateId(req.params.id);
      const data = validateQuestionBody(req.body, { partial: true });
      const question = await service.update(id, data);
      res.json({ success: true, data: { question } });
    },
    remove: async (req, res) => {
      const result = await service.remove(validateId(req.params.id));
      res.json({ success: true, data: result });
    },
    stats: async (req, res) => {
      const result = await service.stats(validateStatsQuery(req.query));
      res.json({ success: true, data: result });
    },
  };
}
