module.exports = (sequelize, DataTypes) => {
  const Estimation = sequelize.define('Estimation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    boq_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    revision: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Rejected'), defaultValue: 'Draft' },
    material_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    labor_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    equipment_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    subcontract_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    overhead_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    contingency_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    escalation_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    margin_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    total_cost: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    sell_total: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, {
    tableName: 'estimations', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number', 'revision'], name: 'est_org_proj_num_rev_unique_idx' }],
  });
  Estimation.associate = (models) => {
    Estimation.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    Estimation.hasMany(models.EstimationItem, { as: 'items', foreignKey: 'estimation_id' });
  };
  return Estimation;
};
