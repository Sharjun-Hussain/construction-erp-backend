module.exports = (sequelize, DataTypes) => {
  const Guarantee = sequelize.define('Guarantee', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('BidBond', 'Performance', 'AdvancePayment', 'Retention'), allowNull: false, defaultValue: 'Performance' },
    bank_name: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    margin_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    issue_date: { type: DataTypes.DATEONLY, allowNull: true },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Active', 'Released', 'Expired', 'Claimed'), defaultValue: 'Draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'guarantees', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'guarantees_org_number_unique_idx' }],
  });
  return Guarantee;
};
