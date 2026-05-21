module.exports = {
  async up(queryInterface, Sequelize) {
    // Add companyId column (UUID) to masterLocation, non-null, foreign key referencing masterCompany(id)
    await queryInterface.addColumn('masterLocation', 'companyId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    // Add foreign key constraint
    await queryInterface.addConstraint('masterLocation', {
      fields: ['companyId'],
      type: 'foreign key',
      name: 'fk_masterLocation_companyId',
      references: {
        table: 'masterCompany',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraint first
    await queryInterface.removeConstraint('masterLocation', 'fk_masterLocation_companyId');
    // Then remove the column
    await queryInterface.removeColumn('masterLocation', 'companyId');
  }
};
