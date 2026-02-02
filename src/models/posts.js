"use strict";
module.exports = (sequelize, DataTypes) => {
    const Posts = sequelize.define(
        "posts",
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
            caption: {
                type: DataTypes.TEXT,
                allowNull: true,
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
            tableName: "posts",
            timestamps: true,
        }
    );

    Posts.associate = (models) => {
        // Post belongs to a user
        Posts.belongsTo(models.masterCustomer, {
            foreignKey: "userId",
            as: "user",
        });

        // Post has many media
        Posts.hasMany(models.postMedia, {
            foreignKey: "postId",
            as: "media",
        });

        // Post has many likes
        Posts.hasMany(models.postLikes, {
            foreignKey: "postId",
            as: "likes",
        });

        // Post has many comments
        Posts.hasMany(models.postComments, {
            foreignKey: "postId",
            as: "comments",
        });
    };

    return Posts;
};
