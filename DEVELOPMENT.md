# Team-Orbit Development Setup Guide

## Prerequisites

- **Node.js** v18 or higher (v24.15.0 installed ✓)
- **pnpm** package manager (installed ✓)
- **PostgreSQL** database
- **Clerk** account for authentication

## Quick Setup Steps

### 1. Install Dependencies ✓
```bash
pnpm install
```

### 2. Set Up Environment Variables

#### Backend (.env in `artifacts/api-server/`)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/nexus
CLERK_SECRET_KEY=your_secret_key
CLERK_PUBLISHABLE_KEY=your_publishable_key
NODE_ENV=development
```

#### Frontend (.env in `artifacts/nexus/`)
```
PORT=5173
BASE_PATH=/
VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key
VITE_CLERK_PROXY_URL=http://localhost:3001/clerk
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Configure Clerk Authentication

1. Go to https://dashboard.clerk.com
2. Create a new application or use existing one
3. Copy your publishable and secret keys
4. Add `http://localhost:3001` and `http://localhost:5173` to allowed origins
5. Paste keys in your `.env` files

### 4. Set Up PostgreSQL Database

```bash
# Create database
createdb nexus

# Run migrations
pnpm -F @workspace/db push
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd artifacts/api-server
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd artifacts/nexus
pnpm dev
```

### 6. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

## Project Structure

```
Team-Orbit/
├── artifacts/
│   ├── api-server/        # Express backend
│   ├── nexus/             # React Vite frontend
│   └── mockup-sandbox/    # Component preview
├── lib/
│   ├── api-client-react/  # React API client
│   ├── api-spec/          # OpenAPI specification
│   ├── api-zod/           # Zod schemas
│   └── db/                # Database & Drizzle ORM
└── scripts/               # Build & utility scripts
```

## Available Commands

```bash
# Root level
pnpm install              # Install all dependencies
pnpm build               # Build all packages
pnpm typecheck           # Type check all packages

# Backend
pnpm -F @workspace/api-server dev      # Start backend dev server
pnpm -F @workspace/api-server build    # Build backend

# Frontend
pnpm -F @workspace/nexus dev           # Start frontend dev server
pnpm -F @workspace/nexus build         # Build frontend

# Database
pnpm -F @workspace/db push             # Push schema to database
pnpm -F @workspace/db push --force     # Force push schema
```

## Troubleshooting

### TypeScript Errors
- Some frontend components have type mismatches that need fixing
- Run `pnpm typecheck` to see all errors

### Missing Environment Variables
- Copy `.env.example` to `.env` in each service
- Fill in actual values for Clerk keys and database URL

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists

### Port Already in Use
- Change PORT in `.env` files
- Or kill existing processes on those ports

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, shadcn UI
- **Backend**: Express 5, Node.js
- **Database**: PostgreSQL, Drizzle ORM
- **Auth**: Clerk
- **Package Manager**: pnpm (monorepo)
- **Type Safety**: TypeScript, Zod

## Next Steps

1. Set up PostgreSQL and Clerk
2. Copy `.env.example` to `.env` in both services
3. Fill in your Clerk API keys and database URL
4. Run `pnpm install` (if not done)
5. Start the backend and frontend in separate terminals
6. Open http://localhost:5173 in your browser

---
**Happy coding! 🚀**
