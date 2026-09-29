module.exports = (sequelize, DataTypes) => {
  const IpcInvoice = sequelize.define('IpcInvoice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    period_from: { type: DataTypes.DATEONLY, allowNull: true },
    period_to: { type: DataTypes.DATEONLY, allowNull: true },
    gross_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    retention_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    advance_recovery: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    vat_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Paid'), defaultValue: 'Draft' },
    zatca_status: { type: DataTypes.ENUM('NotSubmitted', 'Submitted', 'Accepted', 'Rejected'), defaultValue: 'NotSubmitted' },
  }, {
    tableName: 'ipc_invoices', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number'], name: 'ipc_org_proj_num_unique_idx' }],
  });
  IpcInvoice.associate = (models) => {
    IpcInvoice.hasMany(models.IpcItem, { as: 'items', foreignKey: 'ipc_id' });
  };
  return IpcInvoice;
};
