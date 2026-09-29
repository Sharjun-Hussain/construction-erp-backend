module.exports = (sequelize, DataTypes) => {
  const EquipmentRequest = sequelize.define('EquipmentRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    equipment_id: { type: DataTypes.UUID, allowNull: true },
    number: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    qty: { type: DataTypes.INTEGER, defaultValue: 1 },
    date_required: { type: DataTypes.DATEONLY, allowNull: false },
    duration_days: { type: DataTypes.INTEGER, defaultValue: 1 },
    operator_required: { type: DataTypes.BOOLEAN, defaultValue: false },
    requested_by: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Requested', 'Approved', 'Assigned', 'Fulfilled', 'Cancelled'), defaultValue: 'Requested' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'equipment_requests', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'eqr_org_number_unique_idx' }],
  });
  EquipmentRequest.associate = (models) => {
    EquipmentRequest.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    EquipmentRequest.belongsTo(models.Equipment, { as: 'equipment', foreignKey: 'equipment_id' });
  };
  return EquipmentRequest;
};
