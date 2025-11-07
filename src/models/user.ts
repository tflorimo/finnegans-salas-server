import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const User = sequelize.define
	(
		'User', {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},

		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
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
	}, {
		timestamps: true,
		paranoid: true, // borrado logico
		tableName: 'users',
	});

export default User;
