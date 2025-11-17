export interface ForecastAttributes {
    id: number;
    roomEmail: string;
    date: Date;
    occupancyPredicted: number;
    lower: number;
    upper: number;
}