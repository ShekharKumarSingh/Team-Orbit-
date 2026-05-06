# Team-Orbit- | Nexus

## Nexus — Team Task Manager

**Nexus** is a full-stack collaborative project and task management web app built for teams. It gives teams a single, focused place to organize their work without switching between multiple tools.

---

## Features

### 📋 Projects
- Create projects with custom colors
- Set project statuses (Active, Completed, Archived)
- Manage everything in one centralized place

### 🎯 Kanban Board
- Visual board with four columns: **To Do**, **In Progress**, **In Review**, and **Done**
- Drag-and-drop tasks between columns to instantly update their status
- Real-time board updates for all team members

### ✅ Tasks
- Create tasks with:
  - Title and detailed description
  - Priority levels (Low, Medium, High, Urgent)
  - Due dates
  - Task assignees
- Each task has its own detail panel with a comment thread
- Task history and activity tracking

### 👥 Team Members
- Invite teammates to projects by email
- If they already have an account, they're added immediately
- If not, a pending invite is stored and they're automatically added when they sign up
- Team collaboration made seamless

### 🔐 Role-Based Access
- **Admin Role**: Manage members, change roles, update project settings, delete projects
- **Member Role**: Create and manage tasks

### 📊 Dashboard
- Personal home screen with:
  - Key statistics (active tasks, overdue items, completion rate)
  - Recent activity feed of all actions across your projects
  - List of overdue tasks needing attention

### 📝 My Tasks
- Cross-project view of every task assigned to you
- Filterable by status and priority
- Stay on top of your workload

### 📈 Activity Log
- Every action is recorded:
  - Task created
  - Member added
  - Status changed
  - Comments added
- Full transparency and audit trail

### 🔑 Authentication
- Full sign-up and sign-in powered by **Clerk**
- Branded landing page for visitors who aren't logged in yet
- Secure and frictionless authentication

---

## Tech Stack

### Frontend
- **React** + **Vite** for fast development and optimized builds
- Component-based UI architecture

### Backend
- **Express** API server for RESTful endpoints
- OpenAPI/Swagger documentation

### Database
- **PostgreSQL** for reliable data persistence
- **Drizzle ORM** for type-safe database operations

### Authentication
- **Clerk** for secure user authentication and management

### Project Structure
- **pnpm monorepo** for unified dependency management
- Organized workspace with shared libraries and utilities

---

## Project Structure

```
Team-Orbit/
├── artifacts/
│   ├── api-server/           # Express backend server
│   ├── mockup-sandbox/       # UI component sandbox
│   └── nexus/                # Main React frontend app
├── lib/
│   ├── api-client-react/     # React API client library
│   ├── api-spec/             # OpenAPI specification
│   ├── api-zod/              # Zod schemas for API
│   └── db/                   # Database schema & migrations
├── scripts/                  # Utility scripts
├── pnpm-workspace.yaml       # Monorepo configuration
└── package.json              # Root package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShekharKumarSingh/Team-Orbit-.git
   cd Team-Orbit-
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   - Create `.env` files in `api-server` and `nexus` directories with required configurations:
     - Database connection string
     - Clerk API keys
     - API endpoints

4. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Start the backend
   pnpm -F api-server dev

   # Terminal 2: Start the frontend
   pnpm -F nexus dev
   ```

---

## Usage

1. **Sign Up**: Create an account via the Clerk authentication
2. **Create a Project**: Set a name, description, and custom color
3. **Add Team Members**: Invite teammates via email
4. **Create Tasks**: Add tasks to your project with priorities and due dates
5. **Organize with Kanban**: Drag tasks across the board to manage workflow
6. **Track Progress**: Check your dashboard for stats and activity

---

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

---

## License

This project is open source and available under the MIT License.

---

## Contact

For questions or support, reach out to the Team-Orbit team or visit our GitHub repository.

**GitHub Repository**: [Team-Orbit-](https://github.com/ShekharKumarSingh/Team-Orbit-)

---

**Built with ❤️ by the Team-Orbit team**
