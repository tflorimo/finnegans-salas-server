# 📅 Finnegans - Sistema de Gestión de Salas de Reuniones

## 🎯 Descripción General

**Finnegans** es una plataforma backend de gestión integral de salas de reuniones y eventos empresariales. La aplicación sincroniza eventos desde Google Calendar, gestiona check-ins en tiempo real, predice ocupación de salas y mantiene un registro de auditoría completo de todas las operaciones.

### Propósito

Finnegans resuelve el problema de la **descoordinación en la ocupación de salas** al:
- Sincronizar automáticamente eventos de Google Calendar
- Detectar solapamientos de reservas
- Automatizar notificaciones de check-in
- Proporcionar predicciones de disponibilidad
- Mantener un historial auditable de todas las acciones

### Tipo de Aplicación

- **API REST** desarrollada con Node.js y Express
- Backend para aplicación web/móvil complementaria
- Microservicio de orquestación de eventos y salas

### Escenarios de Uso Principal

- Empresas medianas a grandes con múltiples salas
- Coordinación de espacios de coworking
- Instituciones educativas con aulas compartidas
- Cualquier organización que requiera gestión automatizada de reservas

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Runtime** | Node.js | 20.x o superior |
| **Framework Web** | Express.js | 4.18+ |
| **ORM** | Sequelize | 6.32+ |
| **Base de Datos** | MySQL | 8.0+ |
| **Lenguaje** | TypeScript | 5.1+ |
| **Autenticación** | JWT + OAuth2 (Google) | - |
| **Email** | Nodemailer | 7.0+ |
| **Scheduler** | Node-cron | 4.2+ |
| **Google APIs** | googleapis | 126.0+ |
| **Google Auth Library** | google-auth-library | 9.0+ |
| **Herramientas Dev** | dotenv, cors, nodemon | 16.3+, 2.8+, 3.1+ |

---

## 🚀 Getting Started

### Requisitos Previos

- **Node.js**: 20.0.0 o superior
  ```bash
  node --version  # Verifica la versión instalada
  ```
- **npm / pnpm**: Gerenciador de paquetes
  ```bash
  npm --version
  ```
- **MySQL**: 8.0 o superior
  ```bash
  mysql --version
  ```
- **Git**: Para clonar el repositorio

### Instalación Paso a Paso

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/tflorimo/finnegans-salas-server.git
cd finnegans-salas-server
```

#### 2. Instalar Dependencias

```bash
npm install
# o si prefieres pnpm
pnpm install
```

#### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto.

#### 4. Crear la Base de Datos

```bash
# Opción A: Crear manualmente en MySQL
mysql -u root -p
> CREATE DATABASE finnegans_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> EXIT;

# Opción B: Usar Sequelize CLI para migrar
npm run migrate
```

#### 5. Ejecutar Migraciones y Seeds

```bash
# Ejecutar todas las migraciones
npm run migrate

