"use strict";

module.exports = (sequelize, DataTypes) => {
    const RatingLike = sequelize.define(
        "RatingLike",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
            },
            ratingId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "rating_likes",
            timestamps: true,
        }
    );

    RatingLike.associate = function (models) {
        RatingLike.belongsTo(models.Rating, {
            foreignKey: "ratingId",
            as: "rating",
        });
        RatingLike.belongsTo(models.masterCustomer, {
            foreignKey: "customerId",
            as: "customer",
        });
    };

    return RatingLike;
};
