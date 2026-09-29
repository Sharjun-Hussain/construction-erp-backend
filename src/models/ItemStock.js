module.exports = (sequelize, DataTypes) => {
  const ItemStock = sequelize.define('ItemStock', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    material_id: { type: DataTypes.UUID, allowNull: false },
    warehouse: { type: DataTypes.STRING, allowNull: false },
    locator: { type: DataTypes.STRING, allowNull: true },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    uom: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'item_stocks', underscored: true });
  ItemStock.associate = (models) => {
    ItemStock.belongsTo(models.Material, { as: 'material', foreignKey: 'material_id' });
  };
  return ItemStock;
};
