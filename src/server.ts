// src/server.ts
import app from './app';
import dotenv from 'dotenv';
import sequelize from './config/database';

// Importa los modelos para que Sequelize los registre
import './models/user';
import './models/room';
import './models/event';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
	try {
		//  Conexión a la base de datos
		await sequelize.authenticate();
		console.log(' MySQL conectado');

		//  Sincronización de tablas
		// { alter: true } crea o actualiza las tablas según los modelos
		await sequelize.sync({ alter: true });
		console.log(' Tablas sincronizadas');

		// Inicio del servidor Express
		app.listen(PORT, () => {
			console.log(`\n🚀 Server iniciado con base de datos`);
			console.log(` API disponible en: http://localhost:${PORT}`);
		});

	} catch (error) {
		console.error(' Error al iniciar el servidor:', error);
		process.exit(1);
	}
}

iniciarServidor();
