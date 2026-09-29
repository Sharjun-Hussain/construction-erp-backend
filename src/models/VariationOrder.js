module.exports = (sequelize, DataTypes) => {
  const VariationOrder = sequelize.define('VariationOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    impact_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Rejected'), defaultValue: 'Draft' },
  }, {
    tableName: 'variation_orders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number'], name: 'vo_org_proj_num_unique_idx' }],
  });
  return VariationOrder;
};
