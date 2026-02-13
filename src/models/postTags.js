'use strict';
module.exports = (sequelize, DataTypes) => {
    const PostTags = sequelize.define(
        "postTags",
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
            referenceId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
            },
            referenceType: {
                type: DataTypes.STRING,
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
            tableName: "postTags",
            timestamps: true,
        }
    );

    PostTags.associate = (models) => {
        // Tag belongs to a post
        PostTags.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });

        // Polymorphic-like associations for tagged items
        PostTags.belongsTo(models.masterProduct, {
            foreignKey: "referenceId",
            as: "product",
            constraints: false
        });

        PostTags.belongsTo(models.masterPackage, {
            foreignKey: "referenceId",
            as: "package",
            constraints: false
        });

        PostTags.belongsTo(models.masterLocation, {
            foreignKey: "referenceId",
            as: "location",
            constraints: false
        });
    };

    return PostTags;
};
