"use strict";
module.exports = (sequelize, DataTypes) => {
    const PostCommentLikes = sequelize.define(
        "postCommentLikes",
        {
            id: {
                type: DataTypes.CHAR(36),
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            commentId: {
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
            tableName: "postCommentLikes",
            timestamps: false,
        }
    );

    PostCommentLikes.associate = (models) => {
        // Like belongs to a comment
        PostCommentLikes.belongsTo(models.postComments, {
            foreignKey: "commentId",
            as: "comment",
        });

        // Like belongs to a user
        PostCommentLikes.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "user",
        });
    };

    return PostCommentLikes;
};
