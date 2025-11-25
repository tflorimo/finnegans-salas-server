import { Request, Response } from 'express';
import { auditService } from '../services/auditService';

class AuditController {

  /**
   * GET /audits
   * Obtiene auditorías paginadas y filtradas.
   * Requiere authenticate + requireAdmin.
   */
  async getAudits(req: Request, res: Response): Promise<void> {
    try {
      // req.query contiene page, perPage, action, reason, userEmail, startDate, endDate
      const audits = await auditService.listAudits(req.query);

      res.status(200).json({
        success: true,
        data: audits
      });
    } catch (error) {
      console.error("AuditController.getAudits error:", error);

      res.status(500).json({
        success: false,
        message: "Error interno al obtener auditorías."
      });
    }
  }
}

export default new AuditController();
