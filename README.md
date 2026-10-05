# 🎓 GEC Palanpur — Smart Timetable Portal

> **Government Engineering College, Palanpur** | Smart Timetable & Live Campus Schedule Portal
> 
> *Personalized timetable · Live room changes · Realtime campus updates*

---

## 🚀 What It Does

A **complete, production-style** college timetable management portal built for the **Hackathon**:

| Feature | Description |
|---------|-------------|
| 🎓 **Student Portal** | Enter enrollment number → Instant personalized timetable |
| ⚡ **Live Updates** | Admin changes flow to student devices via Supabase Realtime |
| 📅 **Current Lecture** | Shows exactly what class is happening NOW with a live progress bar |
| 🔁 **Timetable Overrides** | Temporary room/professor/time changes without modifying the base timetable |
| 🔐 **Admin Portal** | Secure login, full CRUD for all entities, CSV import |
| 📱 **PWA** | Installable on Android/iOS, works offline |
| 🌐 **Mobile-First** | Designed for students using phones between lectures |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (admin only — students need no account)
- **Realtime**: Supabase Realtime subscriptions
- **Icons**: Lucide React
- **Hosting**: Vercel-ready

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (enrollment entry)
│   ├── student/[enrollment]/       # Student dashboard
│   ├── admin/
│   │   ├── dashboard/              # Admin overview
│   │   ├── students/               # Student CRUD + CSV import
│   │   ├── professors/             # Professor management
│   │   ├── departments/            # Department management
│   │   ├── subjects/               # Subject management
│   │   ├── rooms/                  # Room management
│   │   ├── timetable/              # Timetable editor
│   │   ├── updates/                # Live updates (room changes, cancellations)
│   │   └── events/                 # Special events & announcements
│   └── api/student/[enrollment]/   # Student lookup API
├── components/admin/AdminSidebar.tsx
├── lib/
│   ├── supabase/                   # Client, server, middleware
│   └── timetable/utils.ts          # Core timetable logic
└── types/index.ts                  # All TypeScript interfaces

supabase/
├── migrations/001_initial_schema.sql
└── migrations/002_seed_data.sql
```

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd smart-timetable
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **anon key** from Settings → API
3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database

Run the SQL files in the Supabase SQL Editor in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_data.sql
```

### 4. Create Admin User

Go to: **Supabase Dashboard → Auth → Users → Add User**

```
Email: admin@gecpalanpur.ac.in
Password: YourSecurePassword123
```

### 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🎯 Demo Flow (Hackathon Presentation)

**Step 1:** Open `http://localhost:3000` — Enter any student enrollment number from the seed data  
**Step 2:** See the personalized timetable with current + next lecture  
**Step 3:** Open `http://localhost:3000/admin/login` in another window  
**Step 4:** Login with admin credentials  
**Step 5:** Go to **Live Updates** → Create a Room Change for any subject  
**Step 6:** Watch the student's screen receive the update in real-time ⚡

### Demo Enrollment Numbers (from seed data)
| Enrollment | Name | Dept | Sem | Batch |
|-----------|------|------|-----|-------|
| `220130107069` | Sample Student | CE | 3 | CP2 |

*(Check the seed SQL file for all demo students)*

---

## 📱 Student Experience

```
Enter Enrollment Number
        ↓
Identify: Name, Dept, Sem, Class, Batch
        ↓
Load: Timetable + Today's Overrides + Events
        ↓
Show: Current Lecture (with live progress bar)
      Next Lecture
      Today's Schedule (timeline)
      Live Updates
      Weekly Timetable
```

---

## 🔐 Security

- **Row Level Security (RLS)** enabled on all tables
- Students can only **read** published data — no write access
- Admin operations require **authenticated Supabase session**
- **No service-role key** exposed in frontend code
- All secrets in environment variables

---

## 🌐 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `students` | Student profiles (enrollment, dept, sem, batch) |
| `departments` | Department master data |
| `professors` | Professor profiles |
| `subjects` | Subject catalog |
| `rooms` | Room inventory |
| `timetables` | Weekly timetable entries (DRAFT / PUBLISHED) |
| `timetable_overrides` | Temporary one-day changes |
| `special_events` | Seminars, cancellations, announcements |
| `audit_logs` | Change history |
| `admin_profiles` | Admin user metadata |

---

## 🏛️ About

Built for **AyuHack 2026** by the Smart Timetable team.

**College:** Government Engineering College, Palanpur (ESTD: 2009)  
**Motto:** *अभियान्त्रिकीज्ञानम् जनकल्याणम्*  
*(Engineering knowledge for public welfare)*

---

*Star ⭐ if you find this useful!*
