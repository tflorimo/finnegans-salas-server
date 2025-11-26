import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_HOST) {
    throw new Error(
        'Faltan variables de entorno para la conexión a la base de datos (DB_NAME, DB_USER, DB_PASS, DB_HOST)');
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        timezone: '-03:00', // Timezone de Uruguay/Argentina
        logging: false, // desactiva los logs de SQL en consola
        pool: {
            max: 10,            // máximo de conexiones abiertas a la vez
            min: 0,              // mínimo de conexiones mantenidas
            acquire: 30000,       // tiempo máximo para intentar conectar (ms)
            idle: 10000,         // tiempo máximo que una conexión puede estar inactiva antes de cerrarse
        },
    }
);

export default sequelize;