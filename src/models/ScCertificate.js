module.exports = (sequelize, DataTypes) => {
  const ScCertificate = sequelize.define('ScCertificate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    sc_work_order_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    period_from: { type: DataTypes.DATEONLY, allowNull: true },
    period_to: { type: DataTypes.DATEONLY, allowNull: true },
    gross: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    retention: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    advance_recovery: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    back_charge: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    net: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Approved', 'Paid'), defaultValue: 'Draft' },
  }, {
    tableName: 'sc_certificates', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'sc_work_order_id', 'number'], name: 'sccert_org_wo_num_unique_idx' }],
  });
  ScCertificate.associate = (models) => {
    ScCertificate.belongsTo(models.ScWorkOrder, { as: 'workOrder', foreignKey: 'sc_work_order_id' });
  };
  return ScCertificate;
};
