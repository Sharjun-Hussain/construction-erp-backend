module.exports = (sequelize, DataTypes) => {
  const ScWorkOrder = sequelize.define('ScWorkOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    subcontractor_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    scope: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    retention_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10 },
    advance_paid: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    certified_total: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Approved', 'Closed'), defaultValue: 'Draft' },
  }, {
    tableName: 'sc_work_orders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'scwo_org_number_unique_idx' }],
  });
  ScWorkOrder.associate = (models) => {
    ScWorkOrder.hasMany(models.ScCertificate, { as: 'certificates', foreignKey: 'sc_work_order_id' });
  };
  return ScWorkOrder;
};
