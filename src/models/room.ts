import { DataTypes } from "sequelize";
import sequelize from "../config/database";

const Room = sequelize.define('Room', {
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
    capacity: {  // dato creado para el admin 
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,


    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: false,

    },
}, {
    tableName: 'rooms',  //nombre en la tabla de la bd
    indexes: [
        { fields: ['email'] },
        { fields: ['name'] },
    ],
});

export default Room;


