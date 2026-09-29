module.exports = (sequelize, DataTypes) => {
  const SupplierQuotation = sequelize.define('SupplierQuotation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    indent_id: { type: DataTypes.UUID, allowNull: true },
    supplier_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    validity_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Selected', 'Rejected'), defaultValue: 'Draft' },
    subtotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    vat_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, {
    tableName: 'supplier_quotations', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'quot_org_number_unique_idx' }],
  });
  SupplierQuotation.associate = (models) => {
    SupplierQuotation.hasMany(models.SupplierQuotationItem, { as: 'items', foreignKey: 'quotation_id' });
  };
  return SupplierQuotation;
};
