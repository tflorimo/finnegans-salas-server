export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const now = new Date(date);
    const dayOfWeek = now.getDay();
    
    // Inicio: hoy a las 00:00:00
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Fin: Domingo de esta semana a las 23:59:59
    const endOfWeek = new Date(now);
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { start: startOfWeek, end: endOfWeek };
}

export function isDateInWeek(date: Date, weekStart?: Date): boolean {
    const { start, end } = getWeekRange(weekStart);
    const eventDate = new Date(date);
    return eventDate >= start && eventDate <= end;
}

export function filterEventsByWeek(eventos: any[]): any[] {
    return eventos.filter(evento => isDateInWeek(evento.startTime));
}

export function getTodayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

export function getDateWithoutTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}