import { log } from 'console';
import Event from '../models/event';
import { Op } from 'sequelize';

export class BorrarEventosJob {

    async execute() {
        try {
            console.log('Inicio de borrado de eventos sin checkIn...');

            const now = new Date();

            /**
             * borramos los eventos que : 
             * 1) no tienen el checkin hecho (checkedIn = false)
             * 2) se excedieron del tiempo limite (15 minutos despues de la hora de inicio)
             */

            const eventosABorrar = await Event.findAll({
                where: {
                    checkedIn: false,
                    startTime: {
                        // busco los eventos cuyo startTime es mayor a 15 minutos después de ahora
                        /**
                         * @usecases
                         * startTime: 17:00
                         * checkedIn: false
                         * now: 17:16 -> se borra
                         * now: 17:14 -> no se borra
                         */
                        [Op.gt]: new Date(now.getTime() - 15 * 60000) // 15 minutos en milisegundos
                    }
                }
            });

            if(eventosABorrar.length === 0) {
                console.log('No hay eventos para borrar.');
                return;
            }

            const eventosIds = eventosABorrar.map((e: any) => e.id);
            const deleted = await Event.destroy({
                where: {
                    id: {
                        [Op.in]: eventosIds
                    }
                }
            });

            console.log(`Borrados ${deleted} eventos sin checkIn.`);

        } catch (error) {
            console.error('Error al borrar eventos sin checkIn:', error);
        }
    }

}