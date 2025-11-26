import { Op } from 'sequelize';

export const normalizePage = (page?: number): number => {
  return Math.max(1, page ?? 1);
};

export const normalizePerPage = (perPage?: number, maxPerPage: number = 200): number => {
  return Math.min(maxPerPage, Math.max(1, perPage ?? 25));
};

export const calculateOffset = (page: number, perPage: number): number => {
  return (page - 1) * perPage;
};

export const calculateTotalPages = (total: number, perPage: number): number => {
  return Math.ceil(total / perPage);
};

export const buildDateRangeFilter = (startDate?: string, endDate?: string): any => {
  if (!startDate && !endDate) return undefined;

  const filter: any = {};
  if (startDate) filter[Op.gte] = new Date(startDate);
  if (endDate) filter[Op.lte] = new Date(endDate);
  return filter;
};

export const buildAuditFilters = (queryParams: any): any => {
  const where: any = {};

  if (queryParams.action) where.action = String(queryParams.action);
  if (queryParams.info) where.info = String(queryParams.info);
  if (queryParams.userEmail) where.userEmail = String(queryParams.userEmail);

  const dateFilter = buildDateRangeFilter(queryParams.startDate, queryParams.endDate);
  if (dateFilter) where.createdAt = dateFilter;

  return where;
};
