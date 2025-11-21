import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { UserAttributes, UserRole } from './user.types';

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
	public id!: number;
	public email!: string;
	public name!: string | null;
	public role!: UserRole;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
	public readonly deletedAt!: Date | null;
}

User.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				isEmail: true,
			},
		},
		name: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		role: {
			type: DataTypes.ENUM('admin', 'user'),
			allowNull: false,
			defaultValue: 'user',
		},
	},
	{
		sequelize,
		timestamps: true,
		paranoid: true,
		tableName: 'users',
		modelName: 'User',
		indexes: [
			{ fields: ['email'], unique: true },
			{ fields: ['role'] }
		],
	}
);
