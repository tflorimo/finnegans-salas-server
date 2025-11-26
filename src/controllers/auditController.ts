import { Request, Response, NextFunction } from 'express';
import auditService from '../services/auditService';

class AuditController {

  /**
   * GET /audits
   * Obtiene auditorías paginadas y filtradas.
   * Requiere authenticate + requireAdmin.
   */
  async getAudits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const audits = await auditService.listAudits(req.query);

      res.status(200).json(audits);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditController();
