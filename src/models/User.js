module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: true },
    branch_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    language: { type: DataTypes.ENUM('en', 'ar'), defaultValue: 'en' },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'email'], name: 'users_org_email_unique_idx' }],
  });
  User.associate = (models) => {
    User.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' });
    User.belongsToMany(models.Role, { as: 'roles', through: models.UserRole, foreignKey: 'user_id' });
    User.belongsToMany(models.Branch, { as: 'branches', through: 'user_branches', foreignKey: 'user_id', otherKey: 'branch_id' });
  };
  return User;
};
