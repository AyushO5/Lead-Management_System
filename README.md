# Lead Management Platform

A full-stack lead management system for teams to capture, assign, track, and collaborate on sales leads.

Built with **Next.js + React + TypeScript** on the frontend and **Express + Prisma + PostgreSQL** on the backend.

## Highlights

- JWT authentication with role-aware authorization (`ADMIN` / `MEMBER`)
- Server-side lead filtering, search, pagination, and assignment
- Activity timeline for lead creation, assignment, status changes, and notes
- Transactional writes for lead changes and activity history
- Runtime request validation with Zod
- Password hashing with bcrypt
- Timing-safe login behavior for unknown users
- Restricted CORS and HTTP security headers
- Role-aware server-side dashboard statistics
- Automated integration tests with Vitest + Supertest
- GitHub Actions CI with PostgreSQL
- Production Dockerfiles for frontend and backend
- Docker Compose stack for PostgreSQL + API + web app
- Prisma migrations for reproducible database setup

## Architecture

```text
Browser
   │
   ▼
Next.js frontend :3000
   │
   │ HTTP + Bearer JWT
   ▼
Express API :5000
   │
   ├── Authentication / Authorization
   ├── Zod validation
   ├── Lead management
   ├── Notes + activity history
   └── Dashboard statistics
   │
   ▼
Prisma ORM
   │
   ▼
PostgreSQL :5432
```

The backend is the source of truth for authentication, authorization, validation, and data access. Frontend route protection is treated as a UX layer rather than a security boundary.

## Core flows

### Public lead capture

1. A visitor submits the public lead form.
2. The API validates the payload with Zod.
3. The lead and `LEAD_CREATED` activity are written transactionally.
4. The dashboard can then surface the new lead.

### Lead assignment

1. An admin selects a member.
2. The API validates the request body.
3. The API verifies that the target user exists and has the `MEMBER` role.
4. The lead update and `LEAD_ASSIGNED` activity are committed in one transaction.

### Lead status changes

1. An authorized user submits a status update.
2. The API validates and normalizes the update.
3. The lead update and `STATUS_CHANGED` activity are committed atomically.
4. The activity timeline records the old and new status values.

## Security design

- Passwords are never stored directly. bcrypt hashes are stored instead.
- Login performs a dummy bcrypt comparison when an email does not exist, reducing observable timing differences for user enumeration.
- JWT signatures are verified and JWT claims are validated at runtime before `req.user` is populated.
- JWT roles are restricted to `ADMIN` and `MEMBER`.
- Admin-only operations are enforced by backend middleware.
- Member lead access is scoped to the authenticated member.
- User responses use explicit safe selects so password hashes are not returned.
- JSON request bodies are capped at 100 KB.
- CORS is restricted to the configured frontend origin.
- Common browser security headers are applied and Express fingerprinting is disabled.

## Testing

The backend test suite uses a dedicated PostgreSQL database and includes authentication, authorization, lead workflows, notes, and core activity behavior.

Run locally:

```bash
cd server
npm ci
npm test
```

Tests expect `TEST_DATABASE_URL` to point to a dedicated local database named `lead_management_test` on port `5433`. The test setup includes safety checks before applying migrations.

## Local development

### Backend

```bash
cd server
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env.local
npm ci
npm run dev
```

The default development URLs are:

- Frontend: `http://localhost:3000`
- API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Docker

The repository includes production-oriented containers and a Compose stack.

Set a JWT secret, then run:

```bash
JWT_SECRET="replace-with-a-long-random-secret" docker compose up --build
```

Open:

- Web app: `http://localhost:3000`
- API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

The API container applies committed Prisma migrations before starting the server. PostgreSQL data is persisted in the `postgres_data` volume.

For a real deployment, use a managed PostgreSQL instance and provide production secrets through the hosting platform rather than committing environment files.

## Project structure

```text
Lead-Management_System/
├── client/                 # Next.js frontend
│   ├── src/app/             # App Router pages
│   ├── src/components/      # Shared UI components
│   ├── src/context/         # Auth state
│   ├── src/lib/             # API client
│   └── src/types/           # Shared frontend types
│
├── server/                 # Express backend
│   ├── src/features/        # Feature-based modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── notes/
│   │   ├── public/
│   │   └── users/
│   ├── src/middleware/      # Auth, roles, and errors
│   ├── prisma/              # Schema, migrations, and seed
│   └── tests/               # Integration tests
│
├── .github/workflows/       # CI automation
├── docker-compose.yml       # Local production-like stack
└── README.md
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | JWT |
| Password hashing | bcrypt |
| Testing | Vitest, Supertest |
| CI | GitHub Actions |
| Containers | Docker, Docker Compose |

## Engineering decisions

### Transactional activity history

Lead state changes are committed together with their corresponding activity record. This prevents the system from recording an activity that does not match the persisted lead state.

### Server-side dashboard aggregation

Dashboard statistics are calculated by the API instead of downloading a large lead collection to the browser. This keeps authorization and aggregation on the server and gives the frontend a small purpose-built response.

### Feature-based backend organization

Authentication, leads, notes, users, public capture, and dashboard functionality are separated into feature modules containing routes, controllers, schemas, and services. This keeps business logic away from transport concerns and makes future changes easier to isolate.

## CI

Every push to `main` and pull request targeting `main` runs:

1. Backend dependency installation
2. Backend TypeScript build
3. PostgreSQL-backed integration tests
4. Frontend dependency installation
5. Production frontend build

## License

ISC
