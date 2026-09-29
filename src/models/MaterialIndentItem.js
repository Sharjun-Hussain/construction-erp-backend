module.exports = (sequelize, DataTypes) => {
  const MaterialIndentItem = sequelize.define('MaterialIndentItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    indent_id: { type: DataTypes.UUID, allowNull: false },
    material_code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    unit: { type: DataTypes.STRING, defaultValue: 'NOS' },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    boq_item_id: { type: DataTypes.UUID, allowNull: true },
    ordered_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
  }, { tableName: 'material_indent_items', underscored: true });
  MaterialIndentItem.associate = (models) => {
    MaterialIndentItem.belongsTo(models.MaterialIndent, { as: 'indent', foreignKey: 'indent_id' });
  };
  return MaterialIndentItem;
};
