module.exports = (sequelize, DataTypes) => {
  const ApprovalSetting = sequelize.define('ApprovalSetting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false, comment: 'tender|boq|estimation|po|ipc|vo|dpr|...' },
    min_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    levels: { type: DataTypes.JSON, allowNull: true, comment: '[{level:1, role:"Project Manager"}, ...]' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'approval_settings', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'module'], name: 'apprset_org_module_unique_idx' }],
  });
  return ApprovalSetting;
};
