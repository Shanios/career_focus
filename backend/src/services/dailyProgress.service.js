import { SUBMITTED_STATUSES } from './jobApplications.service.js';

export const DEFAULT_DAILY_TARGETS = Object.freeze({
  jobApplications: 2,
  dsaQuestions: 2,
  interviewQuestions: 1,
  pythonLessons: 1,
  communicationSessions: 1,
});

function targetsData() {
  return { ...DEFAULT_DAILY_TARGETS };
}

function progressMetric(actual, target, available = true) {
  if (!available) return { actual: null, target, progressPercent: null, remaining: null, available: false };
  const progressPercent = target === 0 ? (actual > 0 ? 100 : 0) : Math.min(100, Math.round(actual * 100 / target));
  return { actual, target, progressPercent, remaining: Math.max(target - actual, 0), available: true };
}

export function createDailyProgressService(prisma) {
  async function readTargets() {
    const row = await prisma.dailyTargetSettings.upsert({
      where: { id: 'daily' },
      create: { id: 'daily', ...targetsData() },
      update: {},
    });
    const { id, createdAt, updatedAt, ...targets } = row;
    return targets;
  }

  return {
    async getTargets() { return readTargets(); },
    async updateTargets(data) {
      const row = await prisma.dailyTargetSettings.upsert({
        where: { id: 'daily' },
        create: { id: 'daily', ...targetsData(), ...data },
        update: data,
      });
      const { id, createdAt, updatedAt, ...targets } = row;
      return targets;
    },
    async getProgress(date) {
      const targets = await readTargets();
      const sources = await Promise.allSettled([
        prisma.jobApplication.count({ where: { status: { in: SUBMITTED_STATUSES }, applicationDate: date } }),
        prisma.codingQuestion.count({ where: { type: 'DSA', date } }),
        prisma.codingQuestion.count({ where: { type: 'INTERVIEW', date } }),
        prisma.pythonLearningEntry.count({ where: { completed: true, practiceDate: date } }),
        prisma.communicationPractice.count({ where: { completed: true, practiceDate: date } }),
      ]);
      const keys = ['jobApplications', 'dsaQuestions', 'interviewQuestions', 'pythonLessons', 'communicationSessions'];
      const metrics = Object.fromEntries(keys.map((key, index) => {
        const result = sources[index];
        return [key, progressMetric(result.status === 'fulfilled' ? result.value : null, targets[key], result.status === 'fulfilled')];
      }));
      const available = Object.values(metrics).every((metric) => metric.available);
      const totalCompletedActivities = available ? Object.values(metrics).reduce((sum, metric) => sum + metric.actual, 0) : null;
      const outstandingTargets = available ? Object.values(metrics).reduce((sum, metric) => sum + metric.remaining, 0) : null;
      return {
        date: date.toISOString().slice(0, 10),
        targets,
        metrics,
        complete: available,
        totalCompletedActivities,
        outstandingTargets,
      };
    },
  };
}
