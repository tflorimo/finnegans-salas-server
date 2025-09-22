// src/app.ts
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

/**
 * Configuración de CORS
 * Permite que solo el dominio especificado en FRONTEND_URL
 * pueda hacer solicitudes a este backend.
 * También habilita credenciales (cookies, headers de autorización, etc.).
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  })
);

// Middleware para parsear JSON en el cuerpo de las peticiones
app.use(express.json());

// Monta todas las rutas de la API
app.use('/api', routes);

export default app;
