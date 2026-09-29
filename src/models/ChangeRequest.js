module.exports = (sequelize, DataTypes) => {
  const ChangeRequest = sequelize.define('ChangeRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    origin: { type: DataTypes.ENUM('Client', 'Consultant', 'Site', 'Design', 'Subcontractor', 'Other'), defaultValue: 'Site' },
    cost_impact: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    time_impact_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    raised_by: { type: DataTypes.STRING, allowNull: true },
    raised_date: { type: DataTypes.DATEONLY, allowNull: true },
    review_notes: { type: DataTypes.TEXT, allowNull: true },
    variation_id: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.ENUM('Raised', 'UnderReview', 'Approved', 'Rejected', 'Converted'), defaultValue: 'Raised' },
  }, {
    tableName: 'change_requests', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'cr_org_number_unique_idx' }],
  });
  ChangeRequest.associate = (models) => {
    ChangeRequest.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    ChangeRequest.belongsTo(models.VariationOrder, { as: 'variation', foreignKey: 'variation_id' });
  };
  return ChangeRequest;
};
