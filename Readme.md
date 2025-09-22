# Finnegans Salas – Backend

Backend en **Node.js + TypeScript** para la gestión de reservas de salas, integrado con **Google Calendar**.

## Características principales
- **Autenticación con Google OAuth2**  
  Inicio de sesión seguro mediante cuentas de Google.
- **Autorización con JWT interno**  
  El backend emite un token propio para proteger las rutas y gestionar roles (admin/usuario).
- **Integración con Google Calendar**  
  Consulta y sincronización de eventos en calendarios de Google.
- **Base de datos MySQL**  
  Modelos gestionados con Sequelize: `User`, `Room` y `Event`.
- Arquitectura **MVC** organizada en controladores, servicios y middlewares.

## Tecnologías
- Node.js / Express
- TypeScript
- Sequelize (MySQL)
- Google APIs (OAuth2 & Calendar)
- JSON Web Tokens (JWT)
- Cors

## Scaffold
<img width="586" height="515" alt="image" src="https://github.com/user-attachments/assets/aff0d37b-eb0d-48f1-be07-853e133acd79" />


## Rutas
http://localhost:3000/api/auth/google ---> link de autenticación 
http://localhost:3000/api/calendar/events ----> consume los eventos directo del calendar

## Proximo
Diseño de BD y despliegue , creacion de modelos , diseño de logica de negocio , jobs , middlewares , logica de permisos para el admin , logs , dtos , utils 