# (Opcional) Ejecutar seeders para datos de prueba
npm run seed
```

#### 6. Levantar el Servidor

**Modo Desarrollo** (con recarga automática):

```bash
npm run dev
```

**Modo Producción** (build + start):

```bash
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000`

---

## 📁 Arquitectura y Estructura del Proyecto

### Árbol de Carpetas

```
finnegans-salas-server/
├── src/
│   ├── app.ts                          # Configuración de Express
│   ├── server.ts                       # Punto de entrada del servidor
│   │
│   ├── config/                         # Configuración centralizada
│   │   ├── database.ts                 # Conexión a MySQL / Sequelize
│   │   ├── googleOAuth.ts              # Configuración OAuth2 Google
│   │   ├── nodemailer.ts               # Configuración de email
│   │   ├── authCookies.ts              # Configuración de cookies
│   │   └── oAuthAccess.ts              # Acceso a APIs de Google
│   │
│   ├── models/                         # Modelos de datos (Sequelize)
│   │   ├── user.ts                     # Entidad Usuario
│   │   ├── room.ts                     # Entidad Sala
│   │   ├── event.ts                    # Entidad Evento
│   │   ├── audit.ts                    # Entidad Auditoría
│   │   ├── forecast.ts                 # Entidad Predicción
│   │   ├── assoc.ts                    # Asociaciones entre modelos
│   │   └── *.types.ts                  # Tipos TypeScript
│   │
│   ├── routes/                         # Definición de endpoints
│   │   ├── authRoutes.ts               # Endpoints de autenticación
│   │   ├── eventRoutes.ts              # Endpoints de eventos
│   │   ├── roomRoutes.ts               # Endpoints de salas
│   │   ├── auditRoutes.ts              # Endpoints de auditoría
│   │   ├── forecastRoutes.ts           # Endpoints de predicción
│   │   └── index.ts                    # Agregador de rutas
│   │
│   ├── controllers/                    # Controladores (orquestación)
│   │   ├── authController.ts           # Lógica de autenticación
│   │   ├── eventController.ts          # Lógica de eventos
│   │   ├── roomController.ts           # Lógica de salas
│   │   ├── auditController.ts          # Lógica de auditoría
│   │   └── forecastController.ts       # Lógica de predicción
│   │
│   ├── services/                       # Servicios (lógica de negocio)
│   │   ├── authService.ts              # Autenticación y autorización
│   │   ├── eventService.ts             # Lógica de eventos
│   │   ├── roomService.ts              # Lógica de salas
│   │   ├── auditService.ts             # Registro y consulta de auditoría
│   │   ├── checkInService.ts           # Lógica de check-in
│   │   ├── checkInSyncService.ts       # Sincronización de check-ins
│   │   ├── calendarSyncService.ts      # Sincronización Google Calendar
│   │   ├── overlapService.ts           # Detección de solapamientos
│   │   ├── currentEventService.ts      # Eventos activos actuales
│   │   ├── forecastService.ts          # Predicción de ocupación
│   │   ├── jwtService.ts               # Manejo de JWT
│   │   ├── nodemailerService.ts        # Envío de emails
│   │   ├── userService.ts              # Lógica de usuarios
│   │   └── *.ts                        # Otros servicios
│   │
│   ├── middleware/                     # Middlewares de Express
│   │   ├── auth.ts                     # Autenticación y autorización
│   │   └── errorHandler.ts             # Manejo global de errores
│   │
│   ├── utils/                          # Funciones auxiliares
│   │   ├── dateUtils.ts                # Utilidades de fechas
│   │   ├── checkInUtils.ts             # Utilidades de check-in
│   │   ├── paginationUtils.ts          # Paginación y filtros
│   │   ├── stringUtils.ts              # Procesamiento de strings
│   │   ├── logUtils.ts                 # Utilidades de logging
│   │   └── mappers/                    # Mapeo entre entidades y DTOs
│   │       ├── eventMapper.ts
│   │       ├── roomMapper.ts
│   │       └── auditMapper.ts
│   │
│   ├── dtos/                           # Data Transfer Objects
│   │   ├── eventDTO.ts                 # DTOs de eventos
│   │   ├── roomDTO.ts                  # DTOs de salas
│   │   ├── auditDTO.ts                 # DTOs de auditoría
│   │   ├── checkInResultDTO.ts         # DTOs de check-in
│   │   └── paginationDTO.ts            # DTOs de paginación
│   │
│   ├── constants/                      # Constantes de negocio
│   │   ├── auditActions.ts             # Acciones auditables
│   │   ├── eventStatuses.ts            # Estados de eventos
│   │   └── checkInErrors.ts            # Códigos de error
│   │
│   ├── errors/                         # Manejo de errores
│   │   ├── AppError.ts                 # Clase base de errores
│   │   └── errorCodes.ts               # Códigos HTTP y de error
│   │
│   ├── jobs/                           # Jobs de procesamiento
│   │   ├── syncCalendarEvents.ts       # Sincronización de Google Calendar
│   │   ├── syncLocalResources.ts       # Sincronización de recursos locales
│   │   └── syncApiRoomResources.ts     # Sincronización de salas API
│   │
│   ├── schedulers/                     # Programación de tareas
│   │   ├── cronScheduler.ts            # Motor de cron
│   │   └── cronSetup.ts                # Configuración de tareas programadas
│   │
│   ├── templates/                      # Plantillas de email
│   │   └── emailTemplates.ts           # Diseño HTML de emails
│   │
│   └── auth/                           # Credenciales (gitignored)
│       └── service_account_key.json    # Clave de Google Service Account
│
├── .env.example                        # Ejemplo de variables de entorno
├── .env                                # Variables de entorno (gitignored)
├── .eslintrc.json                      # Configuración de ESLint
├── tsconfig.json                       # Configuración de TypeScript
├── tsconfig.build.json                 # Configuración de build
├── package.json                        # Dependencias del proyecto
├── package-lock.json                   # Lock de dependencias
└── README.md                           # Este archivo
```

### Patrones Arquitectónicos

El proyecto sigue una **arquitectura en capas** (Layered Architecture) con clara separación de responsabilidades:

```
HTTP Request
     ↓
