// Central season configuration.
// Update SEASON_YEAR and WEEK_SCHEDULE once at the start of each new NFL season, using the
// official week date ranges from https://www.nfl.com/schedules/ ("Additional Links" footer).
// Each `end` boundary is the day after the week's last game day (12:00 UTC) — i.e. the first
// moment the *next* week is considered "current".

export const SEASON_YEAR = 2026;

const TOTAL_WEEKS = 18;

export const WEEK_SCHEDULE = [
    { id: 'REG1', end: new Date('2026-09-16T12:00:00Z') },
    { id: 'REG2', end: new Date('2026-09-23T12:00:00Z') },
    { id: 'REG3', end: new Date('2026-09-30T12:00:00Z') },
    { id: 'REG4', end: new Date('2026-10-07T12:00:00Z') },
    { id: 'REG5', end: new Date('2026-10-14T12:00:00Z') },
    { id: 'REG6', end: new Date('2026-10-21T12:00:00Z') },
    { id: 'REG7', end: new Date('2026-10-28T12:00:00Z') },
    { id: 'REG8', end: new Date('2026-11-04T12:00:00Z') },
    { id: 'REG9', end: new Date('2026-11-11T12:00:00Z') },
    { id: 'REG10', end: new Date('2026-11-18T12:00:00Z') },
    { id: 'REG11', end: new Date('2026-11-25T12:00:00Z') },
    { id: 'REG12', end: new Date('2026-12-02T12:00:00Z') },
    { id: 'REG13', end: new Date('2026-12-09T12:00:00Z') },
    { id: 'REG14', end: new Date('2026-12-16T12:00:00Z') },
    { id: 'REG15', end: new Date('2026-12-23T12:00:00Z') },
    { id: 'REG16', end: new Date('2026-12-31T12:00:00Z') },
    { id: 'REG17', end: new Date('2027-01-07T12:00:00Z') },
    { id: 'REG18', end: new Date('2027-01-14T12:00:00Z') },
];

// Returns the current NFL regular season week number (1-18), based on the boundaries above.
// Once the season is over, keeps returning the last week.
export function getCurrentWeekNumber(now = new Date()) {
    const upcoming = WEEK_SCHEDULE.find((w) => now < w.end);
    return upcoming ? parseInt(upcoming.id.replace('REG', ''), 10) : TOTAL_WEEKS;
}

// Below this week, standings are too volatile for playoff seeds/bubble/eliminated to be meaningful.
export const PLAYOFF_PICTURE_MIN_WEEK = 8;
