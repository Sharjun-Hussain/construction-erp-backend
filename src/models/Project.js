module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    'Project',
    {
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
      status: {
        type: DataTypes.ENUM('Draft', 'Tender', 'Awarded', 'InProgress', 'OnHold', 'Completed', 'HandedOver'),
        defaultValue: 'InProgress',
      },
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

      // Tranquil Specific Header & General Fields
      running_project: { type: DataTypes.BOOLEAN, defaultValue: true },
      proposal_no: { type: DataTypes.STRING, allowNull: true },
      project_no: { type: DataTypes.STRING, allowNull: true },
      project_type: { type: DataTypes.STRING, allowNull: true },
      service: { type: DataTypes.STRING, allowNull: true },
      project_name_ar: { type: DataTypes.STRING, allowNull: true },
      job_site: { type: DataTypes.STRING, allowNull: true },
      auto_generate_job_no: { type: DataTypes.BOOLEAN, defaultValue: true },
      contract_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      reference: { type: DataTypes.STRING, allowNull: true },
      budget_overrun: { type: DataTypes.STRING, defaultValue: 'Disallow' },
      not_to_exceed: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      extension_no: { type: DataTypes.STRING, allowNull: true },
      parent_project_id: { type: DataTypes.UUID, allowNull: true },
      description_ar: { type: DataTypes.TEXT, allowNull: true },
      manager_name: { type: DataTypes.STRING, allowNull: true },
      engineer_name: { type: DataTypes.STRING, allowNull: true },
      consultant_name: { type: DataTypes.STRING, allowNull: true },
      consultant_name_ar: { type: DataTypes.STRING, allowNull: true },
      remark: { type: DataTypes.TEXT, allowNull: true },
      customer_address: { type: DataTypes.TEXT, allowNull: true },
      customer_address_ar: { type: DataTypes.TEXT, allowNull: true },
      contacts_data: { type: DataTypes.JSON, allowNull: true },

      // GL Accounts & Compliance Rules
      revenue_account: { type: DataTypes.STRING, allowNull: true },
      equipment_expense_account: { type: DataTypes.STRING, allowNull: true },
      labour_expense_account: { type: DataTypes.STRING, allowNull: true },
      advance_invoice_account: { type: DataTypes.STRING, allowNull: true },
      hired_equipment_account: { type: DataTypes.STRING, allowNull: true },
      subcontractor_expense_account: { type: DataTypes.STRING, allowNull: true },

      progressive_invoice: { type: DataTypes.BOOLEAN, defaultValue: true },
      retention_required: { type: DataTypes.BOOLEAN, defaultValue: false },
      short_term_retention_required: { type: DataTypes.BOOLEAN, defaultValue: false },
      performance_bond: { type: DataTypes.BOOLEAN, defaultValue: false },
      retention_after_vat: { type: DataTypes.BOOLEAN, defaultValue: false },
      performance_bond_after_vat: { type: DataTypes.BOOLEAN, defaultValue: false },
      not_to_exceed_rule: { type: DataTypes.BOOLEAN, defaultValue: false },
      project_activation: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'projects',
      underscored: true,
      indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'projects_org_code_unique_idx' }],
    }
  );

  Project.associate = (models) => {
    Project.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' });
    Project.belongsTo(models.Customer, { as: 'customer', foreignKey: 'client_id' });
    Project.hasMany(models.Job, { as: 'jobs', foreignKey: 'project_id' });
    Project.hasMany(models.Boq, { as: 'boqs', foreignKey: 'project_id' });
    Project.hasMany(models.Estimation, { as: 'estimations', foreignKey: 'project_id' });
  };

  return Project;
};
