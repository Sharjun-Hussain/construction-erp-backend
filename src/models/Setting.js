module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    group: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.JSON, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'settings', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'key'], name: 'settings_org_key_unique_idx' }],
  });
  return Setting;
};
