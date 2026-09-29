module.exports = (sequelize, DataTypes) => {
  const IpcItem = sequelize.define('IpcItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    ipc_id: { type: DataTypes.UUID, allowNull: false },
    boq_item_id: { type: DataTypes.UUID, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    unit: { type: DataTypes.STRING, defaultValue: 'LS' },
    qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, { tableName: 'ipc_items', underscored: true });
  IpcItem.associate = (models) => {
    IpcItem.belongsTo(models.IpcInvoice, { as: 'ipc', foreignKey: 'ipc_id' });
  };
  return IpcItem;
};
