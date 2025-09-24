import { DataTypes } from "sequelize";
import sequelize from "../config/database";

const User = sequelize.define
    (
        "User",
        {
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
            refreshToken: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            role: {
                type: DataTypes.ENUM("admin", "user"),
                allowNull: false,
                defaultValue: "user",
            },
        },
        {
            tableName: "users",
            timestamps: false, // no necesitamos createdAt y updatedAt (almenos que se necesite saber por alguna logica de negocio)
        }
    );

export default User;
