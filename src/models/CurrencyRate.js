module.exports = (sequelize, DataTypes) => {
  const CurrencyRate = sequelize.define('CurrencyRate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    from_currency: { type: DataTypes.STRING(3), allowNull: false },
    to_currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
    rate: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
    effective_date: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'currency_rates', underscored: true,
    indexes: [{ fields: ['organization_id', 'from_currency', 'to_currency', 'effective_date'], name: 'fx_org_pair_date_idx' }],
  });
  return CurrencyRate;
};
