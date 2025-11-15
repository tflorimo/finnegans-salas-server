import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { Attendee, EventAttributes } from "./event.types";
import { CheckInStatus, OverlapStatus } from "../dtos/eventDTO";

interface EventCreationAttributes extends Optional<EventAttributes, never> { }
export class Event extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
    public id!: string;
    public creatorMail!: string;
    public roomEmail!: string;
    public startTime!: Date;
    public title!: string;
    public endTime!: Date;
    public checkInStatus!: CheckInStatus;
    public attendees!: Attendee[];
    public overlapStatus!: OverlapStatus;
    public scheduleUpdatedAt?: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

Event.init(
    {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            primaryKey: true,
            autoIncrement: false
        },
        creatorMail: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        roomEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'rooms',
                key: 'email'
            }
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        endTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        checkInStatus: {
            type: DataTypes.ENUM(...Object.values(CheckInStatus)),
            defaultValue: CheckInStatus.PENDING,
            allowNull: false,
        },
        attendees: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        overlapStatus: {
            type: DataTypes.ENUM(...Object.values(OverlapStatus)),
            defaultValue: OverlapStatus.NONE,
            allowNull: false,
        },
        scheduleUpdatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        timestamps: true,
        paranoid: true,
        tableName: 'events',
        modelName: 'Event',
        indexes: [
            { fields: ['roomEmail'] },
            { fields: ['startTime'] },
            { fields: ['endTime'] },
            { fields: ['checkInStatus'] },
        ],
    });
