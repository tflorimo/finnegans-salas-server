import { DataTypes } from "sequelize";
import sequelize from "../config/database";
import Room from "./room";
import User from "./user";


const Event = sequelize.define
    (
        'Event', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        googleEventId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
        },

        roomEmail: {  //  roomEmail corresponde al calendarId en google calendar
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: Room,
                key: 'email'
            }
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        startTime: {
            type: DataTypes.DATE,
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
            type: DataTypes.JSON,  // Asegúrate de tener este campo para los asistentes
            allowNull: true,
        },

    }, {
        timestamps: true,
        paranoid: true, // borrado logico
        tableName: 'events',
        indexes: [
            { fields: ['roomEmail'] },
            { fields: ['startTime'] },
            { fields: ['checkedIn'] },
            { fields: ['googleEventId'] }, // índice para búsquedas por Google Event ID
        ],
    });

Event.belongsTo(Room, { foreignKey: 'roomEmail', targetKey: 'email' });
Room.hasMany(Event, { foreignKey: 'roomEmail', sourceKey: 'email' });

Event.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
User.hasMany(Event, { foreignKey: 'userId', sourceKey: 'id' });
export default Event;
