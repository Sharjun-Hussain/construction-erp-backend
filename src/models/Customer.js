module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    vat_number: { type: DataTypes.STRING(15), allowNull: true },
    cr_number: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Riyadh' },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
    credit_limit: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'customers', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'customers_org_code_unique_idx' }],
  });
  Customer.associate = (models) => {
    Customer.hasMany(models.Project, { as: 'projects', foreignKey: 'client_id' });
  };
  return Customer;
};
