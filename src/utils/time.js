const { DateTime } = require('luxon');
const env = require('../config/env');

function nowUtcJsDate() {
  return DateTime.utc().toJSDate();
}

function todayRangeUtc() {
  const now = DateTime.now().setZone(env.APP_TZ);
  const start = now.startOf('day').toUTC().toJSDate();
  const end = now.endOf('day').toUTC().toJSDate();
  return { start, end };
}

/**
 * Convierte un string YYYY-MM-DD (fecha) a UTC (fin del día en APP_TZ) para tratarlo como "vence ese día".
 * Devuelve null si no viene fecha.
 */
function dueDateToUtcJsDate(dueDateStr) {
  if (!dueDateStr) return null;
  const dt = DateTime.fromISO(dueDateStr, { zone: env.APP_TZ }).endOf('day');
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

module.exports = {
  nowUtcJsDate,
  todayRangeUtc,
  dueDateToUtcJsDate
};
