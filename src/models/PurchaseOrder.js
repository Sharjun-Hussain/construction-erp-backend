module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    supplier_id: { type: DataTypes.UUID, allowNull: false },
    indent_id: { type: DataTypes.UUID, allowNull: true },
    quotation_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.ENUM('Draft', 'Approved', 'Sent', 'PartiallyReceived', 'Received', 'Cancelled'), defaultValue: 'Draft' },
    subtotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    vat_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'purchase_orders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'po_org_number_unique_idx' }],
  });
  PurchaseOrder.associate = (models) => {
    PurchaseOrder.hasMany(models.PurchaseOrderItem, { as: 'items', foreignKey: 'po_id' });
    PurchaseOrder.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplier_id' });
    PurchaseOrder.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
  };
  return PurchaseOrder;
};
