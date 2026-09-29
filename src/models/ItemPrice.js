module.exports = (sequelize, DataTypes) => {
  const ItemPrice = sequelize.define('ItemPrice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    material_id: { type: DataTypes.UUID, allowNull: false },
    price_list: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Standard' },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    unit_price: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    markup_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    min_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 1 },
    effective_from: { type: DataTypes.DATEONLY, allowNull: true },
    effective_to: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'item_prices', underscored: true });
  ItemPrice.associate = (models) => {
    ItemPrice.belongsTo(models.Material, { as: 'material', foreignKey: 'material_id' });
  };
  return ItemPrice;
};
