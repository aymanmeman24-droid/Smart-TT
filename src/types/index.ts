// ============================================================
// SMART TIMETABLE PORTAL - TypeScript Types
// ============================================================

export interface Department {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  building?: string;
  floor?: string;
  capacity?: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Professor {
  id: string;
  name: string;
  department_id?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  department_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export interface Student {
  id: string;
  enrollment_no: string;
  name: string;
  department_id?: string;
  semester: number;
  class: string;
  batch: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export type TimetableStatus = 'draft' | 'published' | 'archived';
export type EntryType = 'lecture' | 'break' | 'free' | 'lab';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimetableEntry {
  id: string;
  department_id: string;
  semester: number;
  class: string;
  batch: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  entry_type: EntryType;
  subject_id?: string;
  professor_id?: string;
  room_id?: string;
  status: TimetableStatus;
  effective_from?: string;
  effective_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  departments?: Department;
  subjects?: Subject;
  professors?: Professor;
  rooms?: Room;
}

export type EventType =
  | 'seminar'
  | 'workshop'
  | 'extra_lecture'
  | 'exam'
  | 'emergency'
  | 'room_change'
  | 'professor_change'
  | 'time_change'
  | 'cancellation'
  | 'announcement'
  | 'holiday'
  | 'other';

export type EventPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventStatus = 'active' | 'resolved' | 'cancelled';

export interface SpecialEvent {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  priority: EventPriority;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  target_all: boolean;
  department_id?: string;
  semester?: number;
  class?: string;
  batch?: string;
  timetable_id?: string;
  subject_id?: string;
  old_room_id?: string;
  new_room_id?: string;
  old_professor_id?: string;
  new_professor_id?: string;
  old_start_time?: string;
  new_start_time?: string;
  old_end_time?: string;
  new_end_time?: string;
  room_id?: string;
  professor_id?: string;
  status: EventStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  departments?: Department;
  subjects?: Subject;
  professors?: Professor;
  rooms?: Room;
  old_rooms?: Room;
  new_rooms?: Room;
  old_professors?: Professor;
  new_professors?: Professor;
}

export interface TimetableOverride {
  id: string;
  timetable_id: string;
  override_date: string;
  override_type: 'room_change' | 'professor_change' | 'time_change' | 'cancellation' | 'extra_lecture';
  new_room_id?: string;
  new_professor_id?: string;
  new_start_time?: string;
  new_end_time?: string;
  is_cancelled: boolean;
  reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  rooms?: Room;
  professors?: Professor;
}

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by?: string;
  performed_at: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

// ============================================================
// Composite types for student view
// ============================================================

export interface StudentProfile {
  student: Student;
  department: Department;
}

export interface EnrichedTimetableEntry extends TimetableEntry {
  override?: TimetableOverride;
  isCurrentLecture?: boolean;
  isNextLecture?: boolean;
}

export interface StudentDashboardData {
  student: Student;
  department: Department;
  todayEntries: EnrichedTimetableEntry[];
  weeklyEntries: Record<DayOfWeek, EnrichedTimetableEntry[]>;
  currentEntry: EnrichedTimetableEntry | null;
  nextEntry: EnrichedTimetableEntry | null;
  relevantEvents: SpecialEvent[];
}

// CSV import types
export interface StudentCSVRow {
  enrollment_no: string;
  name: string;
  department: string;
  semester: string;
  class: string;
  batch: string;
}

export interface TimetableCSVRow {
  department: string;
  semester: string;
  class: string;
  batch: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  professor: string;
  room: string;
}

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
}

export interface TimetableConflict {
  type: 'batch_overlap' | 'professor_conflict' | 'room_conflict';
  message: string;
  entries: Partial<TimetableEntry>[];
}
