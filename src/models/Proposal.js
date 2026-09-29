module.exports = (sequelize, DataTypes) => {
  const Proposal = sequelize.define('Proposal', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    tender_id: { type: DataTypes.UUID, allowNull: true },
    estimation_id: { type: DataTypes.UUID, allowNull: true },
    enquiry_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    revision: { type: DataTypes.INTEGER, defaultValue: 1 },
    title: { type: DataTypes.STRING, allowNull: false },
    client_name: { type: DataTypes.STRING, allowNull: true },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    validity_days: { type: DataTypes.INTEGER, defaultValue: 90 },
    valid_until: { type: DataTypes.DATEONLY, allowNull: true },
    payment_terms: { type: DataTypes.STRING, allowNull: true },
    delivery_terms: { type: DataTypes.TEXT, allowNull: true },
    exclusions: { type: DataTypes.TEXT, allowNull: true },
    cover_letter: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'), defaultValue: 'Draft' },
    sent_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'proposals', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number', 'revision'], name: 'prop_org_num_rev_unique_idx' }],
  });
  Proposal.associate = (models) => {
    Proposal.belongsTo(models.Tender, { as: 'tender', foreignKey: 'tender_id' });
    Proposal.belongsTo(models.Estimation, { as: 'estimation', foreignKey: 'estimation_id' });
    Proposal.belongsTo(models.Enquiry, { as: 'enquiry', foreignKey: 'enquiry_id' });
  };
  return Proposal;
};
