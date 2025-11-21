"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("msuser", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      roleid: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      companyid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      locationid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      jwttoken: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updateuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    });

    await queryInterface.addConstraint("msuser", {
      fields: ["roleid"],
      type: "foreign key",
      name: "fk_msuser_roleid",
      references: {
        table: "msrole",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.addConstraint("msuser", {
      fields: ["companyid"],
      type: "foreign key",
      name: "fk_msuser_companyid",
      references: {
        table: "mscompany",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addConstraint("msuser", {
      fields: ["locationid"],
      type: "foreign key",
      name: "fk_msuser_locationid",
      references: {
        table: "mslocation",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("msuser");
  },
};
