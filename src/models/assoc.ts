import { Room } from "./room";
import { Event } from "./event";
import { formatModelLog } from "../utils/dateUtils";
import { Forecast } from "./forecast";

export function asociacionesModelos() {

    Event.belongsTo(Room, { 
        foreignKey: 'roomEmail',
        targetKey: 'email',
        as: 'room'
    });

    Room.hasMany(Event, { 
        foreignKey: 'roomEmail',
        sourceKey: 'email',
        as: 'events'
    });

    Room.belongsTo(Event, { 
        foreignKey: 'current_event',
        targetKey: 'id',
        as: 'currentEvent'
    });

    Room.hasMany(Forecast, {
        foreignKey: 'roomEmail',
        sourceKey: 'email',
        as: 'forecasts'
    });

    Forecast.belongsTo(Room, {
        foreignKey: 'roomEmail',
        targetKey: 'email',
        as: 'room'
    });

    console.log(formatModelLog('Relaciones entre modelos inicializadas.'));

}