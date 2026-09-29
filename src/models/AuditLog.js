module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: true },
    entity: { type: DataTypes.STRING, allowNull: true },
    status_code: { type: DataTypes.INTEGER, allowNull: true },
    duration_ms: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'audit_logs', underscored: true, updatedAt: false });
  return AuditLog;
};
