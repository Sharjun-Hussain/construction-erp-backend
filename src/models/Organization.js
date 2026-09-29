module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Riyadh' },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: 'SA' },
    national_address: { type: DataTypes.STRING, allowNull: true },
    vat_number: { type: DataTypes.STRING(15), allowNull: true },
    cr_number: { type: DataTypes.STRING, allowNull: true, comment: 'Commercial Registration' },
    zatca_registered: { type: DataTypes.BOOLEAN, defaultValue: false },
    zatca_phase: { type: DataTypes.ENUM('None', 'Phase1', 'Phase2'), defaultValue: 'None' },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    language_default: { type: DataTypes.ENUM('en', 'ar'), defaultValue: 'en' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_master: { type: DataTypes.BOOLEAN, defaultValue: false },
    projects_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    estimation_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    zatca_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    hrm_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    accounting_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    module_overrides: { type: DataTypes.JSON, allowNull: true },
  }, { tableName: 'organizations', underscored: true });
  Organization.associate = (models) => {
    Organization.hasMany(models.Branch, { as: 'branches', foreignKey: 'organization_id' });
    Organization.hasMany(models.User, { as: 'users', foreignKey: 'organization_id' });
    Organization.hasMany(models.Project, { as: 'projects', foreignKey: 'organization_id' });
  };
  return Organization;
};
