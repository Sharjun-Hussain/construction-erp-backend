module.exports = (sequelize, DataTypes) => {
  const LabourRequest = sequelize.define('LabourRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    trade: { type: DataTypes.STRING, allowNull: false },
    qty_requested: { type: DataTypes.INTEGER, defaultValue: 1 },
    qty_assigned: { type: DataTypes.INTEGER, defaultValue: 0 },
    date_required: { type: DataTypes.DATEONLY, allowNull: false },
    duration_days: { type: DataTypes.INTEGER, defaultValue: 1 },
    shift: { type: DataTypes.ENUM('Day', 'Night', 'Both'), defaultValue: 'Day' },
    skill_level: { type: DataTypes.STRING, allowNull: true },
    requested_by: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Requested', 'Approved', 'Assigned', 'Fulfilled', 'Cancelled'), defaultValue: 'Requested' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'labour_requests', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'lab_org_number_unique_idx' }],
  });
  LabourRequest.associate = (models) => {
    LabourRequest.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
  };
  return LabourRequest;
};