[Routes]           ← Define endpoints y valida
     ↓
[Controllers]      ← Orquesta y prepara datos
     ↓
[Services]         ← Lógica de negocio central
     ↓
[Models/DB]        ← Acceso a datos con Sequelize
     ↓
[MySQL]            ← Persistencia
```

**Principios aplicados:**

- **SOLID**: Single Responsibility, Open/Closed, Dependency Inversion
- **MVC mejorado**: Separación entre Controllers, Services y Models
- **DTOs**: Data Transfer Objects para desacoplar API de lógica interna
- **Mappers**: Transformación de datos entre capas sin exponer modelos internos
- **Fire-and-Forget**: Auditorías se registran sin bloquear respuestas HTTP

---

## 🏗️ Enfoque Técnico y Arquitectura

### Separación de Capas

#### 1. **Capa de Presentación (Routes & Controllers)**

```typescript
// routes/eventRoutes.ts
router.get('/events', authMiddleware, eventController.getAllEvents);

// controllers/eventController.ts
async getAllEvents(req: Request, res: Response) {
  const events = await eventService.getAllEvents(req.query);
  res.json({ success: true, data: events });
}
```

- Los controllers reciben HTTP requests y delegadas a servicios
- Validación de entrada en middlers y DTOs
- Respuestas HTTP estandarizadas

#### 2. **Capa de Lógica de Negocio (Services)**

```typescript
// services/eventService.ts
async getAllEvents(queryParams: any): Promise<EventListResponseDTO> {
  // Lógica de negocio pura
  // Orquestación de múltiples fuentes de datos
  // Transformación y enriquecimiento de datos
}
```

- Services contienen toda la lógica de negocio
- Independientes de HTTP, pueden ser reutilizados
- Reutilización entre controladores

#### 3. **Capa de Acceso a Datos (Models & Sequelize)**

```typescript
// models/event.ts
class Event extends Model { ... }

