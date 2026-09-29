module.exports = (sequelize, DataTypes) => {
  const PriceList = sequelize.define('PriceList', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'price_lists', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'name'], name: 'pricelist_org_name_unique_idx' }],
  });
  return PriceList;
};
