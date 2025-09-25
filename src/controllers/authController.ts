
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { oauth2Client, setTokens, getTokenStatus } from '../config/googleCalendar';
import User from '../models/user';

const oauth2 = google.oauth2('v2');

class AuthController {
  async authRedirect(req: Request, res: Response) {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/calendar'
        ],
        prompt: 'consent',
      });
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating authentication URL',
      });
    }
  }

  async oauth2Callback(req: Request, res: Response) {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Código de autorización no proporcionado',
        });
      }

      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      setTokens(tokens);

      // Obtener datos de perfil del usuario
      const { data: profile } = await oauth2.userinfo.get({ auth: oauth2Client });
      const email = profile.email || '';
      const name = profile.name || '';
      const picture = profile.picture || '';

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener el email de Google',
        });
      }

      // === NUEVO: asignar rol según ADMIN_EMAILS ===
      const admins = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
      const role = admins.includes(email) ? 'admin' : 'user';

      // Upsert usuario en la BD con rol
      const [user] = await User.upsert(
        { email, name, picture, role },
        { returning: true } as any
      );

      // === NUEVO: guardar refresh_token en BD si lo envía Google ===
      if (tokens.refresh_token) {
        await User.update(
          { refreshToken: tokens.refresh_token },
          { where: { email } }
        );
      }

      // Crear JWT propio para la sesión en la app
      const appToken = jwt.sign(
        { id: (user as any).id, email, role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '8h' }
      );

      return res.json({
        success: true,
        message: 'Autenticación exitosa',
        user: {
          id: (user as any).id,
          email,
          name,
          picture,
          role,
        },
        appToken,
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ? 'Recibido' : 'No recibido',
          expiry_date: tokens.expiry_date
        },
        next: 'Usá el appToken en Authorization: Bearer <token> para acceder a rutas protegidas'
      });
    } catch (error) {
      console.error('Error en callback de OAuth2:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el proceso de autenticación',
        details: error instanceof Error ? error.message : error
      });
    }
  }

  async tokenStatus(req: Request, res: Response) {
    try {
      const status = getTokenStatus();
      res.json(status);
    } catch {
      res.status(500).json({
        success: false,
        message: 'Error verificando tokens'
      });
    }
  }

  async checkAuth(req: Request, res: Response) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          authenticated: false,
          message: 'No hay token proporcionado',
        });
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          authenticated: false,
          message: 'Usuario no encontrado',
        });
      }

      res.json({
        authenticated: true,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role,
        },
      });
    } catch {
      res.status(401).json({
        authenticated: false,
        message: 'Token inválido',
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        message: 'Sesión cerrada correctamente',
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
      });
    }
  }
}

export default new AuthController();
