module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'module:action e.g. project:view' },
    group_name: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'permissions', underscored: true });
  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, { as: 'roles', through: models.RolePermission, foreignKey: 'permission_id' });
  };
  return Permission;
};
