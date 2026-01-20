"use strict";
module.exports = (sequelize, DataTypes) => {
    const Followers = sequelize.define(
        "followers",
        {
            id: {
                type: DataTypes.CHAR(36),
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            followerId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            followingId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "followers",
            timestamps: false,
        }
    );

    Followers.associate = (models) => {
        // The user who is following
        Followers.belongsTo(models.masterCustomer, {
            foreignKey: "followerId",
            as: "follower",
        });

        // The user being followed
        Followers.belongsTo(models.masterCustomer, {
            foreignKey: "followingId",
            as: "following",
        });
    };

    return Followers;
};
