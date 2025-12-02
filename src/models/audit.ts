import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { AuditAttributes } from './audit.types';
import { AuditAction } from '../constants/auditActions';

interface AuditCreationAttributes extends Optional<AuditAttributes, 'id' | 'userEmail' | 'eventId' | 'roomEmail' | 'info'> {}

export class Audit extends Model<AuditAttributes, AuditCreationAttributes> implements AuditAttributes {
  public id!: number;
  public userEmail!: string | null;
  public action!: AuditAction;
  public eventId!: string | null;
  public roomEmail!: string | null;
  public info!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Audit.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
    },
    userEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    eventId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    roomEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    info: {
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