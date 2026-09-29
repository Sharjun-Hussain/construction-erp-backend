module.exports = (sequelize, DataTypes) => {
  const Grn = sequelize.define('Grn', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    po_id: { type: DataTypes.UUID, allowNull: false },
    supplier_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    delivery_note: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Draft', 'Posted', 'Cancelled'), defaultValue: 'Draft' },
    total: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, {
    tableName: 'grns', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'number'], name: 'grn_org_number_unique_idx' }],
  });
  Grn.associate = (models) => {
    Grn.hasMany(models.GrnItem, { as: 'items', foreignKey: 'grn_id' });
    Grn.belongsTo(models.PurchaseOrder, { as: 'po', foreignKey: 'po_id' });
    Grn.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplier_id' });
    Grn.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
  };
  return Grn;
};
