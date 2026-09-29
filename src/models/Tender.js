module.exports = (sequelize, DataTypes) => {
  const Tender = sequelize.define('Tender', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    estimation_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    bid_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Won', 'Lost', 'Cancelled'), defaultValue: 'Draft' },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'tenders', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'tenders_org_number_unique_idx' }],
  });
  return Tender;
};
