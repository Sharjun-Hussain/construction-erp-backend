module.exports = (sequelize, DataTypes) => {
  const EstimationItem = sequelize.define('EstimationItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    estimation_id: { type: DataTypes.UUID, allowNull: false },
    boq_item_id: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    unit: { type: DataTypes.STRING, defaultValue: 'LS' },
    division: { type: DataTypes.STRING, allowNull: true },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    resource_type: { type: DataTypes.ENUM('Material', 'Labor', 'Equipment', 'Subcontract', 'Mixed'), defaultValue: 'Mixed' },
    quantity: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    material_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    labor_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    equipment_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    unit_sell: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_sell: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, { tableName: 'estimation_items', underscored: true });
  EstimationItem.associate = (models) => {
    EstimationItem.belongsTo(models.Estimation, { as: 'estimation', foreignKey: 'estimation_id' });
  };
  return EstimationItem;
};