// En services
const events = await Event.findAll({ where: {...} });
```

- Sequelize ORM maneja la comunicación con MySQL
- Queries optimizadas con índices y relaciones
- Validaciones a nivel de modelo

### Características de Arquitectura

#### ✅ **Sincronización Bidireccional con Google Calendar**

El sistema mantiene sincronía automática:
- Eventos locales → Google Calendar (crear/editar/eliminar)
- Google Calendar → Base de datos (cambios remotos)
- Cron jobs ejecutan sincronización cada minuto

#### ✅ **Detección Automática de Solapamientos**

```typescript
// services/overlapService.ts
- Identifica eventos que solapan en la misma sala
- Marca eventos con estado `OVERLAPPED`
- Permite resolución manual o automática
```

#### ✅ **Sistema de Auditoría Centralizado**

```typescript
// services/auditService.ts
- Registra TODAS las acciones (login, check-in, cambios, etc.)
- Fire-and-forget: no bloquea operaciones principales
- Búsqueda global por usuario, evento, sala, fecha
```

#### ✅ **Predicción Inteligente de Ocupación**

```typescript
// services/forecastService.ts
- Analiza patrones históricos
- Predice disponibilidad futura
- Ayuda a planificación de capacidad
```

#### ✅ **Check-in con Notificaciones Automáticas**

```typescript
// services/checkInSyncService.ts
- Envía recordatorios 10 minutos antes
- Anti-duplicados con locks y Map temporal
- Marca check-in exitoso/fallido con razón
```

### Buenas Prácticas Implementadas

| Práctica | Implementación |
|----------|---------------|
| **Manejo de Errores** | Middleware global `errorHandler` con respuestas consistentes |
| **Validación** | Joi en DTOs + validación custom en servicios |
| **CORS** | Configurado en app.ts con dominios permitidos |
| **Autenticación** | JWT en headers + OAuth2 Google |
| **Autorización** | Middleware `auth` verifica roles y permisos |
| **SQL Injection** | Sequelize ORM previene automaticamente |
| **Logging** | Logs estructurados con timestamps y contexto |
| **DTOs** | Separan modelos internos de respuestas API |
| **Paginación** | PaginationUtils reutilizable en todos los endpoints |
| **Búsqueda Global** | Parámetro `search` busca en múltiples campos |
| **Composición** | Services inyectados en controllers |
| **Transacciones** | Sequelize maneja consistency automático |

---

## ⚡ Performance y Optimizaciones

### Optimizaciones Implementadas

#### 1. **Pool de Conexiones a MySQL**

```typescript
// config/database.ts
sequelize = new Sequelize({
  pool: {
    max: 5,           // Máximo de conexiones
    min: 2,           // Mínimo de conexiones
    acquire: 30000,   // Timeout de adquisición
    idle: 10000       // Timeout ocioso
  }
});
```

- Reutilización de conexiones
- Mejor uso de memoria
- Mejor concurrencia

#### 2. **Paginación en Todas las Listas**

```typescript
// Todos los endpoints de listado:
GET /api/events?page=1&perPage=25&search=reunion
GET /api/audits?page=1&perPage=50
```

- Previene carga masiva de datos
- Respuestas rápidas incluso con millones de registros
- Búsqueda global optimizada

#### 3. **Índices de Base de Datos**

```sql
-- Índices creados en migrations
CREATE INDEX idx_events_room ON events(roomEmail);
CREATE INDEX idx_events_creator ON events(creatorMail);
CREATE INDEX idx_events_start_time ON events(startTime);
CREATE INDEX idx_audits_user ON audits(userEmail);
CREATE INDEX idx_audits_action ON audits(action);
```

- Búsquedas O(log n) en lugar de O(n)
- Filtros rápidos en paginación`

#### 4. **Fire-and-Forget para Auditoría**

```typescript
// No espera respuesta, no bloquea
auditService.recordEventCreated(eventId, eventTitle, roomName)
  .catch(err => console.error(err));
```

- Operación HTTP responde rápido
- Auditoría se registra en background

#### 5. **Cron Jobs Optimizados**

```typescript
// cronSetup.ts
- Sincronización Google Calendar: cada 1 minuto
- Limpieza local de estados: cada 15 segundos
- Sincronización de salas: cada 7 días
```

- Ejecución inteligente según necesidad
- Sin bloqueos en endpoint principal
- Distribución de carga en tiempo

#### 6. **DTOs y Mappers Ligeros**

```typescript
// Transformación mínima: solo campos necesarios
const eventListItem = mapEventToListItem(event);
// Resultado: JSON comprimible, sin datos innecesarios
```

- Payloads JSON más pequeños
- Transmisión más rápida
- Ancho de banda reducido

#### 7. **Compresión de Respuestas**

```typescript
// app.ts
app.use(compression());  // Activa gzip automático
```

- Respuestas hasta 80% más pequeñas
- Transparente para cliente

