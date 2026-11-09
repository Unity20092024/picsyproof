import type { Property, Task, Turnover } from "./model";
export function zoneFor(property?: Property): {
  timeZone: string;
  source: "property" | "device";
  invalid: boolean;
} {
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (property?.timeZone) {
      new Intl.DateTimeFormat("en-US", {
        timeZone: property.timeZone,
      }).format();
      return {
        timeZone: property.timeZone,
        source: "property",
        invalid: false,
      };
    }
  } catch {
    return { timeZone: device, source: "device", invalid: true };
  }
  return { timeZone: device, source: "device", invalid: false };
}
export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (name: string) => parts.find((p) => p.type === name)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    seconds: get("second"),
  };
}
export function todayInZone(timeZone: string) {
  return localParts(new Date(), timeZone).date;
}
export function scheduleInstant(
  date: string,
  time: string,
  timeZone: string,
): { iso?: string; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return { error: "Choose a valid date and time." };
  const [y, m, d] = date.split("-").map(Number),
    [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  if (
    y < 2000 ||
    y > 2100 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    h > 23 ||
    min > 59 ||
    new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== date
  )
    return { error: "Choose a valid date and time." };
  // Discover possible offsets around this date. Matching candidates detect DST gaps and repeated times.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const instant = new Date(wall + hours * 3600000);
    const p = localParts(instant, timeZone);
    offsets.add(
      Date.parse(p.date + "T" + p.time + ":" + p.seconds + "Z") -
        instant.getTime(),
    );
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wall - offset))
    .filter((instant) => {
      const p = localParts(instant, timeZone);
      return p.date === date && p.time === time;
    });
  if (!candidates.length)
    return {
      error:
        "This local time does not exist because the clocks change. Choose another time.",
    };
  if (candidates.length > 1)
    return {
      error:
        "This local time occurs twice because the clocks change. Choose a time outside the repeated hour.",
    };
  return { iso: candidates[0].toISOString() };
}
export function snapshotTasks(
  tasks: Task[],
  property: Property,
  global: boolean,
): Task[] {
  const required = property.tasks.filter((t) => t.requiresPhoto);
  const result = tasks.map((t) => ({
    id: crypto.randomUUID(),
    label: t.label.trim(),
    done: false,
    requiresPhoto:
      global ||
      !!t.requiresPhoto ||
      required.some(
        (r) => r.label.trim().toLowerCase() === t.label.trim().toLowerCase(),
      ),
  }));
  for (const t of required)
    if (
      !result.some(
        (r) => r.label.toLowerCase() === t.label.trim().toLowerCase(),
      )
    )
      result.push({
        id: crypto.randomUUID(),
        label: t.label.trim(),
        done: false,
        requiresPhoto: true,
      });
  return result;
}
export function turnoverLabel(t: Turnover) {
  return (
    new Intl.DateTimeFormat(undefined, {
      timeZone: t.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(t.scheduledAt)) +
    " · " +
    t.timeZone
  );
}
export function canComplete(tasks: Task[]) {
  return (
    tasks.length > 0 &&
    tasks.every((t) => t.done && (!t.requiresPhoto || !!t.photo))
  );
}
