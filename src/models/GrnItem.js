module.exports = (sequelize, DataTypes) => {
  const GrnItem = sequelize.define('GrnItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    grn_id: { type: DataTypes.UUID, allowNull: false },
    po_item_id: { type: DataTypes.UUID, allowNull: false },
    material_code: { type: DataTypes.STRING, allowNull: false },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, { tableName: 'grn_items', underscored: true });
  GrnItem.associate = (models) => {
    GrnItem.belongsTo(models.Grn, { as: 'grn', foreignKey: 'grn_id' });
  };
  return GrnItem;
};
