module.exports = (sequelize, DataTypes) => {
  const ProjectMilestone = sequelize.define('ProjectMilestone', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    weight_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Pending', 'InProgress', 'Completed'), defaultValue: 'Pending' },
  }, { tableName: 'project_milestones', underscored: true });
  return ProjectMilestone;
};
