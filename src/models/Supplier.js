module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define('Supplier', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    vat_number: { type: DataTypes.STRING(15), allowNull: true },
    cr_number: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
    rating: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'suppliers', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'suppliers_org_code_unique_idx' }],
  });
  return Supplier;
};
