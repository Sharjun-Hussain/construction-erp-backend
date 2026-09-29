module.exports = (sequelize, DataTypes) => {
  const DprLog = sequelize.define('DprLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    weather: { type: DataTypes.STRING, allowNull: true },
    manpower: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved'), defaultValue: 'Draft' },
    submitted_by: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'dpr_logs', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'date'], name: 'dpr_org_proj_date_unique_idx' }],
  });
  DprLog.associate = (models) => {
    DprLog.hasMany(models.DprLine, { as: 'lines', foreignKey: 'dpr_id' });
  };
  return DprLog;
};
