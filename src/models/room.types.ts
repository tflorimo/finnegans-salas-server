export interface RoomAttributes {
    email: string;             
    name: string;
    capacity: number;
    description: string | null;
    floor: string;
    type: string;
    is_busy: boolean;
    resources: string[] | null; 
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null; 
}