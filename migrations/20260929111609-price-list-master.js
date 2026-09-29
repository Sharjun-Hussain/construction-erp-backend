'use strict';

/**
 * Price List master (Tranquil parity): named sell-price lists that item
 * price rows reference by name. Includes a default-list flag.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('price_lists', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      organization_id: { type: Sequelize.UUID, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      name_ar: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      currency: { type: Sequelize.STRING(3), defaultValue: 'SAR' },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('price_lists', ['organization_id', 'name'], { unique: true, name: 'pricelist_org_name_unique_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('price_lists');
  },
};
