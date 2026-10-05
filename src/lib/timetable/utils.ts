import { type DayOfWeek, type EnrichedTimetableEntry, type TimetableEntry, type TimetableOverride } from '@/types';
import { format, parseISO, isToday } from 'date-fns';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getRemainingMinutes(endTime: string): number {
  const endMinutes = timeToMinutes(endTime);
  const currentMinutes = getCurrentTimeMinutes();
  return Math.max(0, endMinutes - currentMinutes);
}

export function getMinutesUntilStart(startTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const currentMinutes = getCurrentTimeMinutes();
  return Math.max(0, startMinutes - currentMinutes);
}

export function isCurrentEntry(entry: TimetableEntry, overrides?: TimetableOverride[]): boolean {
  if (entry.entry_type === 'break' || entry.entry_type === 'free') return false;
  
  const override = overrides?.find(o => o.timetable_id === entry.id);
  if (override?.is_cancelled) return false;

  const currentMinutes = getCurrentTimeMinutes();
  const startMinutes = timeToMinutes(override?.new_start_time || entry.start_time);
  const endMinutes = timeToMinutes(override?.new_end_time || entry.end_time);
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function findCurrentEntry(
  entries: TimetableEntry[],
  overrides?: TimetableOverride[]
): EnrichedTimetableEntry | null {
  const currentMinutes = getCurrentTimeMinutes();
  
  for (const entry of entries) {
    const override = overrides?.find(o => o.timetable_id === entry.id);
    if (override?.is_cancelled) continue;
    if (entry.entry_type === 'break' || entry.entry_type === 'free') continue;
    
    const startMinutes = timeToMinutes(override?.new_start_time || entry.start_time);
    const endMinutes = timeToMinutes(override?.new_end_time || entry.end_time);
    
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return { ...entry, override, isCurrentLecture: true };
    }
  }
  return null;
}

export function findNextEntry(
  entries: TimetableEntry[],
  overrides?: TimetableOverride[]
): EnrichedTimetableEntry | null {
  const currentMinutes = getCurrentTimeMinutes();
  
  const futureEntries = entries
    .filter(entry => {
      if (entry.entry_type === 'break' || entry.entry_type === 'free') return false;
      const override = overrides?.find(o => o.timetable_id === entry.id);
      if (override?.is_cancelled) return false;
      const startMinutes = timeToMinutes(override?.new_start_time || entry.start_time);
      return startMinutes > currentMinutes;
    })
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  
  if (futureEntries.length === 0) return null;
  
  const next = futureEntries[0];
  const override = overrides?.find(o => o.timetable_id === next.id);
  return { ...next, override, isNextLecture: true };
}

export function enrichEntries(
  entries: TimetableEntry[],
  overrides?: TimetableOverride[]
): EnrichedTimetableEntry[] {
  const sortedEntries = [...entries].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  
  const currentMinutes = getCurrentTimeMinutes();
  let foundCurrent = false;
  let foundNext = false;
  
  return sortedEntries.map(entry => {
    const override = overrides?.find(o => o.timetable_id === entry.id);
    const startMinutes = timeToMinutes(override?.new_start_time || entry.start_time);
    const endMinutes = timeToMinutes(override?.new_end_time || entry.end_time);
    
    let isCurrentLecture = false;
    let isNextLecture = false;
    
    if (
      !foundCurrent &&
      entry.entry_type !== 'break' &&
      entry.entry_type !== 'free' &&
      !override?.is_cancelled &&
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    ) {
      isCurrentLecture = true;
      foundCurrent = true;
    } else if (
      !foundNext &&
      !foundCurrent === false &&
      entry.entry_type !== 'break' &&
      entry.entry_type !== 'free' &&
      !override?.is_cancelled &&
      startMinutes > currentMinutes
    ) {
      // We'll mark next after we process current
    }
    
    return { ...entry, override, isCurrentLecture };
  }).map((entry, _, arr) => {
    // Find next after current
    const currentIdx = arr.findIndex(e => e.isCurrentLecture);
    let isNextLecture = false;
    
    if (currentIdx >= 0) {
      // Next is first non-break after current
      const idx = arr.indexOf(entry);
      if (!foundNext && idx > currentIdx && entry.entry_type !== 'break' && entry.entry_type !== 'free' && !entry.override?.is_cancelled) {
        isNextLecture = true;
        foundNext = true;
      }
    } else {
      // No current lecture - next is first future non-break
      const currentMinutesNow = getCurrentTimeMinutes();
      const startMinutes = timeToMinutes(entry.override?.new_start_time || entry.start_time);
      if (!foundNext && entry.entry_type !== 'break' && entry.entry_type !== 'free' && !entry.override?.is_cancelled && startMinutes > currentMinutesNow) {
        isNextLecture = true;
        foundNext = true;
      }
    }
    
    return { ...entry, isNextLecture };
  });
}

export function isEventRelevantToStudent(
  event: {
    target_all: boolean;
    department_id?: string | null;
    semester?: number | null;
    class?: string | null;
    batch?: string | null;
  },
  student: {
    department_id?: string;
    semester: number;
    class: string;
    batch: string;
  }
): boolean {
  if (event.target_all) return true;
  
  if (event.department_id && event.department_id !== student.department_id) return false;
  if (event.semester && event.semester !== student.semester) return false;
  if (event.class && event.class !== student.class) return false;
  if (event.batch && event.batch !== student.batch) return false;
  
  return true;
}

export function getEventPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-400 bg-red-950/50 border-red-800';
    case 'high': return 'text-orange-400 bg-orange-950/50 border-orange-800';
    case 'normal': return 'text-blue-400 bg-blue-950/50 border-blue-800';
    case 'low': return 'text-gray-400 bg-gray-900/50 border-gray-700';
    default: return 'text-blue-400 bg-blue-950/50 border-blue-800';
  }
}

export function getEventTypeIcon(type: string): string {
  switch (type) {
    case 'room_change': return '🏛️';
    case 'professor_change': return '👨‍🏫';
    case 'time_change': return '⏰';
    case 'cancellation': return '❌';
    case 'seminar': return '🎤';
    case 'workshop': return '🔧';
    case 'extra_lecture': return '📚';
    case 'exam': return '📝';
    case 'emergency': return '🚨';
    case 'announcement': return '📢';
    case 'holiday': return '🎉';
    default: return '📌';
  }
}

export function getEventTypeBadgeColor(type: string): string {
  switch (type) {
    case 'cancellation': return 'bg-red-900 text-red-300';
    case 'room_change': return 'bg-orange-900 text-orange-300';
    case 'professor_change': return 'bg-yellow-900 text-yellow-300';
    case 'time_change': return 'bg-purple-900 text-purple-300';
    case 'emergency': return 'bg-red-900 text-red-300';
    case 'seminar': return 'bg-blue-900 text-blue-300';
    case 'workshop': return 'bg-green-900 text-green-300';
    case 'extra_lecture': return 'bg-teal-900 text-teal-300';
    default: return 'bg-gray-800 text-gray-300';
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
