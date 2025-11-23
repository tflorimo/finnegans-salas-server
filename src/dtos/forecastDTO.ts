export interface HourlyForecastDTO {
    roomEmail: string;
    date: Date; // es un DATETIME de la DB
    occupancyPredicted: number;
    lower: number;
    upper: number;
}

export interface RoomHourlyForecastDTO {
    roomEmail: string;
    forecasts: HourlyForecastDTO[];
}