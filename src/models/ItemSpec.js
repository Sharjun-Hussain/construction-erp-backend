module.exports = (sequelize, DataTypes) => {
  const ItemSpec = sequelize.define('ItemSpec', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    material_id: { type: DataTypes.UUID, allowNull: false },
    attr_name: { type: DataTypes.STRING, allowNull: false },
    attr_value: { type: DataTypes.TEXT, allowNull: true },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, { tableName: 'item_specs', underscored: true });
  ItemSpec.associate = (models) => {
    ItemSpec.belongsTo(models.Material, { as: 'material', foreignKey: 'material_id' });
  };
  return ItemSpec;
};
