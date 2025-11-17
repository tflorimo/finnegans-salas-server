import { Model, DataTypes, Optional } from "sequelize";
import { ForecastAttributes } from "./forecast.types";
import sequelize from "../config/database";

interface ForecastCreationAttributes extends Optional<ForecastAttributes, never> { }

export class Forecast extends Model<ForecastAttributes, ForecastCreationAttributes> implements ForecastAttributes {
    public id!: number;
    public roomEmail!: string;
    public date!: Date;
    public occupancyPredicted!: number;
    public lower!: number;
    public upper!: number;
    public readonly createdAt!: Date;
}

Forecast.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        roomEmail: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        }, 
        occupancyPredicted: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        lower: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        upper: {
            type: DataTypes.FLOAT,
            allowNull: false,
        }
    },
    {
        sequelize,
        tableName: "room_forecasts",
        timestamps: true,
        paranoid: true,
        modelName: "Forecast",
        indexes: [
            { fields: ['roomEmail'] }
        ]
    }
)