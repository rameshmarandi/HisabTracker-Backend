import moment from "moment-timezone";

// Default timezone (India Standard Time)
const DEFAULT_TZ = "Asia/Kolkata";

/**
 * ✅ Convert IST datetime string to UTC ISO string
 * @param {string} istDateTime - format: "YYYY-MM-DD HH:mm" (e.g. "2025-09-20 18:50")
 * @returns {string} UTC ISO string (e.g. "2025-09-20T13:20:00.000Z")
 */
export const convertISTToUTC = (istDateTime) => {
  return moment
    .tz(istDateTime, "YYYY-MM-DD HH:mm", DEFAULT_TZ)
    .utc()
    .toISOString();
};

/**
 * ✅ Convert UTC datetime string to IST format
 * @param {string} utcDateTime - UTC ISO string
 * @param {string} format - default "YYYY-MM-DD HH:mm"
 * @returns {string} IST formatted datetime
 */
export const convertUTCToIST = (utcDateTime, format = "YYYY-MM-DD HH:mm") => {
  return moment(utcDateTime).tz(DEFAULT_TZ).format(format);
};

/**
 * ✅ Get delay in ms from now until scheduled IST datetime
 * @param {string} istDateTime - format: "YYYY-MM-DD HH:mm"
 * @returns {number} delay in ms (>= 0)
 */
export const getDelayFromIST = (istDateTime) => {
  const utcDateTime = convertISTToUTC(istDateTime);
  const delay = new Date(utcDateTime).getTime() - Date.now();
  return Math.max(0, delay); // never negative
};

/**
 * ✅ Get current time in IST
 * @param {string} format - default "YYYY-MM-DD HH:mm:ss"
 * @returns {string}
 */
export const getCurrentIST = (format = "YYYY-MM-DD HH:mm:ss") => {
  return moment().tz(DEFAULT_TZ).format(format);
};

/**
 * ✅ Get current time in UTC
 * @returns {string} ISO string
 */
export const getCurrentUTC = () => {
  return moment.utc().toISOString();
};

/**
 * ✅ Convert any datetime from one timezone to another
 * @param {string} dateTime - "YYYY-MM-DD HH:mm"
 * @param {string} fromTZ - source timezone (default IST)
 * @param {string} toTZ - target timezone (default UTC)
 * @param {string} format - default "YYYY-MM-DD HH:mm"
 * @returns {string}
 */
export const convertBetweenTimezones = (
  dateTime,
  fromTZ = DEFAULT_TZ,
  toTZ = "UTC",
  format = "YYYY-MM-DD HH:mm"
) => {
  return moment
    .tz(dateTime, "YYYY-MM-DD HH:mm", fromTZ)
    .tz(toTZ)
    .format(format);
};

/**
 * ✅ Normalize any datetime (UTC ISO or IST string) and always return IST
 * @param {string} dateTime - e.g. "2025-09-20T13:20:00.000Z" (UTC) OR "2025-09-20 18:50" (IST)
 * @param {string} format - default "YYYY-MM-DD HH:mm"
 * @returns {string} IST datetime in given format
 */
export const normalizeToIST = (dateTime, format = "YYYY-MM-DD HH:mm") => {
  let m;

  // If it's an ISO string (has "T" and "Z"), treat as UTC
  if (dateTime.includes("T") && dateTime.includes("Z")) {
    m = moment.utc(dateTime);
  } else {
    // Otherwise assume IST input
    m = moment.tz(dateTime, "YYYY-MM-DD HH:mm", DEFAULT_TZ);
  }

  return m.tz(DEFAULT_TZ).format(format);
};