## 🗄️ Diagrama Entidad-Relación (DER)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINNEGANS - DER COMPLETO                            │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    USERS     │
                              ├──────────────┤
                              │ id (PK)      │
                              │ email        │
                              │ name         │
                              │ role         │
                              │ photo        │
                              └──────────────┘
                                     │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
            (1:N) │              (1:N) │              (1:N) │
                  ▼                    ▼                    ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │     EVENTS       │ │     AUDITS       │ │   FORECASTS      │
        ├──────────────────┤ ├──────────────────┤ ├──────────────────┤
        │ id (PK)          │ │ id (PK)          │ │ id (PK)          │
        │ title            │ │ userEmail (FK)   │ │ userId (FK)      │
        │ startTime        │ │ action           │ │ roomEmail (FK)   │
        │ endTime          │ │ eventId (FK)     │ │ date             │
        │ roomEmail (FK)   │ │ roomEmail (FK)   │ │ capacity         │
        │ creatorMail (FK) │ │ info             │ │ createdAt        │
        │ checkInStatus    │ │ createdAt        │ │ updatedAt        │
        │ overlapStatus    │ └──────────────────┘ └──────────────────┘
        │ attendees (JSON) │
        │ deleted          │
        │ createdAt        │
        │ updatedAt        │
        └──────────────────┘
                  │
            (1:N) │
                  ▼
        ┌──────────────────┐
        │    OVERLAPS      │
        ├──────────────────┤
        │ id (PK)          │
        │ primaryEventId   │
        │ overlappingEvent │
        └──────────────────┘

        ┌──────────────────────────┐
        │       ROOMS              │
        ├──────────────────────────┤
        │ email (PK)               │
        │ name                     │
        │ capacity                 │
        │ floor                    │
        │ building                 │
        │ isBusy                   │
        │ currentEventId (FK) ┐    │  ◄────┐
        │ deleted              │    │       │
        │ createdAt            │    │       │
        │ updatedAt            │    │   (1:N) RELATION
        └──────────────────────────┘       │
                  ▲                        │
            (1:N) │                        │
                  │                   (0:1) │
            ┌─────┴────────────────────────┘
            │  (EVENTS via roomEmail)
            │  (FORECASTS via roomEmail)
            │  (AUDITS via roomEmail)
            │  (OVERLAPS - if events are in same room)

RELACIONES PRINCIPALES:
┌──────────────────────────────────────────────────────────────────┐
│ USERS (1) → (N) EVENTS              via creatorMail             │
│ USERS (1) → (N) AUDITS              via userEmail               │
│ USERS (1) → (N) FORECASTS           via userId                  │
│ ROOMS (1) → (N) EVENTS              via roomEmail               │
│ ROOMS (1) → (N) AUDITS              via roomEmail               │
│ ROOMS (1) → (N) FORECASTS           via roomEmail               │
│ EVENTS (1) → (N) AUDITS             via eventId                 │
│ EVENTS (1) → (N) OVERLAPS           via primaryEventId          │
│ ROOMS (1) → (0:1) EVENTS            via currentEventId (current) │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Endpoints Principales

### Autenticación

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    }
  }
}
```

### Eventos

```http
GET /api/events?page=1&perPage=25&search=reunion

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "evt_123",
        "title": "Reunión Q1",
        "creatorMail": "john@example.com",
        "creatorName": "John Doe",
        "roomEmail": "sala.1@example.com",
        "roomName": "Sala 1",
        "startTime": "2025-12-15T10:00:00Z",
        "endTime": "2025-12-15T11:00:00Z",
        "checkInStatus": "PENDING",
        "overlapStatus": "PRIMARY"
      }
    ],
    "total": 150,
    "page": 1,
    "perPage": 25,
    "totalPages": 6
  }
}
```

```http
POST /api/events/:eventId/check-in

{
  "userEmail": "attendee@example.com"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Check-in exitoso"
  }
}
```

### Salas

```http
GET /api/rooms

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "email": "sala.1@example.com",
      "name": "Sala 1",
      "capacity": 10,
      "floor": 2,
      "building": "A",
      "isBusy": false,
      "currentEvent": null
    }
  ]
}
```

### Auditoría

```http
GET /api/audits?page=1&perPage=50&action=CHECKIN_SUCCESS&search=john

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "aud_456",
        "userEmail": "john@example.com",
        "action": "CHECKIN_SUCCESS",
        "eventId": "evt_123",
        "roomEmail": "sala.1@example.com",
        "info": "Usuario: John Doe, Evento: Reunión Q1, Sala: Sala 1",
        "createdAt": "2025-12-15T10:05:00Z"
      }
    ],
    "total": 342,
    "page": 1,
    "perPage": 50,
    "totalPages": 7
  }
}
```

**Para documentación completa de API**: Consulta Postman Collection (enlace en sección de recursos).

---

## 🔐 Seguridad

### Autenticación y Autorización

- **JWT**: Tokens con expiración configurable (default: 7 días)
- **OAuth2 Google**: Integración nativa con Google Workspace
- **Roles**: Admin, Manager, User con permisos diferenciados
- **Middleware Auth**: Valida token y permisos en cada endpoint protegido

### Sanitización y Prevención

| Amenaza | Mitigación |
|---------|-----------|
| **SQL Injection** | Sequelize ORM con parameterized queries |
| **XSS** | express-validator para sanitización de inputs |
| **CSRF** | Validación de origen en CORS |
| **Contraseñas débiles** | jsonwebtoken para manejo seguro de tokens |
| **Secrets en código** | Variables de entorno, .env gitignored |

### Headers de Seguridad

```typescript
// Helmet no está actualmente instalado, pero se recomienda
// npm install helmet
// app.use(helmet()); // Activa automáticamente:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security (HTTPS)
```

### CORS Configurado

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

---

## 📦 Variables de Entorno

### Cómo Configurar en Producción

1. **Usa un gestor de secretos** (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **Nunca hagas commit de `.env`** (ya está en `.gitignore`)
3. **Regenera `JWT_SECRET`** antes de desplegar
4. **Usa contraseñas fuertes** en DB y servicios externos
5. **Habilita HTTPS** en producción

---

## 🚢 Despliegue (Deployment)

### Despliegue en Servidor Propio

#### Requisitos

- Servidor Linux (Ubuntu 20.04 LTS recomendado)
- Node.js 18+ y npm
- MySQL 8.0+ en la misma máquina o servidor remoto
- Acceso SSH

#### Pasos

```bash
# 1. Conectar al servidor
ssh user@your_server_ip

