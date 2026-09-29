module.exports = (sequelize, DataTypes) => {
  const QuotationItem = sequelize.define('QuotationItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    quotation_id: { type: DataTypes.UUID, allowNull: false },
    sl_no: { type: DataTypes.INTEGER, defaultValue: 1 },
    item_name: { type: DataTypes.TEXT, allowNull: false },
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
    tableName: 'quotation_items', underscored: true,
  });

  QuotationItem.associate = (models) => {
    QuotationItem.belongsTo(models.Quotation, { as: 'quotation', foreignKey: 'quotation_id' });
  };

  return QuotationItem;
};
