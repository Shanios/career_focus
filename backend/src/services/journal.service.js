import { HttpError } from '../lib/httpError.js';

export function createJournalService(prisma) {
  return {
    create(data) { return prisma.journalEntry.create({ data }); },
    async list(filters) {
      const where = {};
      if (filters.date || filters.startDate || filters.endDate) {
        where.entryDate = {};
        const lower = filters.date && filters.startDate ? (filters.date > filters.startDate ? filters.date : filters.startDate) : filters.date || filters.startDate;
        const upper = filters.date && filters.endDate ? (filters.date < filters.endDate ? filters.date : filters.endDate) : filters.date || filters.endDate;
        if (lower) where.entryDate.gte = lower; if (upper) where.entryDate.lte = upper;
      }
      if (filters.search) where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { content: { contains: filters.search, mode: 'insensitive' } }];
      const [items, total] = await Promise.all([
        prisma.journalEntry.findMany({ where, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize, orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
        prisma.journalEntry.count({ where }),
      ]);
      return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
    },
    async getById(id) { const entry = await prisma.journalEntry.findUnique({ where: { id } }); if (!entry) throw new HttpError(404, 'Journal entry not found.'); return entry; },
    async update(id, data) { try { return await prisma.journalEntry.update({ where: { id }, data }); } catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Journal entry not found.'); throw error; } },
    async remove(id) { try { await prisma.journalEntry.delete({ where: { id } }); return { id, deleted: true }; } catch (error) { if (error?.code === 'P2025') throw new HttpError(404, 'Journal entry not found.'); throw error; } },
  };
}
