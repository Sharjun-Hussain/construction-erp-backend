module.exports = (sequelize, DataTypes) => {
  const MaterialIndent = sequelize.define('MaterialIndent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    required_by: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Rejected', 'Ordered', 'Closed'), defaultValue: 'Draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'material_indents', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'indents_org_number_unique_idx' }],
  });
  MaterialIndent.associate = (models) => {
    MaterialIndent.hasMany(models.MaterialIndentItem, { as: 'items', foreignKey: 'indent_id' });
    MaterialIndent.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    MaterialIndent.belongsTo(models.User, { as: 'creator', foreignKey: 'created_by' });
  };
  return MaterialIndent;
};
