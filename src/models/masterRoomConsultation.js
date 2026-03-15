"use strict";

module.exports = (sequelize, DataTypes) => {
  const masterRoomConsultation = sequelize.define(
    "masterRoomConsultation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      consultationCategoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      expiredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "masterRoomConsultation",
      timestamps: true,
    },
  );

  // ============================
  // 🔗 RELATIONS
  // ============================
  masterRoomConsultation.associate = (models) => {
    masterRoomConsultation.belongsTo(models.masterConsultationCategory, {
      foreignKey: "consultationCategoryId",
      as: "consultationCategory",
    });

    masterRoomConsultation.belongsTo(models.masterCustomer, {
      foreignKey: "customerId",
      as: "customer",
    });

    masterRoomConsultation.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });

    masterRoomConsultation.belongsTo(models.masterProduct, {
      foreignKey: "productId",
      as: "product",
    });

    masterRoomConsultation.hasMany(models.masterConsultationImage, {
      foreignKey: "roomId",
      as: "consultationImage",
    });
    masterRoomConsultation.hasMany(models.masterConsultationMessage, {
      foreignKey: "roomId",
      as: "consultationMessage",
    });

    masterRoomConsultation.hasMany(models.masterQuestionnaireAnswer, {
      foreignKey: "roomId",
      as: "questionnaireAnswers",
    });

    masterRoomConsultation.hasMany(models.consultationRecommendation, {
      foreignKey: "roomId",
      as: "recommendations",
    });
  };

  return masterRoomConsultation;
};
