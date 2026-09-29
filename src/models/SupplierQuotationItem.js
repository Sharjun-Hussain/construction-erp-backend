module.exports = (sequelize, DataTypes) => {
  const SupplierQuotationItem = sequelize.define('SupplierQuotationItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    quotation_id: { type: DataTypes.UUID, allowNull: false },
    material_code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    unit: { type: DataTypes.STRING, defaultValue: 'NOS' },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, { tableName: 'supplier_quotation_items', underscored: true });
  SupplierQuotationItem.associate = (models) => {
    SupplierQuotationItem.belongsTo(models.SupplierQuotation, { as: 'quotation', foreignKey: 'quotation_id' });
  };
  return SupplierQuotationItem;
};
