import app from './app';
import dotenv from 'dotenv';
import sequelize from './config/database';
import { setupJobs } from './schedulers/cronSetup';
import { formatInitLog } from './utils/logUtils';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
	try {
		await sequelize.authenticate();
		console.log(formatInitLog("MySQL conectado"));
		
		// { alter: true } crea o actualiza las tablas según los modelos
		await sequelize.sync({ alter: false });

		app.listen(PORT, () => {
			console.log(formatInitLog("Server iniciado con base de datos"));
			console.log(formatInitLog(`API disponible en: http://localhost:${PORT}`));
			console.log(`===========================  RUNTIME LOGS  ===========================`);
		});

		setupJobs();

	} catch (error) {
		console.error('[SERVER-INIT] Error al iniciar el servidor:', error);
		process.exit(1);
	}
}

iniciarServidor();
