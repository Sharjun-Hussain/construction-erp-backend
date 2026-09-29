module.exports = (sequelize, DataTypes) => {
  const Tender = sequelize.define('Tender', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    estimation_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    reference: { type: DataTypes.STRING, allowNull: true, comment: 'Client tender / RFP reference' },
    title: { type: DataTypes.STRING, allowNull: true },
    client_id: { type: DataTypes.UUID, allowNull: true },
    client_name: { type: DataTypes.STRING, allowNull: true },
    consultant_name: { type: DataTypes.STRING, allowNull: true },
    tender_type: { type: DataTypes.ENUM('Open', 'Selective', 'Limited', 'Negotiated'), defaultValue: 'Open' },
    contract_type: { type: DataTypes.ENUM('LumpSum', 'UnitRate', 'CostPlus', 'GMP'), defaultValue: 'LumpSum' },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    issue_date: { type: DataTypes.DATEONLY, allowNull: true },
    submission_deadline: { type: DataTypes.DATEONLY, allowNull: true },
    validity_date: { type: DataTypes.DATEONLY, allowNull: true },
    bid_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    cost_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0, comment: 'Baseline total cost frozen at submission' },
    margin_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    contingency_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    escalation_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    bond_type: { type: DataTypes.STRING, allowNull: true, comment: 'Bank guarantee | Bid bond | Tender bond' },
    bond_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    bond_expiry: { type: DataTypes.DATEONLY, allowNull: true },
    bond_ref: { type: DataTypes.STRING, allowNull: true },
    bond_status: { type: DataTypes.ENUM('None', 'Pending', 'Issued', 'Released', 'Forfeited'), defaultValue: 'None' },
    scope: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Won', 'Lost', 'Cancelled'), defaultValue: 'Draft' },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
    baseline_frozen_at: { type: DataTypes.DATE, allowNull: true },
    awarded_at: { type: DataTypes.DATE, allowNull: true },
    awarded_project_id: { type: DataTypes.UUID, allowNull: true },
    reason_lost: { type: DataTypes.STRING, allowNull: true },
    probability: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Win probability 0-100' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'tenders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'tenders_org_number_unique_idx' }],
  });
  Tender.associate = (models) => {
    Tender.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    Tender.belongsTo(models.Estimation, { as: 'estimation', foreignKey: 'estimation_id' });
    Tender.belongsTo(models.Customer, { as: 'client', foreignKey: 'client_id' });
    Tender.hasMany(models.TenderAddendum, { as: 'addenda', foreignKey: 'tender_id' });
    Tender.hasMany(models.TenderHistory, { as: 'history', foreignKey: 'tender_id' });
    Tender.hasMany(models.TenderBaselineItem, { as: 'baseline_items', foreignKey: 'tender_id' });
  };
  return Tender;
};
