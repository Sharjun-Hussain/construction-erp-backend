module.exports = (sequelize, DataTypes) => {
  const PeriodLock = sequelize.define('PeriodLock', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false, comment: 'dpr|ipc|po|grn|all' },
    period: { type: DataTypes.STRING(7), allowNull: false, comment: 'YYYY-MM' },
    locked_by: { type: DataTypes.UUID, allowNull: true },
    notes: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'period_locks', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'module', 'period'], name: 'lock_org_mod_period_unique_idx' }],
  });
  return PeriodLock;
};
