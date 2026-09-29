module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    role_id: { type: DataTypes.UUID, allowNull: false },
  }, { tableName: 'user_roles', underscored: true });
  return UserRole;
};
