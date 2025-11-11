import { Request, Response } from "express";
import auditService from "../services/auditService";

const getAll = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 100);
    const audits = await auditService.getAllAudits(limit);
    res.json(audits);
  } catch (error) {
    console.error("auditController.getAll: error:", error);
    res.status(500).json({ message: "Error fetching audits" });
  }
};

export default { getAll };