import { createDailyProgressService } from '../services/dailyProgress.service.js';
import { validateDailyProgressDate, validateDailyTargets } from '../validators/dailyProgress.validator.js';

export function createDailyProgressController(prisma) {
  const service = createDailyProgressService(prisma);
  return {
    getProgress: async (req, res) => {
      const date = validateDailyProgressDate(req.query);
      res.json({ success: true, data: await service.getProgress(date) });
    },
    getTargets: async (_req, res) => {
      res.json({ success: true, data: { targets: await service.getTargets() } });
    },
    updateTargets: async (req, res) => {
      const targets = validateDailyTargets(req.body);
      res.json({ success: true, data: { targets: await service.updateTargets(targets) } });
    },
  };
}
