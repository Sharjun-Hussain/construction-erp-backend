module.exports = (sequelize, DataTypes) => {
  const SiteStock = sequelize.define('SiteStock', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    material_code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    unit: { type: DataTypes.STRING, defaultValue: 'NOS' },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
  }, {
    tableName: 'site_stocks', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'material_code'], name: 'stock_org_proj_mat_unique_idx' }],
  });
  return SiteStock;
};
