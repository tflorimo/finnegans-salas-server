interface BaseUserParams {
  userName: string | "Usuario desconocido";
}

interface BaseEventParams extends BaseUserParams {
  eventName: string;
  roomName: string;
}

interface UserCreatedParams extends BaseUserParams {
  userEmail: string;
  role: string;
}

interface CheckInReminderParams extends BaseEventParams {
  startTime: string;
}

interface CheckInSuccessParams extends BaseEventParams {
  checkInTime: string;
}

const getBaseTemplate = (content: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finnegans Salas</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #2c3e50;
      padding: 30px;
      text-align: center;
    }
    .header img {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .content h1 {
      color: #2c3e50;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
    }
    .highlight-box {
      background-color: #ecf0f1;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3498db;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      background-color: #ecf0f1;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:company-logo" alt="Finnegans Salas" />
    </div>
    ${content}
    <div class="footer">
      <p>Este es un correo automático, por favor no responder.</p>
      <p>© ${new Date().getFullYear()} Finnegans Salas. Todos los derechos reservados.</p>
      <p>Si no deseas recibir estos correos, contacta con el administrador del sistema.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const getUserCreatedTemplate = (params: UserCreatedParams): string => {
  const content = `
    <div class="content">
      <h1>¡Bienvenido a Finnegans Salas!</h1>
      <p>Hola <strong>${params.userName}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente en el sistema de gestión de salas Finnegans.</p>
      
      <div class="highlight-box">
        <p><strong>Detalles de tu cuenta:</strong></p>
        <p>📧 Email: ${params.userEmail}</p>
        <p>👤 Rol: ${params.role}</p>
      </div>
      
      <p>Ahora puedes acceder al sistema para:</p>
      <ul>
        <li>Reservar salas para tus reuniones</li>
        <li>Realizar check-in de tus eventos</li>
        <li>Gestionar tus reservas</li>
      </ul>
      
      <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar con el equipo de soporte.</p>
      
      <p>¡Gracias por usar Finnegans Salas!</p>
    </div>
  `;
  
  return getBaseTemplate(content);
};

export const getCheckInReminderTemplate = (params: CheckInReminderParams): string => {
  const content = `
    <div class="content">
      <h1>⏰ Recordatorio de Check-in</h1>
      <p>Hola <strong>${params.userName}</strong>,</p>
      <p>Te recordamos que tu evento está próximo a comenzar y necesitas hacer check-in.</p>
      
      <div class="highlight-box">
        <p><strong>Detalles del evento:</strong></p>
        <p>📅 Evento: ${params.eventName}</p>
        <p>🚪 Sala: ${params.roomName}</p>
        <p>🕐 Hora de inicio: ${params.startTime}</p>
      </div>
      
      <p><strong>Importante:</strong> Tienes una ventana de <strong>10 minutos</strong> antes del inicio del evento para realizar el check-in.</p>
      
      <p>Si no realizas el check-in a tiempo, tu reserva podría ser cancelada y la sala asignada a otro evento.</p>
      
      <p>Accede al sistema ahora para confirmar tu asistencia.</p>
    </div>
  `;
  
  return getBaseTemplate(content);
};

export const getCheckInSuccessTemplate = (params: CheckInSuccessParams): string => {
  const content = `
    <div class="content">
      <h1>✅ Check-in Confirmado</h1>
      <p>Hola <strong>${params.userName}</strong>,</p>
      <p>Tu check-in ha sido registrado exitosamente.</p>
      
      <div class="highlight-box">
        <p><strong>Confirmación:</strong></p>
        <p>📅 Evento: ${params.eventName}</p>
        <p>🚪 Sala: ${params.roomName}</p>
        <p>✅ Check-in realizado: ${params.checkInTime}</p>
      </div>
      
      <p>Tu sala está confirmada y lista para usar.</p>
      
      <p><strong>Recuerda:</strong></p>
      <ul>
        <li>Mantén la sala limpia y ordenada</li>
        <li>Respeta el horario de finalización de tu reserva</li>
        <li>Reporta cualquier problema técnico al equipo de soporte</li>
      </ul>
      
      <p>¡Que tengas una excelente reunión!</p>
    </div>
  `;
  
  return getBaseTemplate(content);
};

export const getUserCreatedTextTemplate = (params: UserCreatedParams): string => {
  return `
¡Bienvenido a Finnegans Salas!

Hola ${params.userName},

Tu cuenta ha sido creada exitosamente en el sistema de gestión de salas Finnegans.

Detalles de tu cuenta:
- Email: ${params.userEmail}
- Rol: ${params.role}

Ahora puedes acceder al sistema para reservar salas, realizar check-in y gestionar tus reservas.

Este es un correo automático, por favor no responder.
© ${new Date().getFullYear()} Finnegans Salas
  `.trim();
};

export const getCheckInReminderTextTemplate = (params: CheckInReminderParams): string => {
  return `
Recordatorio de Check-in

Hola ${params.userName},

Te recordamos que tu evento está próximo a comenzar y necesitas hacer check-in.

Detalles del evento:
- Evento: ${params.eventName}
- Sala: ${params.roomName}
- Hora de inicio: ${params.startTime}

Importante: Tienes una ventana de 10 minutos antes del inicio del evento para realizar el check-in.

Este es un correo automático, por favor no responder.
© ${new Date().getFullYear()} Finnegans Salas
  `.trim();
};

export const getCheckInSuccessTextTemplate = (params: CheckInSuccessParams): string => {
  return `
Check-in Confirmado

Hola ${params.userName},

Tu check-in ha sido registrado exitosamente.

Confirmación:
- Evento: ${params.eventName}
- Sala: ${params.roomName}
- Check-in realizado: ${params.checkInTime}

Tu sala está confirmada y lista para usar.

Este es un correo automático, por favor no responder.
© ${new Date().getFullYear()} Finnegans Salas
  `.trim();
};
