"use strict";
module.exports = (sequelize, DataTypes) => {
    const PostMedia = sequelize.define(
        "postMedia",
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
            mediaUrl: {
                type: DataTypes.STRING(255),
                allowNull: false,
                get() {
                    const rawValue = this.getDataValue("mediaUrl");
                    if (!rawValue) return null;

                    // If already a full URL, return as is
                    if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
                        return rawValue;
                    }

                    const BASE_URL =
                        process.env.BASE_URL ||
                        `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_HOST || "localhost"
                        }:${process.env.APP_PORT || 3000}`;

                    return `${BASE_URL}/${rawValue}`;
                },
            },
            mediaType: {
                type: DataTypes.ENUM("image", "video"),
                allowNull: false,
            },
            orderIndex: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "postMedia",
            timestamps: false,
        }
    );

    PostMedia.associate = (models) => {
        // Media belongs to a post
        PostMedia.belongsTo(models.posts, {
            foreignKey: "postId",
            as: "post",
        });
    };

    return PostMedia;
};
