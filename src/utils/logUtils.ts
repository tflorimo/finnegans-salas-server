import { getLocalTimestamp } from './dateUtils';

// ----- Formatters de logs -----
export const formatStartLog = (name: string): string => {
    return `[${getLocalTimestamp()}] [START]  ${name}`;
};

export const formatDoneLog = (name: string, durationMs: number): string => {
    return `[${getLocalTimestamp()}] [DONE]   ${name} (${durationMs} ms)`;
};

export const formatCronLog = (name: string, cron: string): string => {
    return `[${getLocalTimestamp()}] [CRON]   ${name} (${cron})`;
};

export const formatOfflineLog = (name: string): string => {
    return `[${getLocalTimestamp()}] [OFF]     ${name}`;
};

export const formatModelLog = (message: string): string => {
    return `[${getLocalTimestamp()}] [MODEL]  ${message}`;
};

export const formatInitLog = (message: string): string => {
    return `[${getLocalTimestamp()}] [INIT]   ${message}`;
};
