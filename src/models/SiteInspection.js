module.exports = (sequelize, DataTypes) => {
  const SiteInspection = sequelize.define('SiteInspection', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    enquiry_id: { type: DataTypes.UUID, allowNull: true },
    project_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    visit_date: { type: DataTypes.DATEONLY, allowNull: false },
    inspector: { type: DataTypes.STRING, allowNull: true },
    inspector_user_id: { type: DataTypes.UUID, allowNull: true },
    attendees: { type: DataTypes.TEXT, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    site_condition: { type: DataTypes.TEXT, allowNull: true },
    access_notes: { type: DataTypes.TEXT, allowNull: true },
    utilities_notes: { type: DataTypes.TEXT, allowNull: true },
    risks: { type: DataTypes.TEXT, allowNull: true },
    findings: { type: DataTypes.TEXT, allowNull: true },
    recommendation: { type: DataTypes.ENUM('Go', 'NoGo', 'Conditional', 'Pending'), defaultValue: 'Pending' },
    recommendation_notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Scheduled', 'Completed', 'Cancelled'), defaultValue: 'Scheduled' },
  }, {
    tableName: 'site_inspections', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'insp_org_number_unique_idx' }],
  });
  SiteInspection.associate = (models) => {
    SiteInspection.belongsTo(models.Enquiry, { as: 'enquiry', foreignKey: 'enquiry_id' });
    SiteInspection.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
  };
  return SiteInspection;
};
