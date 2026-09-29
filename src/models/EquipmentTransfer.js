module.exports = (sequelize, DataTypes) => {
  const EquipmentTransfer = sequelize.define('EquipmentTransfer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    equipment_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    from_project_id: { type: DataTypes.UUID, allowNull: true },
    to_project_id: { type: DataTypes.UUID, allowNull: false },
    transfer_date: { type: DataTypes.DATEONLY, allowNull: false },
    condition_out: { type: DataTypes.TEXT, allowNull: true },
    condition_in: { type: DataTypes.TEXT, allowNull: true },
    odometer_out: { type: DataTypes.DECIMAL(18, 1), allowNull: true },
    odometer_in: { type: DataTypes.DECIMAL(18, 1), allowNull: true },
    handed_by: { type: DataTypes.STRING, allowNull: true },
    received_by: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Approved', 'Completed', 'Cancelled'), defaultValue: 'Draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'equipment_transfers', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'eqt_org_number_unique_idx' }],
  });
  EquipmentTransfer.associate = (models) => {
    EquipmentTransfer.belongsTo(models.Equipment, { as: 'equipment', foreignKey: 'equipment_id' });
    EquipmentTransfer.belongsTo(models.Project, { as: 'from_project', foreignKey: 'from_project_id' });
    EquipmentTransfer.belongsTo(models.Project, { as: 'to_project', foreignKey: 'to_project_id' });
  };
  return EquipmentTransfer;
};
