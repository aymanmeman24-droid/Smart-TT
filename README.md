# ShalaSync — GEC Palanpur

**ShalaSync** is a real-time timetable and campus update portal for Government Engineering College, Palanpur.

- *Shala* = School (Gujarati)
- *Sync* = Real-time synchronization

## Features

- 📅 Personalized timetable by enrollment number
- ⚡ Live room changes and lecture updates
- 🔔 Real-time announcements via admin portal
- 📱 Mobile-first, works on any device
- 🔄 Admin → Student sync via Supabase Realtime
- 🏫 All 4 departments: Civil, Mechanical, Electrical, Computer Engineering

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Database**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **Styling**: Vanilla CSS with custom design system

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Admin Portal

Go to `/admin/login` and sign in with your Supabase admin credentials.

## Database Setup

Run migrations in order in Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_data.sql`
3. `supabase/migrations/003_full_timetable_all_depts.sql`

## Test Enrollments

| Enrollment | Department |
|------------|------------|
| `240010101001` | Computer Engineering |
| `240010201001` | Civil Engineering |
| `240010301001` | Mechanical Engineering |
| `240010401001` | Electrical Engineering |
