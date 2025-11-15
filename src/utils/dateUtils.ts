// Inicio: Hoy a las 00:00:00
function getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

// Fin: Domingo de esta semana a las 23:59:59
function getEndOfWeek(date: Date): Date {
    const dayOfWeek = date.getDay();
    const endOfWeek = new Date(date);
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(date.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
}

// Helper para obtener el rango para enviar al frontend
export function getRemainingWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const todayStart = getStartOfDay(date);
    const endOfWeek = getEndOfWeek(date);

    return { start: todayStart, end: endOfWeek };
}

// Helper para obtener el rango de sincronización del calendario (especial para Prophet)
export function getCalendarSyncRange(date: Date = new Date()): { start: Date; end: Date } {
    // Inicio: Dos semanas atrás desde hoy a las 00:00:00
    const twoWeeksAgo = new Date(date);
    twoWeeksAgo.setDate(date.getDate() - 14);
    const start = getStartOfDay(twoWeeksAgo);

    const end = getEndOfWeek(date);

    return { start, end };
}

export function isDateInWeek(date: Date, weekStart?: Date): boolean {
    const { start, end } = getRemainingWeekRange(weekStart);
    const eventDate = new Date(date);
    return eventDate >= start && eventDate <= end;
}

export function filterEventsByWeek(eventos: any[]): any[] {
    return eventos.filter(evento => isDateInWeek(evento.startTime));
}

export function getDateWithoutTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

const pad = (num: number): string => String(num).padStart(2, "0");

export const getLocalTimestamp = (): string => {
    const now = new Date();

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());

    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// ----- Formatters de logs -----

export const formatStartLog = (name: string): string => {
    return `[${getLocalTimestamp()}] [START]  ${name}`;
};

export const formatDoneLog = (name: string, durationMs: number): string => {
    return `[${getLocalTimestamp()}] [DONE]   ${name} (${durationMs} ms)`;
};

export const formatCronLog = (name: string, cron: string): string => {
    return `[${getLocalTimestamp()}] [CRON]   ${name} (${cron})`;
};

export const formatOfflineLog = (name: string): string => {
    return `[${getLocalTimestamp()}] [OFF]     ${name}`;
};

export const formatModelLog = (message: string): string => {
    return `[${getLocalTimestamp()}] [MODELS] ${message}`;
};

export const formatInitLog = (message: string): string => {
    return `[${getLocalTimestamp()}] [INIT]   ${message}`;
};

// ----- @TODO Formatters de logs sin uso -----

export const formatErrorLog = (name: string, error: any): string => {
    const msg = error?.message ?? String(error);
    return `[${getLocalTimestamp()}] [ERROR]  ${name}\n   → ${msg}`;
};

export const formatWarnLog = (message: string): string => {
    return `[${getLocalTimestamp()}] [WARN]   ${message}`;
};


