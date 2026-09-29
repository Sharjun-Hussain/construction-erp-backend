module.exports = (sequelize, DataTypes) => {
  const SalesOrderItem = sequelize.define('SalesOrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    sales_order_id: { type: DataTypes.UUID, allowNull: false },
    sl_no: { type: DataTypes.INTEGER, defaultValue: 1 },
    po_sl_no: { type: DataTypes.STRING, allowNull: true },
    item_name: { type: DataTypes.TEXT, allowNull: false },
    warehouse: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.DECIMAL(18, 4), defaultValue: 1 },
    uom: { type: DataTypes.STRING(20), defaultValue: 'NOS' },
    unit_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount_currency: { type: DataTypes.STRING(10), defaultValue: 'SAR' },
    vat_type: { type: DataTypes.STRING(20), defaultValue: '15' },
    vat_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    delivery_period: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'sales_order_items', underscored: true,
  });

  SalesOrderItem.associate = (models) => {
    SalesOrderItem.belongsTo(models.SalesOrder, { as: 'salesOrder', foreignKey: 'sales_order_id' });
  };

  return SalesOrderItem;
};
