-- ============================================================
-- SMART TIMETABLE PORTAL - Complete Schema
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,
  building TEXT,
  floor TEXT,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROFESSORS
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  email TEXT UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  class TEXT NOT NULL,
  batch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_no);
CREATE INDEX IF NOT EXISTS idx_students_dept_sem ON students(department_id, semester, class, batch);

-- TIMETABLES
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  class TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT 'ALL',
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'lecture' CHECK (entry_type IN ('lecture','break','free','lab')),
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  effective_from DATE,
  effective_to DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_timetables_dept_sem ON timetables(department_id, semester, class, batch, day);
CREATE INDEX IF NOT EXISTS idx_timetables_status ON timetables(status);

-- SPECIAL EVENTS
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'seminar','workshop','extra_lecture','exam','emergency',
    'room_change','professor_change','time_change','cancellation',
    'announcement','holiday','other'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  event_date DATE,
  start_time TIME,
  end_time TIME,
  target_all BOOLEAN NOT NULL DEFAULT false,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  semester INTEGER CHECK (semester >= 1 AND semester <= 8),
  class TEXT,
  batch TEXT,
  timetable_id UUID REFERENCES timetables(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  old_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  new_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  old_professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  new_professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  old_start_time TIME,
  new_start_time TIME,
  old_end_time TIME,
  new_end_time TIME,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON special_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_dept ON special_events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON special_events(status);

-- TIMETABLE OVERRIDES
CREATE TABLE IF NOT EXISTS timetable_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN (
    'room_change','professor_change','time_change','cancellation','extra_lecture'
  )),
  new_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  new_professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  new_start_time TIME,
  new_end_time TIME,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overrides_date ON timetable_overrides(override_date);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ADMIN PROFILES
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_departments_updated_at') THEN
    CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rooms_updated_at') THEN
    CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_professors_updated_at') THEN
    CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subjects_updated_at') THEN
    CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_students_updated_at') THEN
    CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timetables_updated_at') THEN
    CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
    CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON special_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_overrides_updated_at') THEN
    CREATE TRIGGER update_overrides_updated_at BEFORE UPDATE ON timetable_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Public read policies (drop first so re-runs don't error)
DROP POLICY IF EXISTS "public_read_departments" ON departments;
DROP POLICY IF EXISTS "public_read_rooms" ON rooms;
DROP POLICY IF EXISTS "public_read_professors" ON professors;
DROP POLICY IF EXISTS "public_read_subjects" ON subjects;
DROP POLICY IF EXISTS "public_read_students" ON students;
DROP POLICY IF EXISTS "public_read_timetables" ON timetables;
DROP POLICY IF EXISTS "public_read_events" ON special_events;
DROP POLICY IF EXISTS "public_read_overrides" ON timetable_overrides;

CREATE POLICY "public_read_departments" ON departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_rooms" ON rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_professors" ON professors FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "public_read_subjects" ON subjects FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "public_read_students" ON students FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "public_read_timetables" ON timetables FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "public_read_events" ON special_events FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "public_read_overrides" ON timetable_overrides FOR SELECT TO anon, authenticated USING (true);

-- Admin write policies
DROP POLICY IF EXISTS "admin_write_departments" ON departments;
DROP POLICY IF EXISTS "admin_write_rooms" ON rooms;
DROP POLICY IF EXISTS "admin_write_professors" ON professors;
DROP POLICY IF EXISTS "admin_write_subjects" ON subjects;
DROP POLICY IF EXISTS "admin_write_students" ON students;
DROP POLICY IF EXISTS "admin_write_timetables" ON timetables;
DROP POLICY IF EXISTS "admin_write_events" ON special_events;
DROP POLICY IF EXISTS "admin_write_overrides" ON timetable_overrides;
DROP POLICY IF EXISTS "admin_audit_read" ON audit_logs;
DROP POLICY IF EXISTS "admin_audit_insert" ON audit_logs;
DROP POLICY IF EXISTS "admin_profiles_select" ON admin_profiles;
DROP POLICY IF EXISTS "admin_profiles_write" ON admin_profiles;

CREATE POLICY "admin_write_departments" ON departments FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_rooms" ON rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_professors" ON professors FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_subjects" ON subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_students" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_timetables" ON timetables FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_events" ON special_events FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_write_overrides" ON timetable_overrides FOR ALL TO authenticated USING (true);
CREATE POLICY "admin_audit_read" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_profiles_select" ON admin_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_profiles_write" ON admin_profiles FOR ALL TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE timetables;
ALTER PUBLICATION supabase_realtime ADD TABLE special_events;
ALTER PUBLICATION supabase_realtime ADD TABLE timetable_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
