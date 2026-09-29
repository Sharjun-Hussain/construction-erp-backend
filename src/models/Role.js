module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'roles', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'name'], name: 'roles_org_name_unique_idx' }],
  });
  Role.associate = (models) => {
    Role.belongsToMany(models.Permission, { as: 'permissions', through: models.RolePermission, foreignKey: 'role_id' });
    Role.belongsToMany(models.User, { as: 'users', through: models.UserRole, foreignKey: 'role_id' });
  };
  return Role;
};
