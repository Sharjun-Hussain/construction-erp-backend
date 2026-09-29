module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    entity_type: { type: DataTypes.STRING, allowNull: false, comment: 'project|boq|po|grn|ipc|tender|sc|dpr|vo' },
    entity_id: { type: DataTypes.UUID, allowNull: false },
    file_name: { type: DataTypes.STRING, allowNull: false },
    file_path: { type: DataTypes.STRING, allowNull: false },
    mime: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.INTEGER, allowNull: true },
    uploaded_by: { type: DataTypes.UUID, allowNull: true },
  }, { tableName: 'documents', underscored: true });
  return Document;
};
