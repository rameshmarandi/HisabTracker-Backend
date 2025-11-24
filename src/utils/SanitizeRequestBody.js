export function SanitizeRequestBody(obj) {
  if (typeof obj !== "object" || obj === null) return obj;

  const cleanedObj = {};

  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const cleanKey = key.trim();
    const value = obj[key];

    if (typeof value === "string") {
      cleanedObj[cleanKey] = value.trim();
    } else if (typeof value === "object" && value !== null) {
      cleanedObj[cleanKey] = Array.isArray(value)
        ? value.map(SanitizeRequestBody)
        : SanitizeRequestBody(value);
    } else {
      cleanedObj[cleanKey] = value;
    }
  }

  return cleanedObj;
}
