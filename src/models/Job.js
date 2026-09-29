module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    division: { type: DataTypes.STRING, allowNull: true },
    trade: { type: DataTypes.STRING, allowNull: true },
    assignee: { type: DataTypes.STRING, allowNull: true },
    assignee_user_id: { type: DataTypes.UUID, allowNull: true },
    priority: { type: DataTypes.ENUM('Low', 'Normal', 'High', 'Urgent'), defaultValue: 'Normal' },
    scheduled_start: { type: DataTypes.DATEONLY, allowNull: true },
    scheduled_end: { type: DataTypes.DATEONLY, allowNull: true },
    actual_start: { type: DataTypes.DATEONLY, allowNull: true },
    actual_end: { type: DataTypes.DATEONLY, allowNull: true },
    progress_pct: { type: DataTypes.INTEGER, defaultValue: 0 },
    est_hours: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    actual_hours: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Open', 'InProgress', 'OnHold', 'Done', 'Cancelled'), defaultValue: 'Open' },
  }, {
    tableName: 'jobs', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'job_org_number_unique_idx' }],
  });
  Job.associate = (models) => {
    Job.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
  };
  return Job;
};
