module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    po_id: { type: DataTypes.UUID, allowNull: false },
    material_code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    unit: { type: DataTypes.STRING, defaultValue: 'NOS' },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    received_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
  }, { tableName: 'purchase_order_items', underscored: true });
  PurchaseOrderItem.associate = (models) => {
    PurchaseOrderItem.belongsTo(models.PurchaseOrder, { as: 'po', foreignKey: 'po_id' });
  };
  return PurchaseOrderItem;
};
