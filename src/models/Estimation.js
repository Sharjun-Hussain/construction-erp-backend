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

    // Tranquil ERP Form Fields
    date: { type: DataTypes.DATEONLY, allowNull: true },
    enquiry_id: { type: DataTypes.UUID, allowNull: true },
    enquiry_no: { type: DataTypes.STRING, allowNull: true },
    reference: { type: DataTypes.STRING, allowNull: true },
    site: { type: DataTypes.STRING, allowNull: true },
    bid_expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
    expected_start_date: { type: DataTypes.DATEONLY, allowNull: true },
    expected_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    salesman: { type: DataTypes.STRING, allowNull: true },
    similar_projects: { type: DataTypes.STRING, allowNull: true },
    customer_name: { type: DataTypes.STRING, allowNull: true },
    customer_address: { type: DataTypes.TEXT, allowNull: true },
    contact_person: { type: DataTypes.STRING, allowNull: true },
    contact_phone: { type: DataTypes.STRING, allowNull: true },
    contact_email: { type: DataTypes.STRING, allowNull: true },
    project_type: { type: DataTypes.STRING, allowNull: true },
    service: { type: DataTypes.STRING, allowNull: true },
    project_name_ar: { type: DataTypes.STRING, allowNull: true },
    extension_no: { type: DataTypes.STRING, allowNull: true },
    parent_project_id: { type: DataTypes.UUID, allowNull: true },
    scope_of_work: { type: DataTypes.TEXT, allowNull: true },
    auto_generate_job_no: { type: DataTypes.BOOLEAN, defaultValue: true },
    copy_attachment_enquiry: { type: DataTypes.BOOLEAN, defaultValue: false },
    copy_attachment_site_inspection: { type: DataTypes.BOOLEAN, defaultValue: false },
    estimate_without_resource: { type: DataTypes.BOOLEAN, defaultValue: false },
    default_material_cost_pricelist: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'estimations', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number', 'revision'], name: 'est_org_proj_num_rev_unique_idx' }],
  });
  Estimation.associate = (models) => {
    Estimation.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    Estimation.belongsTo(models.Enquiry, { as: 'enquiry', foreignKey: 'enquiry_id' });
    Estimation.belongsTo(models.Project, { as: 'parent_project', foreignKey: 'parent_project_id' });
    Estimation.hasMany(models.EstimationItem, { as: 'items', foreignKey: 'estimation_id' });
  };
  return Estimation;
};
