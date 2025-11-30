import { Op, Sequelize } from 'sequelize';

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

  if (queryParams.searchKey && queryParams.searchValue) {
    if (queryParams.searchKey === 'info') {
      const raw = String(queryParams.searchValue).trim();
      const likeValue = `%${raw.toLowerCase()}%`;

      where[Op.and] = Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('info')),
        { [Op.like]: likeValue }
      );
    } else {
      where[queryParams.searchKey] = String(queryParams.searchValue);
    }
  };

  return where;
};

export const buildEventFilters = (queryParams: any): any => {
  const where: any = {};

  if (queryParams.searchKey && queryParams.searchValue) {
    if (queryParams.searchKey === 'title') {
      const raw = String(queryParams.searchValue).trim();
      const likeValue = `%${raw.toLowerCase()}%`;
      where[Op.and] = Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('title')),
        { [Op.like]: likeValue }
      );
    } else {
      where[queryParams.searchKey] = String(queryParams.searchValue);
    }
  };

  return where;
};
