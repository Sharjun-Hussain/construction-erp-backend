module.exports = (sequelize, DataTypes) => {
  const Enquiry = sequelize.define('Enquiry', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    client_id: { type: DataTypes.UUID, allowNull: true },
    client_name: { type: DataTypes.STRING, allowNull: true },
    consultant_name: { type: DataTypes.STRING, allowNull: true },
    source: { type: DataTypes.ENUM('Client', 'Consultant', 'Portal', 'Referral', 'Repeat', 'Other'), defaultValue: 'Client' },
    received_date: { type: DataTypes.DATEONLY, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    est_value: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    assigned_to: { type: DataTypes.STRING, allowNull: true, comment: 'Estimator name' },
    assigned_user_id: { type: DataTypes.UUID, allowNull: true },
    probability: { type: DataTypes.INTEGER, defaultValue: 50 },
    status: { type: DataTypes.ENUM('New', 'UnderReview', 'Inspected', 'Estimated', 'Quoted', 'Won', 'Lost', 'Dropped'), defaultValue: 'New' },
    tender_id: { type: DataTypes.UUID, allowNull: true },
    reason_lost: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'enquiries', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'enq_org_number_unique_idx' }],
  });
  Enquiry.associate = (models) => {
    Enquiry.belongsTo(models.Customer, { as: 'client', foreignKey: 'client_id' });
    Enquiry.belongsTo(models.Tender, { as: 'tender', foreignKey: 'tender_id' });
    Enquiry.hasMany(models.SiteInspection, { as: 'inspections', foreignKey: 'enquiry_id' });
  };
  return Enquiry;
};
