import { CheckInErrorCode } from "../constants/checkInErrors";

export interface CheckInResult {
    success: boolean;
    event?: any;
    room?: any;
    errorCode?: CheckInErrorCode;
    message?: string;
}