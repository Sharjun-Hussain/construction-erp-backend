module.exports = (sequelize, DataTypes) => {
  const EmployeeRate = sequelize.define('EmployeeRate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false, comment: 'trade / role' },
    skill_level: { type: DataTypes.STRING, allowNull: true },
    daily_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    hourly_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    effective_date: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'employee_rates', underscored: true,
    indexes: [{ fields: ['organization_id', 'category'], name: 'emprate_org_cat_idx' }],
  });
  return EmployeeRate;
};
