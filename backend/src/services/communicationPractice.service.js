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

export function createCommunicationPracticeService(prisma) {
  return {
    create(data) { return prisma.communicationPractice.create({ data }); },
    async list(filters) {
      const where = buildWhere(filters);
      const [items, total] = await Promise.all([
        prisma.communicationPractice.findMany({ where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize, orderBy: [{ practiceDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
        prisma.communicationPractice.count({ where }),
      ]);
      return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
    },
    async getById(id) {
      const session = await prisma.communicationPractice.findUnique({ where: { id } });
      if (!session) throw new HttpError(404, 'Communication practice session not found.');
      return session;
    },
    async update(id, data) {
      try { return await prisma.communicationPractice.update({ where: { id }, data }); }
      catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Communication practice session not found.'); throw error; }
    },
    async remove(id) {
      try { await prisma.communicationPractice.delete({ where: { id } }); return { id, deleted: true }; }
      catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Communication practice session not found.'); throw error; }
    },
    async stats() {
      const [totalSessions, completedSessions] = await Promise.all([
        prisma.communicationPractice.count(),
        prisma.communicationPractice.count({ where: { completed: true } }),
      ]);
      return { totalSessions, completedSessions, incompleteSessions: totalSessions - completedSessions };
    },
  };
}
