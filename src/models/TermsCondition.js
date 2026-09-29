module.exports = (sequelize, DataTypes) => {
  const TermsCondition = sequelize.define('TermsCondition', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    doc_type: { type: DataTypes.STRING, allowNull: false, comment: 'proposal|tender|po|quotation|invoice|contract' },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'terms_conditions', underscored: true,
    indexes: [{ fields: ['organization_id', 'doc_type'], name: 'terms_org_doctype_idx' }],
  });
  return TermsCondition;
};
