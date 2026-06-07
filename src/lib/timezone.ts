export const FINLAND_TIME_ZONE = "Europe/Helsinki";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetText) return 0;

  const normalized = offsetText.replace("UTC", "").replace("GMT", "");
  if (!normalized) return 0;

  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

export function toDatetimeLocalInFinland(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FINLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
}

export function formatDateTimeInFinland(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fi-FI", {
    timeZone: FINLAND_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function parseDateTimeInput(input: unknown) {
  if (typeof input !== "string") return null;

  const direct = new Date(input);
  if ((input.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(input)) && !Number.isNaN(direct.getTime())) {
    return direct;
  }

  const localMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!localMatch) return Number.isNaN(direct.getTime()) ? null : direct;

  const year = Number(localMatch[1]);
  const month = Number(localMatch[2]);
  const day = Number(localMatch[3]);
  const hour = Number(localMatch[4]);
  const minute = Number(localMatch[5]);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), FINLAND_TIME_ZONE);
  const parsed = new Date(utcGuess - offsetMinutes * 60_000);
  if (Number.isNaN(parsed.getTime())) return null;

  const normalizedInput = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
  return toDatetimeLocalInFinland(parsed) === normalizedInput ? parsed : null;
}
