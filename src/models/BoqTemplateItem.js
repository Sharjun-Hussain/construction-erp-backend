module.exports = (sequelize, DataTypes) => {
  const BoqTemplateItem = sequelize.define('BoqTemplateItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    template_id: { type: DataTypes.UUID, allowNull: false },
    line_no: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    unit: { type: DataTypes.STRING, defaultValue: 'LS' },
    division: { type: DataTypes.STRING, allowNull: true },
    trade: { type: DataTypes.STRING, allowNull: true },
    unit_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    cost_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, { tableName: 'boq_template_items', underscored: true });
  BoqTemplateItem.associate = (models) => {
    BoqTemplateItem.belongsTo(models.BoqTemplate, { as: 'template', foreignKey: 'template_id' });
  };
  return BoqTemplateItem;
};
