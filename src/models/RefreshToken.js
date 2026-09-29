module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.STRING(500), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'refresh_tokens', underscored: true });
  return RefreshToken;
};
