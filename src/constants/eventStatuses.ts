export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export enum OverlapStatus {
  PRIMARY = "PRIMARY",
  OVERLAPPED = "OVERLAPPED",
}

export enum CheckInStatus {
    PENDING = 'PENDING',
    CHECKED_IN = 'CHECKED_IN',
    EXPIRED = 'EXPIRED'
}