# 2. Clonar repositorio
git clone https://github.com/tflorimo/finnegans-salas-server.git
cd finnegans-salas-server

# 3. Instalar dependencias
npm ci --production

# 4. Configurar .env con credenciales de producción
nano .env  # O usar tu editor preferido

# 5. Ejecutar migraciones
npm run migrate

# 6. Compilar TypeScript
npm run build

# 7. Instalar PM2 (process manager)
npm install -g pm2

# 8. Iniciar app con PM2
pm2 start dist/server.js --name "finnegans-api"
pm2 save  # Persiste configuración
pm2 startup  # Auto-inicia con el servidor
```

### Despliegue con Docker & Docker Compose

#### `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 5s
      retries: 10

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      DB_PORT: 3306
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - ./auth:/app/auth:ro
    restart: always

volumes:
  mysql_data:
```

#### Levantar con Docker

```bash
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Ejecutar migraciones
docker-compose exec api npm run migrate

# Detener
docker-compose down
```

### Despliegue en Plataformas PaaS

#### Heroku

```bash
# 1. Instalar Heroku CLI
# (Seguir instrucciones en heroku.com)

# 2. Login
heroku login

# 3. Crear app
heroku create finnegans-api

# 4. Agregar MySQL (ClearDB o JawsDB)
heroku addons:create cleardb:ignite

# 5. Configurar variables de entorno
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production

# 6. Deploy
git push heroku main

# 7. Ejecutar migraciones
heroku run npm run migrate
```

#### Render.com

```bash
# 1. Conectar repositorio en Render dashboard
# 2. Crear servicio Web
# 3. Configurar:
#    Build Command: npm install && npm run build
#    Start Command: npm start
# 4. Agregar variables de entorno en Environment
# 5. Crear servicio MySQL externo (recomendado: AWS RDS)
# 6. Deploy automático en push a main
```

#### AWS EC2 + RDS

```bash
# 1. Crear EC2 instance (t3.micro gratis en free tier)
# 2. Crear RDS MySQL instance
# 3. Configurar Security Groups para comunicación
# 4. SSH a EC2 y seguir "Pasos de Servidor Propio"
# 5. Usar Route53 para DNS
# 6. CloudFront para CDN (opcional)
```

### CI/CD con GitHub Actions

#### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main, production]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/production'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST \
            https://api.render.com/deploy/srv-xxx?key=${{ secrets.RENDER_DEPLOY_KEY }}
```

---

## 🧪 Testing y Calidad de Código

### Estructura Actual

```typescript
// Tests no están actualmente implementados
// TODO: Agregar suite de tests completa
```

### Plan de Testing

#### Unit Tests (Jest) - A Implementar

```bash
npm install --save-dev jest @types/jest ts-jest
```

```typescript
// __tests__/services/eventService.test.ts
describe('EventService', () => {
  describe('getAllEvents', () => {
    it('should return paginated events', async () => {
      const result = await eventService.getAllEvents({
        page: 1,
        perPage: 25
      });
      expect(result.items).toHaveLength(25);
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
```

#### Integration Tests (Supertest) - A Implementar

