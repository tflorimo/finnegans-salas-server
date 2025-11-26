import { Room } from "./room";
import { Event } from "./event";
import { User } from "./user";
import { Audit } from "./audit";
import { Forecast } from "./forecast"
import { asociacionesModelos } from "./assoc";

asociacionesModelos();

export { Room, Event, User, Forecast, Audit };