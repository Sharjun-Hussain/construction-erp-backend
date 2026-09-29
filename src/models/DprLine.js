module.exports = (sequelize, DataTypes) => {
  const DprLine = sequelize.define('DprLine', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    dpr_id: { type: DataTypes.UUID, allowNull: false },
    boq_item_id: { type: DataTypes.UUID, allowNull: false },
    qty_done: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    remarks: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'dpr_lines', underscored: true });
  DprLine.associate = (models) => {
    DprLine.belongsTo(models.DprLog, { as: 'dpr', foreignKey: 'dpr_id' });
  };
  return DprLine;
};
