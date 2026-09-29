module.exports = (sequelize, DataTypes) => {
  const FiscalYear = sequelize.define('FiscalYear', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false, comment: 'FY 2026' },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('Open', 'Active', 'Closed'), defaultValue: 'Open' },
  }, {
    tableName: 'fiscal_years', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'name'], name: 'fy_org_name_unique_idx' }],
  });
  return FiscalYear;
};
