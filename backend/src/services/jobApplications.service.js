import { HttpError } from '../lib/httpError.js';

export const SUBMITTED_STATUSES = ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED'];

function buildWhere({ search, status, date, startDate, endDate }) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { jobTitle: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (date || startDate || endDate) {
    const lower = date && startDate ? (date > startDate ? date : startDate) : date || startDate;
    const upper = date && endDate ? (date < endDate ? date : endDate) : date || endDate;
    where.applicationDate = {};
    if (lower) where.applicationDate.gte = lower;
    if (upper) where.applicationDate.lte = upper;
  }
  return where;
}

function todayAsDate() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function notFound(error) {
  return error?.code === 'P2025';
}

export function createJobApplicationsService(prisma) {
  return {
    async create(data) {
      const createData = { ...data };
      if (createData.status === 'APPLIED' && !Object.hasOwn(createData, 'applicationDate')) {
        createData.applicationDate = todayAsDate();
      }
      return prisma.jobApplication.create({ data: createData });
    },

    async list(filters) {
      const where = buildWhere(filters);
      const [items, total] = await Promise.all([
        prisma.jobApplication.findMany({
          where,
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.jobApplication.count({ where }),
      ]);
      return {
        items,
        pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
      };
    },

    async getById(id) {
      const application = await prisma.jobApplication.findUnique({ where: { id } });
      if (!application) throw new HttpError(404, 'Job application not found.');
      return application;
    },

    async update(id, data) {
      try {
        const existing = await prisma.jobApplication.findUnique({ where: { id } });
        if (!existing) throw new HttpError(404, 'Job application not found.');
        const updateData = { ...data };
        if (Object.hasOwn(updateData, 'status') && existing.status === 'SAVED' && updateData.status === 'APPLIED' && existing.applicationDate === null && !Object.hasOwn(updateData, 'applicationDate')) {
          updateData.applicationDate = todayAsDate();
        }
        return await prisma.jobApplication.update({ where: { id }, data: updateData });
      } catch (error) {
        if (notFound(error)) throw new HttpError(404, 'Job application not found.');
        throw error;
      }
    },

    async remove(id) {
      try {
        await prisma.jobApplication.delete({ where: { id } });
        return { id, deleted: true };
      } catch (error) {
        if (notFound(error)) throw new HttpError(404, 'Job application not found.');
        throw error;
      }
    },

    async stats({ date }) {
      const [total, submitted, grouped, saved, submittedOnDate] = await Promise.all([
        prisma.jobApplication.count(),
        prisma.jobApplication.count({ where: { status: { in: SUBMITTED_STATUSES } } }),
        prisma.jobApplication.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.jobApplication.count({ where: { status: 'SAVED' } }),
        date
          ? prisma.jobApplication.count({ where: { status: { in: SUBMITTED_STATUSES }, applicationDate: date } })
          : Promise.resolve(undefined),
      ]);
      const byStatus = Object.fromEntries(grouped.map((entry) => [entry.status, entry._count._all]));
      const result = { total, submitted, saved, byStatus, target: 100 };
      if (date) result.submittedOnDate = { date: date.toISOString().slice(0, 10), count: submittedOnDate };
      return result;
    },
  };
}
