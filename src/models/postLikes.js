"use strict";
module.exports = (sequelize, DataTypes) => {
    const PostLikes = sequelize.define(
        "postLikes",
        {
            id: {
                type: DataTypes.CHAR(36),
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            postId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            userId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "postLikes",
            timestamps: false,
        }
    );

    PostLikes.associate = (models) => {
        // Like belongs to a post
        PostLikes.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });

        // Like belongs to a user
        PostLikes.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "user",
        });
    };

    return PostLikes;
};
