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
             * 2) se excedieron del tiempo limite
             */

            const eventosABorrar = await Event.findAll({
                where: {
                    checkedIn: false,
                    startTime: {
                        // Si startTime - 15min < now, entonces ya pasó el límite
                        [Op.lt]: new Date(now.getTime() + 15 * 60 * 1000)
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