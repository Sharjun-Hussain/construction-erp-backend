module.exports = (sequelize, DataTypes) => {
  const Subcontractor = sequelize.define('Subcontractor', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    trade: { type: DataTypes.STRING, allowNull: true },
    vat_number: { type: DataTypes.STRING(15), allowNull: true },
    cr_number: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'subcontractors', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'sc_org_code_unique_idx' }],
  });
  return Subcontractor;
};
