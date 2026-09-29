module.exports = (sequelize, DataTypes) => {
  const BoqItem = sequelize.define('BoqItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    boq_id: { type: DataTypes.UUID, allowNull: false },
    line_no: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    description_ar: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LS' },
    quantity: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    trade: { type: DataTypes.STRING, allowNull: true },
    division: { type: DataTypes.STRING, allowNull: true, comment: 'WBS division / section' },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    cost_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0, comment: 'Unit cost from rate analysis' },
    progress_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    billed_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
  }, { tableName: 'boq_items', underscored: true });
  BoqItem.associate = (models) => {
    BoqItem.belongsTo(models.Boq, { as: 'boq', foreignKey: 'boq_id' });
  };
  return BoqItem;
};
