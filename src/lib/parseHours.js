export function parseHours(periods) {
  if (!periods?.length) return [];
  // Sun=0…Sat=6 using Hebrew abbreviations
  const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const fmt = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  // Collect ALL time-ranges per day (handles split shifts), sort by open time
  const daySlots = {}; // day → [{ key, str }]
  for (const p of periods) {
    if (!p.open) continue;
    const d = p.open.day;
    const str = p.close
      ? `${fmt(p.open.hour, p.open.minute)}-${fmt(p.close.hour, p.close.minute)}`
      : 'Open 24h';
    if (!daySlots[d]) daySlots[d] = [];
    daySlots[d].push({ key: p.open.hour * 60 + p.open.minute, str });
  }

  // Build day → joined time string (e.g. "12:00-16:00, 18:00-23:00")
  const dayTime = {};
  for (const [d, slots] of Object.entries(daySlots)) {
    slots.sort((a, b) => a.key - b.key);
    dayTime[d] = slots.map(s => s.str).join(', ');
  }
  if (!Object.keys(dayTime).length) return [];

  // Group consecutive days that share an identical time string
  const rows = [];
  let start = null, prev = null, time = null;
  for (let d = 0; d <= 6; d++) {
    const t = dayTime[d];
    if (t !== undefined && t === time && d === prev + 1) {
      prev = d;
    } else {
      if (start !== null) rows.push({ start, end: prev, time });
      if (t !== undefined) { start = d; prev = d; time = t; }
      else                 { start = null; prev = null; time = null; }
    }
  }
  if (start !== null) rows.push({ start, end: prev, time });

  return rows.slice(0, 3).map(r => ({
    days: r.start === r.end ? DAYS[r.start] : `${DAYS[r.start]}-${DAYS[r.end]}`,
    time: r.time,
  }));
}
