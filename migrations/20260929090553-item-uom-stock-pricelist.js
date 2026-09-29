'use strict';

/**
 * Item master phase 2 (Tranquil ITEM DETAILS / PRICE LIST parity):
 * - materials: limit_price_as_cost, default_warehouse, default_locator,
 *   min_purchase_qty, purchase_qty_uom, min_stock_uom, max_stock_uom, opening_date
 * - item_prices: markup_pct
 * - new tables: item_uoms (multi-UOM conversions + per-UOM prices),
 *   item_stocks (warehouse/locator opening balances)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D3 = { type: Sequelize.DECIMAL(18, 3), defaultValue: 0 };
    const MONEY = { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 };
    const STR = { type: Sequelize.STRING, allowNull: true };
    const matCols = {
      limit_price_as_cost: { type: Sequelize.BOOLEAN, defaultValue: false },
      default_warehouse: STR,
      default_locator: STR,
      min_purchase_qty: D3,
      purchase_qty_uom: STR,
      min_stock_uom: STR,
      max_stock_uom: STR,
      opening_date: { type: Sequelize.DATEONLY, allowNull: true },
    };
    for (const [col, def] of Object.entries(matCols)) {
      await queryInterface.addColumn('materials', col, def);
    }
    await queryInterface.addColumn('item_prices', 'markup_pct', { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 });

    await queryInterface.createTable('item_uoms', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      organization_id: { type: Sequelize.UUID, allowNull: false },
      material_id: { type: Sequelize.UUID, allowNull: false },
      uom: { type: Sequelize.STRING, allowNull: false },
      is_base: { type: Sequelize.BOOLEAN, defaultValue: false },
      conversion_to_base: { type: Sequelize.DECIMAL(18, 4), defaultValue: 1 },
      markup_pct: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      purchase_price: MONEY,
      cost_price: MONEY,
      sales_price: MONEY,
      limit_price: MONEY,
      is_default_sales: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_default_purchase: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('item_uoms', ['organization_id', 'material_id'], { name: 'itemuom_org_mat_idx' });

    await queryInterface.createTable('item_stocks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      organization_id: { type: Sequelize.UUID, allowNull: false },
      material_id: { type: Sequelize.UUID, allowNull: false },
      warehouse: { type: Sequelize.STRING, allowNull: false },
      locator: STR,
      qty: D3,
      uom: STR,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('item_stocks', ['organization_id', 'material_id'], { name: 'itemstock_org_mat_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('item_stocks');
    await queryInterface.dropTable('item_uoms');
    await queryInterface.removeColumn('item_prices', 'markup_pct');
    for (const col of ['limit_price_as_cost', 'default_warehouse', 'default_locator', 'min_purchase_qty', 'purchase_qty_uom', 'min_stock_uom', 'max_stock_uom', 'opening_date']) {
      await queryInterface.removeColumn('materials', col);
    }
  },
};
