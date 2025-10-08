import { Model } from "sequelize";
import { UserDTO, UserWithEventsDTO } from "../../dtos/userDTO";

export function mapUserToDTO(user: Model): UserDTO {
    const userData = user.get({ plain: true }) as any;
    
    return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
    };
}

export function mapUserWithEventsToDTO(user: Model): UserWithEventsDTO {
    const userData = user.get({ plain: true }) as any;
    
    return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        events: (userData.Events || []).map((event: any) => ({
            id: event.id,
            googleEventId: event.googleEventId,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            checkedIn: event.checkedIn,
        }))
    };
}

export function mapUsersToDTO(users: Model[]): UserDTO[] {
    return users.map(mapUserToDTO);
}