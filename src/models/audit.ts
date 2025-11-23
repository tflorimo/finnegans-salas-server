import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AuditAttributes {
  id?: number;
  userEmail?: string | null;
  action: string;
  eventId?: string | null;
  reason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type AuditCreationAttributes = Optional<AuditAttributes, 'id' | 'userEmail' | 'eventId' | 'reason'>;

class Audit extends Model<AuditAttributes, AuditCreationAttributes> implements AuditAttributes {
  public id!: number;
  public userEmail!: string | null;
  public action!: string;
  public eventId!: string | null;  // ← FALTABA DECLARAR AQUÍ
  public reason!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Audit.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    eventId: {                         // ← FALTABA TODO ESTE CAMPO
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'audits',
    modelName: 'Audit',
    timestamps: true,
  }
);

export default Audit;