```typescript
// __tests__/api/events.integration.test.ts
describe('GET /api/events', () => {
  it('should return 200 with events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
```

#### Ejecución - A Implementar

```bash
npm install --save-dev supertest @types/jest
npm test              # Run all tests (cuando se implementen)
npm run test:watch   # Watch mode (cuando se implementen)
npm run test:coverage # Coverage report (cuando se implementen)
```

### Linting y Formatting

#### ESLint - A Instalar

```bash
npm install --save-dev eslint @types/eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

#### Prettier - A Instalar

```bash
npm install --save-dev prettier
```

#### Pre-commit Hooks (Husky) - A Instalar

```bash
npm install --save-dev husky lint-staged
husky install

# Auto-lint antes de commit
```

## 🤝 Contribución

### Workflow de Desarrollo

1. **Fork** el repositorio
2. **Crear rama feature**
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```
3. **Hacer cambios** siguiendo estándares
4. **Commit** con mensajes claros
   ```bash
   git commit -m "feat: agregar búsqueda global"
   ```
5. **Push** a tu fork
6. **Pull Request** contra `dev` branch

### Estándares de Commit

Seguimos **Conventional Commits**:

```
feat: nueva funcionalidad
fix: corregir bug
docs: cambios de documentación
style: formato de código (sin lógica)
refactor: refactoring de código
test: agregar tests
chore: tasks de build/dependencias
```

### Estándares de Código

- **TypeScript**: Strict mode activado
- **Nombrado**: camelCase para variables/funciones, PascalCase para clases
- **Línea máxima**: 100 caracteres
- **Indentación**: 2 espacios
- **Exports**: Preferir `export default` para servicios singleton
- **Comments**: Mínimos, solo para lógica compleja

### Checklist Antes de PR

- [ ] Linter pasa (`npm run lint`)
- [ ] Código formateado (`npm run format`)
- [ ] Documentación actualizada
- [ ] Commit messages claros
- [ ] No hay console.log en código final

---

## 📝 Licencia

Este proyecto está bajo licencia **MIT**. Consulta el archivo `LICENSE` para detalles.

---

## 📞 Contacto y Recursos

### Recursos Útiles

- **[Postman Collection](https://www.postman.com/collection/link)** - Documentación interactiva de API
- **[Swagger / OpenAPI](http://localhost:3000/api-docs)** - En desarrollo
- **[Issues](https://github.com/tflorimo/finnegans-salas-server/issues)** - Reportar bugs o sugerir features

### FAQ

#### ¿Cómo cambio la frecuencia de sincronización de Google Calendar?

Edita `.env` y ajusta `CRON_CALENDAR_EVENTS_SYNC`:
```env
CRON_CALENDAR_EVENTS_SYNC=*/5 * * * *  # Cada 5 minutos
```

#### ¿Cómo agrego una nueva acción de auditoría?

1. Agrega la acción a `src/constants/auditActions.ts`
2. Crea método en `src/services/auditService.ts`
3. Llama el método desde tu servicio

#### ¿Cómo debuggueo en desarrollo?

```bash
NODE_DEBUG=* npm run dev  # Debug verbose
# O usa VS Code debugger con launch.json
```

#### ¿Cómo migro de dev a producción?

1. Ejecuta migraciones: `npm run migrate`
2. Compila TS: `npm run build`
3. Inicia con PM2: `pm2 start dist/server.js`
4. Verifica logs: `pm2 logs`

---

## 📚 Apéndice: Changelog

### v1.0.0 (2025-12-01)

- ✅ Sistema de autenticación OAuth2 + JWT
- ✅ Sincronización bidireccional Google Calendar
- ✅ Gestión de check-in con notificaciones email
- ✅ Detección automática de solapamientos
- ✅ Sistema de auditoría completo
- ✅ Predicción de ocupación de salas
- ✅ Paginación y búsqueda global
- ✅ Manejo centralizado de errores
- ✅ DTOs y mappers para separación de capas

### v0.9.0 (Desarrollo)

- 🔄 Mejoras de performance
- 🔄 Suite de tests
- 🔄 Documentation de Swagger
- 🔄 Rate limiting

---

**Última actualización**: 1 de Diciembre, 2025

**Versión**: 1.0.0

**Estado**: Listo para producción
