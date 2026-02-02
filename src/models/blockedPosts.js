"use strict";
module.exports = (sequelize, DataTypes) => {
    const BlockedPosts = sequelize.define(
        "blockedPosts",
        {
            id: {
                type: DataTypes.CHAR(36),
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            postId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
            updatedAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "blockedPosts",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["userId", "postId"],
                    name: "unique_user_post",
                },
            ],
        }
    );

    BlockedPosts.associate = (models) => {
        // BlockedPost belongs to a user
        BlockedPosts.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "user",
        });

        // BlockedPost belongs to a post
        BlockedPosts.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });
    };

    return BlockedPosts;
};
