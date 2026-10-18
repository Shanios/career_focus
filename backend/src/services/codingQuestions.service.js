import { HttpError } from '../lib/httpError.js';

function recordDate(date) {
  return new Date(date.getTime());
}

function buildWhere({ type, date, startDate, endDate }) {
  const where = {};
  if (type) where.type = type;
  if (date || startDate || endDate) {
    where.date = {};
    const lowerBound = date && startDate
      ? (date > startDate ? date : startDate)
      : date || startDate;
    const upperBound = date && endDate
      ? (date < endDate ? date : endDate)
      : date || endDate;
    if (lowerBound) where.date.gte = recordDate(lowerBound);
    if (upperBound) where.date.lte = recordDate(upperBound);
  }
  return where;
}

function toDateKey(value) {
  return value.toISOString().slice(0, 10);
}

function prismaNotFound(error) {
  return error?.code === 'P2025';
}

export function createCodingQuestionsService(prisma) {
  return {
    async create(data) {
      return prisma.codingQuestion.create({ data });
    },

    async list(filters) {
      const where = buildWhere(filters);
      const skip = (filters.page - 1) * filters.pageSize;
      const [items, total] = await Promise.all([
        prisma.codingQuestion.findMany({
          where,
          skip,
          take: filters.pageSize,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.codingQuestion.count({ where }),
      ]);
      return {
        items,
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total,
          totalPages: Math.ceil(total / filters.pageSize),
        },
      };
    },

    async getById(id) {
      const question = await prisma.codingQuestion.findUnique({ where: { id } });
      if (!question) throw new HttpError(404, 'Coding question not found.');
      return question;
    },

    async update(id, data) {
      try {
        return await prisma.codingQuestion.update({ where: { id }, data });
      } catch (error) {
        if (prismaNotFound(error)) throw new HttpError(404, 'Coding question not found.');
        throw error;
      }
    },

    async remove(id) {
      try {
        await prisma.codingQuestion.delete({ where: { id } });
        return { id, deleted: true };
      } catch (error) {
        if (prismaNotFound(error)) throw new HttpError(404, 'Coding question not found.');
        throw error;
      }
    },

    async stats(filters) {
      const [totalQuestions, byType, dateCount, groupedDays] = await Promise.all([
        prisma.codingQuestion.count(),
        prisma.codingQuestion.groupBy({ by: ['type'], _count: { _all: true } }),
        filters.date
          ? prisma.codingQuestion.count({ where: { date: recordDate(filters.date) } })
          : Promise.resolve(undefined),
        filters.startDate
          ? prisma.codingQuestion.groupBy({
              by: ['date'],
              where: { date: { gte: recordDate(filters.startDate), lte: recordDate(filters.endDate) } },
              _count: { _all: true },
              orderBy: { date: 'asc' },
            })
          : Promise.resolve(undefined),
      ]);

      const types = Object.fromEntries(byType.map((group) => [group.type, group._count._all]));
      const result = {
        totalQuestions,
        dsaQuestions: types.DSA || 0,
        interviewQuestions: types.INTERVIEW || 0,
      };
      if (filters.date) result.dateCount = { date: toDateKey(filters.date), count: dateCount };
      if (filters.startDate) {
        const countsByDate = new Map(groupedDays.map((group) => [toDateKey(group.date), group._count._all]));
        const dailyCounts = [];
        for (let day = recordDate(filters.startDate); day <= filters.endDate; day.setUTCDate(day.getUTCDate() + 1)) {
          const key = toDateKey(day);
          dailyCounts.push({ date: key, count: countsByDate.get(key) || 0 });
        }
        result.dailyCounts = dailyCounts;
      }
      return result;
    },
  };
}
