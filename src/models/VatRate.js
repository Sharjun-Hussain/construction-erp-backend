module.exports = (sequelize, DataTypes) => {
  const VatRate = sequelize.define('VatRate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'vat_rates', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'name'], name: 'vat_org_name_unique_idx' }],
  });
  return VatRate;
};
