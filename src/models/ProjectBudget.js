module.exports = (sequelize, DataTypes) => {
  const ProjectBudget = sequelize.define('ProjectBudget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    head: { type: DataTypes.ENUM('Material', 'Labor', 'Equipment', 'Subcontract', 'Overhead', 'Other'), allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    budgeted: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    actual_manual: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0, comment: 'Manual actual for heads with no auto source (labor/equipment/overhead)' },
  }, {
    tableName: 'project_budgets', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'head'], name: 'budget_org_proj_head_unique_idx' }],
  });
  return ProjectBudget;
};
