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

const COLORS = {
  PRIMARY_DARK: '#1a2332',
  PRIMARY_LIGHT: '#4bc3fe',
  SECONDARY_DARK: '#2c3e50',
  SECONDARY_LIGHT: '#34495e',
  BACKGROUND: '#f4f4f4',
  WHITE: '#ffffff',
  GRAY_LIGHT: '#ecf0f1',
  GRAY_MEDIUM: '#7f8c8d',
  GRAY_DARK: '#333333',
  TEXT_SECONDARY: '#7f8c8d',
  BORDER_COLOR: '#3498db',
} as const;

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
      background-color: ${COLORS.BACKGROUND};
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: ${COLORS.WHITE};
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: ${COLORS.PRIMARY_DARK};
      padding: 40px 30px;
      text-align: center;
    }
    .logo-text {
      color: ${COLORS.PRIMARY_LIGHT};
      font-size: 48px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 2px;
      font-family: 'Arial', sans-serif;
    }
    .logo-subtitle {
      color: ${COLORS.PRIMARY_LIGHT};
      font-size: 14px;
      margin: 5px 0 0 0;
      letter-spacing: 3px;
      font-weight: 300;
    }
    .content {
      padding: 40px 30px;
      color: ${COLORS.GRAY_DARK};
      line-height: 1.6;
    }
    .content h1 {
      color: ${COLORS.SECONDARY_DARK};
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
    }
    .highlight-box {
      background-color: ${COLORS.GRAY_LIGHT};
      border-left: 4px solid ${COLORS.BORDER_COLOR};
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      background-color: ${COLORS.GRAY_LIGHT};
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: ${COLORS.GRAY_MEDIUM};
    }
    .footer p {
      margin: 5px 0;
    }
    .address {
      color: ${COLORS.SECONDARY_LIGHT};
      font-weight: 500;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">Finnegans</h1>
      <p class="logo-subtitle">Gestor de reservas</p>
    </div>
    ${content}
    <div class="footer">
      <p class="address">📍 Santos Dumont 4088, Ciudad de Buenos Aires, Argentina</p>
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
        <li>Realizar el check-in de tus eventos</li>
        <li>Consultar la agenda general del edificio y visualizar el estado en tiempo real de las salas.</li>
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
      <h1>Recordatorio de Check-in</h1>
      <p>Hola <strong>${params.userName}</strong>,</p>
      <p>Te recordamos que tu evento está próximo a comenzar y necesitamos que realices el check-in.</p>
      
      <div class="highlight-box">
        <p><strong>Detalles del evento:</strong></p>
        <p>📅 Evento: ${params.eventName}</p>
        <p>🚪 Sala: ${params.roomName}</p>
        <p>🕐 Hora de inicio: ${params.startTime}</p>
      </div>
      
      <p><strong>Importante:</strong> Tienes una ventana de <strong>10 minutos</strong> antes hasta <strong>15 minutos</strong> después del inicio del evento para realizar el check-in.</p>
      
      <p>Si no realizas el check-in a tiempo, tu reserva podría ser cancelada y la sala asignada a otro evento.</p>
      
      <p>Accede al sistema ahora para confirmar tu asistencia.</p>
    </div>
  `;

  return getBaseTemplate(content);
};

export const getCheckInSuccessTemplate = (params: CheckInSuccessParams): string => {
  const content = `
    <div class="content">
      <h1>Check-in realizado con éxito</h1>
      <p>Hola <strong>${params.userName}</strong>,</p>
      <p>Hemos registrado tu check-in sin inconvenientes.</p>
      
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
