'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create relationshipProductLocation pivot table
    await queryInterface.createTable('relationshipProductLocation', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterProduct', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterLocation', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('relationshipProductLocation', ['productId', 'locationId'], {
      unique: true,
      name: 'unique_product_location',
    });

    // 2. Create relationshipServiceLocation pivot table
    await queryInterface.createTable('relationshipServiceLocation', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterService', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterLocation', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('relationshipServiceLocation', ['serviceId', 'locationId'], {
      unique: true,
      name: 'unique_service_location',
    });

    // 3. Create relationshipPackageLocation pivot table
    await queryInterface.createTable('relationshipPackageLocation', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterPackage', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'masterLocation', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('relationshipPackageLocation', ['packageId', 'locationId'], {
      unique: true,
      name: 'unique_package_location',
    });

    // 4. Migrate existing data: copy locationId from master tables to pivot tables
    // Product → relationshipProductLocation
    await queryInterface.sequelize.query(`
      INSERT INTO relationshipProductLocation (id, productId, locationId, isActive, createdAt, updatedAt)
      SELECT UUID(), id, locationId, 1, NOW(), NOW()
      FROM masterProduct
      WHERE locationId IS NOT NULL
    `);

    // Service → relationshipServiceLocation
    await queryInterface.sequelize.query(`
      INSERT INTO relationshipServiceLocation (id, serviceId, locationId, isActive, createdAt, updatedAt)
      SELECT UUID(), id, locationId, 1, NOW(), NOW()
      FROM masterService
      WHERE locationId IS NOT NULL
    `);

    // Package → relationshipPackageLocation
    await queryInterface.sequelize.query(`
      INSERT INTO relationshipPackageLocation (id, packageId, locationId, isActive, createdAt, updatedAt)
      SELECT UUID(), id, locationId, 1, NOW(), NOW()
      FROM masterPackage
      WHERE locationId IS NOT NULL
    `);

    // 5. Drop locationId columns from master tables
    try {
      await queryInterface.removeColumn('masterProduct', 'locationId');
    } catch (err) {
      console.warn("Could not remove locationId from masterProduct:", err.message);
    }

    try {
      await queryInterface.removeColumn('masterService', 'locationId');
    } catch (err) {
      console.warn("Could not remove locationId from masterService:", err.message);
    }

    try {
      await queryInterface.removeColumn('masterPackage', 'locationId');
    } catch (err) {
      console.warn("Could not remove locationId from masterPackage:", err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Re-add locationId columns
    await queryInterface.addColumn('masterProduct', 'locationId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('masterService', 'locationId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('masterPackage', 'locationId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // 2. Migrate data back from pivot tables (take first location per item)
    await queryInterface.sequelize.query(`
      UPDATE masterProduct p
      JOIN (
        SELECT productId, MIN(locationId) as locationId
        FROM relationshipProductLocation
        GROUP BY productId
      ) pivot ON p.id = pivot.productId
      SET p.locationId = pivot.locationId
    `);

    await queryInterface.sequelize.query(`
      UPDATE masterService s
      JOIN (
        SELECT serviceId, MIN(locationId) as locationId
        FROM relationshipServiceLocation
        GROUP BY serviceId
      ) pivot ON s.id = pivot.serviceId
      SET s.locationId = pivot.locationId
    `);

    await queryInterface.sequelize.query(`
      UPDATE masterPackage p
      JOIN (
        SELECT packageId, MIN(locationId) as locationId
        FROM relationshipPackageLocation
        GROUP BY packageId
      ) pivot ON p.id = pivot.packageId
      SET p.locationId = pivot.locationId
    `);

    // 3. Drop pivot tables
    await queryInterface.dropTable('relationshipProductLocation');
    await queryInterface.dropTable('relationshipServiceLocation');
    await queryInterface.dropTable('relationshipPackageLocation');
  }
};
