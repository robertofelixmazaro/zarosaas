/**
 * Dynamic slot generator based on business hours, lunch breaks,
 * blocked dates/times, and existing appointments.
 */

export interface BusinessHours {
  days: Record<string, { active: boolean; start: string; end: string }>;
  lunch: { enabled: boolean; start: string; end: string };
}

export interface BookedSlot {
  time: string; // "HH:mm"
  duration: number; // minutes
}

export interface BlockedDate {
  blocked_date: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  barber_id: string | null;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: {
    "0": { active: false, start: "08:00", end: "18:00" },
    "1": { active: true, start: "08:00", end: "18:00" },
    "2": { active: true, start: "08:00", end: "18:00" },
    "3": { active: true, start: "08:00", end: "18:00" },
    "4": { active: true, start: "08:00", end: "18:00" },
    "5": { active: true, start: "08:00", end: "18:00" },
    "6": { active: true, start: "08:00", end: "12:00" },
  },
  lunch: { enabled: true, start: "12:00", end: "13:00" },
};

const DEFAULT_SLOT_INTERVAL = 30; // Minimum interval, but actual interval = max(this, serviceDuration)

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Generate all possible time slots for a given date, considering:
 * - Business hours for that day of week
 * - Barber-specific availability (overrides business hours if provided)
 * - Lunch break
 * - Service duration (slot must fit entirely before end of day / lunch)
 *
 * Slots are generated at fixed 30-minute intervals so that even
 * long-duration services show intermediate start times.
 */
export function generateRawSlots(
  dayOfWeek: number,
  serviceDurationMinutes: number,
  businessHours: BusinessHours,
  barberAvailability?: { start_time: string; end_time: string; active: boolean } | null,
  barberLunch?: { enabled: boolean; start: string; end: string } | null
): string[] {
  // Use barber-specific hours if available, otherwise store hours
  const dayConfig = barberAvailability
    ? { active: barberAvailability.active, start: barberAvailability.start_time.slice(0, 5), end: barberAvailability.end_time.slice(0, 5) }
    : businessHours.days[dayOfWeek.toString()];

  if (!dayConfig?.active) return [];

  const startMin = timeToMin(dayConfig.start);
  const endMin = timeToMin(dayConfig.end);
  // Use barber-specific lunch if provided, otherwise store lunch
  const lunch = barberLunch && barberLunch.enabled ? barberLunch : businessHours.lunch;
  const lunchStartMin = lunch.enabled ? timeToMin(lunch.start) : -1;
  const lunchEndMin = lunch.enabled ? timeToMin(lunch.end) : -1;

  const slots: string[] = [];
  let current = startMin;

  while (current + serviceDurationMinutes <= endMin) {
    const slotEnd = current + serviceDurationMinutes;

    // Check if slot overlaps with lunch break
    if (lunch.enabled && current < lunchEndMin && slotEnd > lunchStartMin) {
      // Skip to end of lunch
      current = lunchEndMin;
      continue;
    }

    slots.push(minToTime(current));
    current += SLOT_INTERVAL; // Fixed 30-min interval instead of service duration
  }

  return slots;
}

/**
 * Filter available slots by removing:
 * - Past time slots (for today)
 * - Blocked date/time slots
 * - Already booked slots (with overlap detection)
 * - Full-day bookings (entire day blocked)
 */
export function filterAvailableSlots(
  slots: string[],
  dateStr: string,
  serviceDuration: number,
  bookedSlots: BookedSlot[],
  blockedDates: BlockedDate[],
  barberId?: string,
  now?: Date
): string[] {
  const currentDate = now || new Date();
  const todayStr = formatDateLocal(currentDate);
  const currentTime = currentDate.toTimeString().slice(0, 5);

  // Check if there's a full-day booking (is_full_day service)
  const hasFullDayBooking = bookedSlots.some((b) => b.duration >= 1440);
  if (hasFullDayBooking) return [];

  // Blocked entries for this date
  const blocksForDate = blockedDates.filter((bd) => {
    const matchDate = bd.blocked_date === dateStr || !bd.blocked_date;
    const matchBarber = !bd.barber_id || bd.barber_id === barberId;
    return matchDate && matchBarber && !bd.all_day;
  });

  return slots.filter((slot) => {
    // Filter past slots for today
    if (dateStr === todayStr && slot <= currentTime) return false;

    const slotStart = timeToMin(slot);
    const slotEnd = slotStart + serviceDuration;

    // Filter blocked time ranges
    const isBlocked = blocksForDate.some((bd) => {
      const bStart = timeToMin(bd.start_time?.slice(0, 5) || "00:00");
      const bEnd = timeToMin(bd.end_time?.slice(0, 5) || "23:59");
      return slotStart < bEnd && slotEnd > bStart;
    });
    if (isBlocked) return false;

    // Filter already booked (overlap detection)
    const isBooked = bookedSlots.some((b) => {
      const bStart = timeToMin(b.time);
      const bEnd = bStart + b.duration;
      return slotStart < bEnd && slotEnd > bStart;
    });
    if (isBooked) return false;

    return true;
  });
}

/**
 * Check if a date has all-day block
 */
export function isDateBlocked(
  dateStr: string,
  blockedDates: BlockedDate[],
  barberId?: string
): boolean {
  return blockedDates.some((bd) => {
    const matchDate = bd.blocked_date === dateStr || !bd.blocked_date;
    const matchBarber = !bd.barber_id || bd.barber_id === barberId;
    return matchDate && matchBarber && bd.all_day;
  });
}

/**
 * Check if a day of week is active in business hours
 */
export function isDayActive(
  dayOfWeek: number,
  businessHours: BusinessHours,
  barberAvailability?: { active: boolean } | null
): boolean {
  if (barberAvailability) return barberAvailability.active;
  return businessHours.days[dayOfWeek.toString()]?.active || false;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
