import moment from 'moment';

/**
 * Utility function to format date into a standard format (YYYY-MM-DD).
 * @param {Date|string} date - The date to format.
 * @returns {string} The formatted date (YYYY-MM-DD).
 */
export const getStandardDateFormat = (date) => {
  return moment(date).format("YYYY-MM-DD");
};

/**
 * Utility function to get the start and end date range for a given year and months.
 * - If only the year is provided, it returns the full year range.
 * - If both year and months (array) are provided, it returns an array of date ranges for each selected month.
 * 
 * @param {number|string} year - The year to calculate from.
 * @param {Array<number|string>|string|undefined} months - Optional. A single month (string/number) or an array of months.
 * @returns {Object|Array<Object>} An object for full year or an array of month ranges.
 */
export const getDateRange = (year, months) => {
  // Convert year to string (ensure safe parsing)
  year = String(year);

  // Handle full year case if no months are provided
  if (!months) {
    return {
      startDate: moment(`${year}-01-01`).startOf('year').toDate(),
      endDate: moment(`${year}-12-31`).endOf('year').toDate(),
    };
  }

  // Ensure months is always treated as an array
  const monthArray = Array.isArray(months) ? months : [months];

  // Generate an array of date ranges for each month
  return monthArray.map((month) => {
    month = String(month).padStart(2, "0"); // Ensure proper "MM" format
    return {
      startDate: moment(`${year}-${month}-01`).startOf('month').toDate(),
      endDate: moment(`${year}-${month}-01`).endOf('month').toDate(),
    };
  });
};

/**
 * Utility function to get the start and end date of today.
 * @returns {Object} An object with startDate and endDate for the current day.
 */
export const getTodayDateRange = () => {
  return {
    startDate: moment().startOf('day').toDate(),
    endDate: moment().endOf('day').toDate(),
  };
};

/**
 * Utility function to get the start and end date of the current month.
 * @returns {Object} An object with startDate and endDate for the current month.
 */
export const getCurrentMonthRange = () => {
  return {
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
  };
};

/**
 * Utility function to get the start and end date of the current year.
 * @returns {Object} An object with startDate and endDate for the current year.
 */
export const getCurrentYearRange = () => {
  return {
    startDate: moment().startOf('year').toDate(),
    endDate: moment().endOf('year').toDate(),
  };
};

/**
 * Utility function to format a date to a readable format (e.g., "March 15, 2025").
 * @param {Date|string} date - The date to format.
 * @returns {string} The formatted date in a readable string format.
 */
export const getReadableDateFormat = (date) => {
  return moment(date).format('MMMM Do YYYY');
};
