module.exports = (sequelize, DataTypes) => {
  const ClientAdvance = sequelize.define('ClientAdvance', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    recovered: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Received', 'Recovering', 'Closed'), defaultValue: 'Draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'client_advances', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number'], name: 'adv_org_proj_num_unique_idx' }],
  });
  return ClientAdvance;
};
