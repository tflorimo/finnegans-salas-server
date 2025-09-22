import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Cargar credenciales
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

// Cliente OAuth2 ÚNICO
export const oauth2Client = new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
);

// Si hay tokens en .env, usarlos
if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    console.log('✅ Tokens cargados desde .env');
}

// Calendar API
export const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Funciones helper necesarias
export const hasValidTokens = (): boolean => {
    const creds = oauth2Client.credentials;
    return !!(creds && creds.access_token);
};

export const setTokens = (tokens: any) => {
    oauth2Client.setCredentials(tokens);
    console.log('✅ Tokens configurados');
};

export const getTokenStatus = () => {
    const creds = oauth2Client.credentials;
    if (!creds || !creds.access_token) {
        return { valid: false, message: 'No hay tokens' };
    }
    return { valid: true, message: 'Token válido' };
};