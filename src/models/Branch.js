module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    is_main: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'branches', underscored: true });
  Branch.associate = (models) => {
    Branch.belongsTo(models.Organization, { as: 'organization', foreignKey: 'organization_id' });
  };
  return Branch;
};
