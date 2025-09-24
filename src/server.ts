import app from './app';
import dotenv from 'dotenv';
import sequelize from './config/database';

import './models/user';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
	try {
		await sequelize.authenticate();
		console.log('MySQL conectado');

		// { alter: true } crea o actualiza las tablas según los modelos
		await sequelize.sync({ alter: false });

		app.listen(PORT, () => {
			console.log(`Server iniciado con base de datos`);
			console.log(`API disponible en: http://localhost:${PORT}`);
		});

	} catch (error) {
		console.error('Error al iniciar el servidor:', error);
		process.exit(1);
	}
}

iniciarServidor();
