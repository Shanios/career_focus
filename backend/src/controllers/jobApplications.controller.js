import {
  validateJobApplicationBody,
  validateJobApplicationId,
  validateJobApplicationListQuery,
  validateJobApplicationStatsQuery,
} from '../validators/jobApplication.validator.js';
import { createJobApplicationsService } from '../services/jobApplications.service.js';

export function createJobApplicationsController(prisma) {
  const service = createJobApplicationsService(prisma);
  return {
    create: async (req, res) => {
      const application = await service.create(validateJobApplicationBody(req.body));
      res.status(201).json({ success: true, data: { application } });
    },
    list: async (req, res) => {
      const result = await service.list(validateJobApplicationListQuery(req.query));
      res.json({ success: true, data: result });
    },
    getById: async (req, res) => {
      const application = await service.getById(validateJobApplicationId(req.params.id));
      res.json({ success: true, data: { application } });
    },
    update: async (req, res) => {
      const id = validateJobApplicationId(req.params.id);
      const data = validateJobApplicationBody(req.body, { partial: true });
      const application = await service.update(id, data);
      res.json({ success: true, data: { application } });
    },
    remove: async (req, res) => {
      const result = await service.remove(validateJobApplicationId(req.params.id));
      res.json({ success: true, data: result });
    },
    stats: async (req, res) => {
      const result = await service.stats(validateJobApplicationStatsQuery(req.query));
      res.json({ success: true, data: result });
    },
  };
}
