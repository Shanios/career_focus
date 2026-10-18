import { HttpError } from '../lib/httpError.js';

function buildWhere({ date, startDate, endDate, completed }) {
  const where = {};
  if (completed !== undefined) where.completed = completed;
  if (date || startDate || endDate) {
    const lower = date && startDate ? (date > startDate ? date : startDate) : date || startDate;
    const upper = date && endDate ? (date < endDate ? date : endDate) : date || endDate;
    where.practiceDate = {};
    if (lower) where.practiceDate.gte = lower;
    if (upper) where.practiceDate.lte = upper;
  }
  return where;
}

export function createPythonLearningService(prisma) {
  return {
    create(data) { return prisma.pythonLearningEntry.create({ data }); },
    async list(filters) {
      const where = buildWhere(filters);
      const [items, total] = await Promise.all([
        prisma.pythonLearningEntry.findMany({ where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize, orderBy: [{ practiceDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
        prisma.pythonLearningEntry.count({ where }),
      ]);
      return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
    },
    async getById(id) {
      const entry = await prisma.pythonLearningEntry.findUnique({ where: { id } });
      if (!entry) throw new HttpError(404, 'Python learning entry not found.');
      return entry;
    },
    async update(id, data) {
      try { return await prisma.pythonLearningEntry.update({ where: { id }, data }); }
      catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Python learning entry not found.'); throw error; }
    },
    async remove(id) {
      try { await prisma.pythonLearningEntry.delete({ where: { id } }); return { id, deleted: true }; }
      catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Python learning entry not found.'); throw error; }
    },
    async stats() {
      const [totalEntries, completedEntries] = await Promise.all([
        prisma.pythonLearningEntry.count(),
        prisma.pythonLearningEntry.count({ where: { completed: true } }),
      ]);
      const incompleteEntries = totalEntries - completedEntries;
      return { totalEntries, completedEntries, incompleteEntries, completionRate: totalEntries ? Math.round(completedEntries * 100 / totalEntries) : 0 };
    },
  };
}
