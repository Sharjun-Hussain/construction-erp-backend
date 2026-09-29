module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NOS' },
    last_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    vat_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 15 },
    min_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'materials', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'materials_org_code_unique_idx' }],
  });
  return Material;
};
