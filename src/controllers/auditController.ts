import { Request, Response } from 'express';
import { auditService } from '../services/auditService';

export async function getAudits(req: Request, res: Response) {
    try {
        const data = await auditService.listAudits(req.query);
        res.json(data);
    } catch (err) {
        console.error("Error in getAudits:", err);
        res.status(500).json({ error: 'server_error' });
    }
}

export default { getAudits };