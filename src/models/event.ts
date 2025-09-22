import { DataTypes } from "sequelize";  //  datatypes define la estructura de la tabla sin usar SQL 
import sequelize from "../config/database";//Este model de TypeScript corresponde a una tabla de mi base de datos en la conexion config/database
import Room from "./room";
import User from "./user";

// Definición del modelo Event con Sequelize

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER, // ID local autoincremental , permite tener un conteo de los eventos
        autoIncrement:true,
        primaryKey: true,
    },
    googleEventId: {
        type: DataTypes.STRING, // ID del evento de Google Calendar como string
        allowNull: false,
        unique: true,
    },
    userId:{
        type:DataTypes.STRING,
        allowNull:false,
        references: {
            model:User,
            key:'id'
        }
    },
    roomEmail: {  //  roomEmail de la sala del calendar
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
        type: DataTypes.BOOLEAN,   // Sirve para identificar que eventos no dieron checkin y de esa manera eliminarlos del calendar y de la bd pasado los 15 min
        defaultValue: false,
    },
    attendees: {  //
        type: DataTypes.TEXT, // Almacena attendees como JSON string
        allowNull: true,
    },
}, {
    tableName: 'events',
    indexes: [
        { fields: ['roomEmail'] },
        { fields: ['startTime'] },
        { fields: ['checkedIn'] },
        { fields: ['googleEventId'] }, // Índice para búsquedas por Google Event ID
    ],
});


// Establecer relación entre Evento y Sala
Event.belongsTo(Room, { foreignKey: 'roomEmail', targetKey: 'email' });
Room.hasMany(Event, { foreignKey: 'roomEmail', sourceKey: 'email' });

export default Event;

// ASI se busca  con el indice  todos los eventos con sala 210sala@gmail.com

/* const events = await Event.findAll({
  where: { roomEmail: '210sala@gmail.com' }
});
 */