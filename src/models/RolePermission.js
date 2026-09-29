module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role_id: { type: DataTypes.UUID, allowNull: false },
    permission_id: { type: DataTypes.UUID, allowNull: false },
  }, { tableName: 'role_permissions', underscored: true });
  return RolePermission;
};
