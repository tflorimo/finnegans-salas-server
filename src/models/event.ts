import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";
import { Attendee, EventAttributes } from "./event.types";
import Room from "./room";
import User from "./user";

export class Event extends Model<EventAttributes> implements EventAttributes {
    public id!: string;
    public creatorMail!: string;
    public roomEmail!: string;
    public startTime!: Date;
    public title!: string;
    public endTime!: Date;
    public checkedIn!: boolean;
    public attendees!: Attendee[];
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

        /**
         * @todo ver nota de abajo
         */
        roomEmail: {  //  roomEmail corresponde al calendarId en google calendar. en un mundo ideal, los usuarios crean eventos siempre en una sala. VER
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: Room,
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

        checkedIn: {
            type: DataTypes.BOOLEAN,   // sirve para identificar que eventos no dieron checkin y de esa manera eliminarlos del calendar y de la bd pasado los 15 min con los jobs
            defaultValue: false,
        },
        attendees: {
            type: DataTypes.JSON, 
            allowNull: true,
        },
    }, 
    {
        sequelize,
        timestamps: true,
        paranoid: true, // borrado logico
        tableName: 'events',
        modelName: 'Event',
        indexes: [
            { fields: ['roomEmail'] },
            { fields: ['startTime'] },
            { fields: ['checkedIn'] }
        ],
    });

Event.belongsTo(Room, { foreignKey: 'roomEmail', targetKey: 'email' });
Room.hasMany(Event, { foreignKey: 'roomEmail', sourceKey: 'email' });
export default Event;
