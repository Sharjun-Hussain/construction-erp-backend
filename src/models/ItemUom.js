module.exports = (sequelize, DataTypes) => {
  const ItemUom = sequelize.define('ItemUom', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    material_id: { type: DataTypes.UUID, allowNull: false },
    uom: { type: DataTypes.STRING, allowNull: false },
    is_base: { type: DataTypes.BOOLEAN, defaultValue: false },
    conversion_to_base: { type: DataTypes.DECIMAL(18, 4), defaultValue: 1 },
    markup_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    purchase_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    cost_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    sales_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    limit_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    is_default_sales: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_default_purchase: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'item_uoms', underscored: true });
  ItemUom.associate = (models) => {
    ItemUom.belongsTo(models.Material, { as: 'material', foreignKey: 'material_id' });
  };
  return ItemUom;
};
