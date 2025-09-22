import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(   // Crea una instancia de conexión con la base de datos MySQL.
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASS!,
    {
        host: process.env.DB_HOST!,
        dialect: 'mysql',  // Sequelize puede usar varios: mysql, postgres, sqlite, etc.
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