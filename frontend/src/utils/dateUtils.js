/**
 * Date utility functions to handle timezone issues
 * Problem: Backend sends dates as "2026-06-26" (ISO date, no timezone)
 * JavaScript's new Date("2026-06-26") treats it as UTC midnight,
 * which shifts the date backward in non-UTC timezones.
 * Solution: Parse as local date explicitly
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date, not UTC
 * @param {string} dateStr - ISO date string like "2026-06-26"
 * @returns {Date} Date object representing local midnight on that date
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  
  // Split the date string
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in LOCAL timezone (not UTC)
  return new Date(year, month - 1, day);
}

/**
 * Parse an ISO time string (HH:MM:SS) to time components
 * @param {string} timeStr - ISO time string like "15:30:00"
 * @returns {object} Object with hour, minute, second
 */
export function parseTime(timeStr) {
  if (!timeStr) return { hour: 0, minute: 0, second: 0 };
  
  const parts = timeStr.split(':').map(Number);
  return {
    hour: parts[0] || 0,
    minute: parts[1] || 0,
    second: parts[2] || 0,
  };
}

/**
 * Format a date for display in en-IN locale
 * @param {Date | string} date - Date object or ISO date string
 * @returns {string} Formatted date like "26 Jun 2026"
 */
export function formatDateDisplay(date) {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  if (!dateObj) return '—';
  
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time for display
 * @param {string} timeStr - ISO time string like "15:30:00"
 * @returns {string} Formatted time like "3:30 PM" or "15:30"
 */
export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '—';
  
  const time = parseTime(timeStr);
  const hour = String(time.hour).padStart(2, '0');
  const minute = String(time.minute).padStart(2, '0');
  
  return `${hour}:${minute}`;
}

/**
 * Format both date and time together
 * @param {string} dateStr - ISO date string
 * @param {string} timeStr - ISO time string
 * @returns {string} Formatted datetime like "26 Jun 2026 at 3:30 PM"
 */
export function formatDateTimeDisplay(dateStr, timeStr) {
  return `${formatDateDisplay(dateStr)} at ${formatTimeDisplay(timeStr)}`;
}

/**
 * Format date and time with full locale formatting
 * @param {string} dateStr - ISO date string
 * @param {string} timeStr - ISO time string or "HH:MM" format
 * @returns {string} Full formatted datetime
 */
export function formatFullDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '—';
  
  const dateObj = parseLocalDate(dateStr);
  const time = parseTime(timeStr);
  
  // Set the time on the date object (important for display)
  dateObj.setHours(time.hour, time.minute, time.second, 0);
  
  // Use toLocaleString (not toLocaleDateString) to include time
  return dateObj.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if a date is in the future (upcoming appointment)
 * @param {string} dateStr - ISO date string
 * @returns {boolean}
 */
export function isUpcomingDate(dateStr) {
  if (!dateStr) return false;
  
  const appointmentDate = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return appointmentDate >= today;
}

/**
 * Get day name from date string
 * @param {string} dateStr - ISO date string
 * @returns {string} Day name like "Monday" or "MONDAY"
 */
export function getDayName(dateStr) {
  if (!dateStr) return '';
  
  const dateObj = parseLocalDate(dateStr);
  return dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}
