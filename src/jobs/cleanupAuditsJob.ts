import Audit from "../models/audit";
import { Op } from "sequelize";

export class CleanupAuditsJob {
  async execute(): Promise<void> {
    try {
      const days = 15;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000); // 15 días atrás
      const deleted = await Audit.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoff,
          },
        },
      });

      console.log(`CleanupAuditsJob: eliminados ${deleted} registros anteriores a ${cutoff.toISOString()}`);
    } catch (error) {
      console.error("CleanupAuditsJob: error al intentar eliminar audits antiguos:", error);
    }
  }
}

export default CleanupAuditsJob;