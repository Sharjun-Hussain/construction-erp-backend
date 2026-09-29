module.exports = (sequelize, DataTypes) => {
  const Equipment = sequelize.define('Equipment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true, comment: 'Crane|Excavator|Loader|Generator|Compactor|Vehicle|Other' },
    make_model: { type: DataTypes.STRING, allowNull: true },
    plate_no: { type: DataTypes.STRING, allowNull: true },
    serial_no: { type: DataTypes.STRING, allowNull: true },
    owned: { type: DataTypes.BOOLEAN, defaultValue: true },
    daily_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    current_project_id: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.ENUM('Available', 'OnSite', 'Maintenance', 'Idle', 'Hired'), defaultValue: 'Available' },
    last_service_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'equipment', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'eq_org_code_unique_idx' }],
  });
  Equipment.associate = (models) => {
    Equipment.belongsTo(models.Project, { as: 'current_project', foreignKey: 'current_project_id' });
  };
  return Equipment;
};
