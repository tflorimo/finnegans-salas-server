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
