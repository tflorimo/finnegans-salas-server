export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const now = new Date(date);
    const dayOfWeek = now.getDay();
    
    // Calcular el lunes de esta semana
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calcular el domingo de esta semana
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
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