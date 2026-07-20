export function isCrossMidnightSameDayEnd(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start.toDateString() !== end.toDateString()) {
    return false;
  }
  return end.getTime() < start.getTime();
}

export function normalizeEventRange(
  startsAt: string,
  endsAt: string,
): { startsAt: Date; endsAt: Date } {
  const start = new Date(startsAt);
  let end = new Date(endsAt);
  if (isCrossMidnightSameDayEnd(startsAt, endsAt)) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }
  return { startsAt: start, endsAt: end };
}

export function isEventRangeInvalid(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  const { startsAt: start, endsAt: end } = normalizeEventRange(startsAt, endsAt);
  return end.getTime() <= start.getTime();
}

export function spansMidnight(startsAt: Date, endsAt: Date): boolean {
  return startsAt.toDateString() !== endsAt.toDateString();
}
