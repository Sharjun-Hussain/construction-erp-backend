module.exports = (sequelize, DataTypes) => {
  const BoqTemplate = sequelize.define('BoqTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'boq_templates', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'name'], name: 'boqtmp_org_name_unique_idx' }],
  });
  BoqTemplate.associate = (models) => {
    BoqTemplate.hasMany(models.BoqTemplateItem, { as: 'items', foreignKey: 'template_id' });
  };
  return BoqTemplate;
};
