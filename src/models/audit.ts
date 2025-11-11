import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

export interface AuditAttributes {
  id?: number;
  userEmail?: string | null;
  action: "LOGIN" | "LOGOUT" | "CHECKIN";
  eventId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Audit extends Model<AuditAttributes> implements AuditAttributes {
  public id!: number;
  public userEmail!: string | null;
  public action!: "LOGIN" | "LOGOUT" | "CHECKIN";
  public eventId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Audit.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    userEmail: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING(20), allowNull: false },
    eventId: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    sequelize,
    tableName: "audits",
    modelName: "Audit",
    timestamps: true,
    indexes: [{ fields: ["userEmail"] }, { fields: ["action"] }, { fields: ["createdAt"] }],
  }
);

export default Audit;