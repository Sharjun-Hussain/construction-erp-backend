module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    branch_id: { type: DataTypes.UUID, allowNull: true },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    client_name: { type: DataTypes.STRING, allowNull: true },
    client_id: { type: DataTypes.UUID, allowNull: true },
    client_phone: { type: DataTypes.STRING, allowNull: true },
    client_email: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Tender', 'Awarded', 'InProgress', 'OnHold', 'Completed', 'HandedOver'), defaultValue: 'Draft' },
    contract_value: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    retention_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10 },
    vat_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 15 },
    advance_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    contract_no: { type: DataTypes.STRING, allowNull: true },
    billing_type: { type: DataTypes.ENUM('Monthly', 'Milestone', 'Percentage'), defaultValue: 'Monthly' },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'projects', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'projects_org_code_unique_idx' }],
  });
  Project.associate = (models) => {
    Project.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' });
    Project.belongsTo(models.Customer, { as: 'customer', foreignKey: 'client_id' });
    Project.hasMany(models.Boq, { as: 'boqs', foreignKey: 'project_id' });
    Project.hasMany(models.Estimation, { as: 'estimations', foreignKey: 'project_id' });
  };
  return Project;
};
