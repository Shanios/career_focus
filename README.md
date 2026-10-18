# Career Focus — Job Search & Learning Tracker

A React, Express, PostgreSQL and Prisma application for tracking a job-search and learning sprint. Available modules include Coding Tracker, Job Applications, Python Learning, Communication Practice, Daily Progress and Journal.

The interface is styled with responsive project CSS; Tailwind is not a project dependency or styling framework in this repository.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+
- PostgreSQL

## Setup

Install dependencies from the repository root with `npm install`. Configure `VITE_API_BASE_URL` in `frontend/.env` if the API is not at `http://localhost:5000/api`. Configure `DATABASE_URL` and backend settings in `backend/.env`; keep credentials out of frontend configuration and source control.

Run both development servers with `npm run dev`, or run `npm run dev:frontend` and `npm run dev:backend` separately. The frontend defaults to <http://localhost:5173> and the backend to <http://localhost:5000>.

For database changes, work from `backend/`: validate the schema with `npx prisma validate`, generate the client with `npx prisma generate`, then apply reviewed additive migrations with `npx prisma migrate dev`.

## Modules

- Dashboard: live module totals, recent activity, and daily progress against configured targets.
- Coding Tracker, Job Applications, Python Learning, Communication Practice: persisted records with module-specific filters and pagination.
- Daily Progress: selected-day aggregates and editable goals; goals do not create activity records.
- Journal: dated text entries with optional mood and tags, search, date filters and pagination. Journal content is stored in PostgreSQL. The application currently has no user authentication or access controls, so it should not be treated as private from other people who can access the app or database.

Backend tests use Node's test runner. Run serially with `npm test -- --test-concurrency=1` to limit memory usage. The frontend production build is `npm run build --workspace frontend`.
