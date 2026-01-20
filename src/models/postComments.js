"use strict";
module.exports = (sequelize, DataTypes) => {
    const PostComments = sequelize.define(
        "postComments",
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
            commentText: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "postComments",
            timestamps: false,
        }
    );

    PostComments.associate = (models) => {
        // Comment belongs to a post
        PostComments.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });

        // Comment belongs to a user
        PostComments.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "user",
        });
    };

    return PostComments;
};
