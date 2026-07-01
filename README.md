# Clinic Management SaaS

A multi-tenant B2B SaaS platform for managing clinics, appointments, patient electronic medical records (EMR-lite), and invoicing. Built using **React + TypeScript + Vite** for the frontend and **Supabase** for backend services (Database, Authentication, Storage, and Edge Functions).

---

## 📁 Repository Structure

```
├── docs/                     # Product specs and technical designs
│   └── SPEC.md               # Master Technical Specification
├── backend/                  # Backend configurations & helpers
│   ├── create_admin.sql      # SQL script to create admin user
│   ├── create_users.js       # Node script to create admin/doctor/staff users
│   └── supabase/             # Supabase configuration & database migrations
│       ├── config.toml       # Supabase local config
│       ├── migrations/       # PostgreSQL schema migrations
│       └── seed.sql          # Database seed data for local development
└── frontend/                 # React frontend application
    ├── src/
    │   ├── components/       # Reusable components
    │   ├── context/          # React contexts (Auth, Theme, etc.)
    │   ├── lib/              # Client utilities (e.g. supabaseClient.ts)
    │   ├── pages/            # Page/dashboard views (Admin, Doctor, Staff, Patient)
    │   └── main.tsx          # App entrypoint
    ├── package.json          # Frontend dependencies and scripts
    └── vite.config.ts        # Vite configuration
```

---

## 🛠️ Getting Started & Commands

You can run both frontend and backend management commands directly from the root folder of this project.

### Frontend Commands

* **Install all dependencies:**
  ```bash
  npm run install:all
  ```
* **Start local development server:**
  ```bash
  npm run dev
  ```
* **Start both local Supabase and frontend concurrently:**
  ```bash
  npm run dev:all
  ```
* **Build the frontend application:**
  ```bash
  npm run build
  ```
* **Lint the frontend application:**
  ```bash
  npm run lint
  ```
* **Run automated tests:**
  ```bash
  npm run test
  ```

### Supabase (Backend) Commands

All database management can be done using the Supabase local CLI via the root shortcuts:

* **Start local Supabase services (Docker required):**
  ```bash
  npm run supabase:start
  ```
* **Stop local Supabase services:**
  ```bash
  npm run supabase:stop
  ```
* **Check local Supabase status:**
  ```bash
  npm run supabase:status
  ```
* **Link to your remote Supabase project:**
  ```bash
  npm run supabase:link
  ```
* **Pull latest schema changes from remote Supabase:**
  ```bash
  npm run supabase:pull
  ```
* **Push local migrations to remote Supabase:**
  ```bash
  npm run supabase:push
  ```
* **Create a new database migration file:**
  ```bash
  npm run supabase:migration <migration_name>
  ```
* **Reset the local database to the latest migrations and seed data:**
  ```bash
  npm run supabase:reset
  ```

---

## 🔐 Environment Variables

Make sure to create `.env.local` files in both the **root** folder and the **`frontend/`** folder containing:
```env
# Supabase Project Configurations
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_DB_PASSWORD=<your-db-password>

# Frontend-specific Environment Variables
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
