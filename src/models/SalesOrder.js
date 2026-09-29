module.exports = (sequelize, DataTypes) => {
  const SalesOrder = sequelize.define('SalesOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    order_no: { type: DataTypes.STRING, allowNull: false },
    quotation_id: { type: DataTypes.UUID, allowNull: true },
    quotation_no: { type: DataTypes.STRING, allowNull: true },
    order_date: { type: DataTypes.DATEONLY, allowNull: false },
    delivery_period: { type: DataTypes.STRING, allowNull: true },
    customer_po_no: { type: DataTypes.STRING, allowNull: true },
    po_date: { type: DataTypes.DATEONLY, allowNull: true },
    customer_id: { type: DataTypes.UUID, allowNull: true },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    reference: { type: DataTypes.STRING, allowNull: true },
    price_list: { type: DataTypes.STRING, defaultValue: 'Standard Price List' },
    contact_person: { type: DataTypes.STRING, allowNull: true },
    vat_exempt: { type: DataTypes.BOOLEAN, defaultValue: false },
    credit_limit: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    pending_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_outstanding: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    advance_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    available_credit: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    delivery_method: { type: DataTypes.STRING, allowNull: true },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
    terms_conditions: { type: DataTypes.TEXT, allowNull: true },
    salesman: { type: DataTypes.STRING, allowNull: true },
    cost_center: { type: DataTypes.STRING, allowNull: true },
    company_bank_account: { type: DataTypes.STRING, allowNull: true },
    shipping_address: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    shipping_charge: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount_type: { type: DataTypes.STRING(20), defaultValue: 'percent' },
    discount_val: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_vat: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    round_off: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    status: { type: DataTypes.ENUM('Draft', 'Confirmed', 'In Production', 'Delivered', 'Invoiced', 'Cancelled'), defaultValue: 'Draft' },
  }, {
    tableName: 'sales_orders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'order_no'], name: 'so_org_no_idx' }],
  });

  SalesOrder.associate = (models) => {
    SalesOrder.hasMany(models.SalesOrderItem, { as: 'items', foreignKey: 'sales_order_id', onDelete: 'CASCADE' });
    SalesOrder.belongsTo(models.Customer, { as: 'customer', foreignKey: 'customer_id' });
    SalesOrder.belongsTo(models.Quotation, { as: 'quotation', foreignKey: 'quotation_id' });
  };

  return SalesOrder;
};
