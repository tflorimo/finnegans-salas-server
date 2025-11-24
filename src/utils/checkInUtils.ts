const TEN_MINUTES_MS = 10 * 60 * 1000;
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function getTimestamp(date: Date): number {
    return new Date(date).getTime();
}

export function getEventTimestamps(startTime: Date, endTime: Date) {
    return {
        start: getTimestamp(startTime),
        end: getTimestamp(endTime),
        tenMinutesBefore: getTimestamp(startTime) - TEN_MINUTES_MS,
        fifteenMinutesAfterStart: getTimestamp(startTime) + FIFTEEN_MINUTES_MS
    };
}