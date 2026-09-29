module.exports = (sequelize, DataTypes) => {
  const CustomField = sequelize.define('CustomField', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false, comment: 'project|tender|boq|po|...' },
    field_name: { type: DataTypes.STRING, allowNull: false },
    field_type: { type: DataTypes.ENUM('text', 'number', 'date', 'select', 'boolean'), defaultValue: 'text' },
    options: { type: DataTypes.JSON, allowNull: true, comment: 'choices for select type' },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'custom_fields', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'module', 'field_name'], name: 'cf_org_mod_field_unique_idx' }],
  });
  return CustomField;
};
