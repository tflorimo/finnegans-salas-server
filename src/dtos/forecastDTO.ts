export interface ForecastDTO {
    roomEmail: string
    date: Date
    occupancyPredicted: number
    lower: number
    upper: number
}

export interface RoomForecastDTO {
    roomEmail: string
    forecasts: ForecastDTO[]
}