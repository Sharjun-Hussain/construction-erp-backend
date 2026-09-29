module.exports = (sequelize, DataTypes) => {
  const TenderBaselineItem = sequelize.define('TenderBaselineItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    tender_id: { type: DataTypes.UUID, allowNull: false },
    boq_item_id: { type: DataTypes.UUID, allowNull: true },
    line_no: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: true },
    division: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    cost_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    cost_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, { tableName: 'tender_baseline_items', underscored: true });
  TenderBaselineItem.associate = (models) => {
    TenderBaselineItem.belongsTo(models.Tender, { as: 'tender', foreignKey: 'tender_id' });
  };
  return TenderBaselineItem;
};
