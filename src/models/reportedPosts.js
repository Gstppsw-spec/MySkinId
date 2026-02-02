"use strict";
module.exports = (sequelize, DataTypes) => {
    const ReportedPosts = sequelize.define(
        "reportedPosts",
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
            reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM("pending", "reviewed", "approved", "rejected"),
                defaultValue: "pending",
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
            tableName: "reportedPosts",
            timestamps: true,
        }
    );

    ReportedPosts.associate = (models) => {
        // ReportedPost belongs to a user (reporter)
        ReportedPosts.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "reporter",
        });

        // ReportedPost belongs to a post
        ReportedPosts.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });
    };

    return ReportedPosts;
};
