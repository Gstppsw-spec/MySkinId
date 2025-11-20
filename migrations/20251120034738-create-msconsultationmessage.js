"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("consultationmessage", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      roomid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "consultationroom",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      senderrole: {
        type: Sequelize.ENUM("customer", "doctor"),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      messageType: {
        type: Sequelize.ENUM("text", "image"),
        allowNull: false,
      },
      createdate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("consultationmessage");
  },
};
