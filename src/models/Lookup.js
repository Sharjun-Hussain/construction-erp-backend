module.exports = (sequelize, DataTypes) => {
  const Lookup = sequelize.define('Lookup', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false, comment: 'department|designation|warehouse|...' },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    extra: { type: DataTypes.JSON, allowNull: true, comment: 'type-specific fields (days, amount, ...)' },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'lookups', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'type', 'code'], name: 'lookup_org_type_code_unique_idx' }],
  });
  return Lookup;
};
