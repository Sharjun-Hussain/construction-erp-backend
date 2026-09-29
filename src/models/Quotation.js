module.exports = (sequelize, DataTypes) => {
  const Quotation = sequelize.define('Quotation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    quotation_no: { type: DataTypes.STRING, allowNull: false },
    enquiry_no: { type: DataTypes.STRING, allowNull: true },
    enquiry_id: { type: DataTypes.UUID, allowNull: true },
    revision: { type: DataTypes.INTEGER, defaultValue: 0 },
    quotation_date: { type: DataTypes.DATEONLY, allowNull: false },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: false },
    delivery_period: { type: DataTypes.STRING, allowNull: true },
    customer_id: { type: DataTypes.UUID, allowNull: true },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    reference: { type: DataTypes.STRING, allowNull: true },
    price_list: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Standard Price List' },
    contact_person: { type: DataTypes.STRING, allowNull: true },
    vat_exempt: { type: DataTypes.BOOLEAN, defaultValue: false },
    delivery_method: { type: DataTypes.STRING, allowNull: true },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
    terms_conditions: { type: DataTypes.TEXT, allowNull: true },
    salesman: { type: DataTypes.STRING, allowNull: true },
    cost_center: { type: DataTypes.STRING, allowNull: true },
    company_bank_account: { type: DataTypes.STRING, allowNull: true },
    shipping_address: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount_type: { type: DataTypes.STRING(20), defaultValue: 'percent' },
    discount_val: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total_vat: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    round_off: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    status: { type: DataTypes.ENUM('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'), defaultValue: 'Draft' },
  }, {
    tableName: 'quotations', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'quotation_no', 'revision'], name: 'qtn_org_no_rev_idx' }],
  });

  Quotation.associate = (models) => {
    Quotation.hasMany(models.QuotationItem, { as: 'items', foreignKey: 'quotation_id', onDelete: 'CASCADE' });
    Quotation.belongsTo(models.Customer, { as: 'customer', foreignKey: 'customer_id' });
    Quotation.belongsTo(models.Enquiry, { as: 'enquiry', foreignKey: 'enquiry_id' });
  };

  return Quotation;
};
