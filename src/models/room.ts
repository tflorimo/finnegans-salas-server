import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { RoomAttributes } from "./room.types";

interface RoomCreationAttributes extends Optional<RoomAttributes, 'createdAt' | 'updatedAt' | 'deletedAt'> {}
export class Room extends Model<RoomAttributes, RoomCreationAttributes> implements RoomAttributes {
    public email!: string;
    public name!: string;
    public capacity!: number;
    public description!: string | null;
    public floor!: string;
    public type!: string;
    public is_busy!: boolean;
    public current_event!: string | null;
    public resources!: string[] | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

Room.init(
    {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
            validate: {
                isEmail: true,
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        capacity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        floor: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        is_busy: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },

        current_event: {
            type: DataTypes.STRING,
            allowNull: true,
            references: {
                model: 'events',
                key: 'id'
            }
        },

        resources: {
            type: DataTypes.JSON,
            allowNull: true,
        },

    },
    {   
        sequelize,
        timestamps: true,
        paranoid: true,
        tableName: 'rooms',
        modelName: 'Room',
        indexes: [
            { fields: ['email'], unique: true },
            { fields: ['name'] },
            { fields: ['is_busy'] },
            { fields: ['current_event'] },
        ],
    }
);

export default Room;
