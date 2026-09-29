module.exports = (sequelize, DataTypes) => {
  const Bank = sequelize.define('Bank', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    swift: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'banks', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'bank_org_code_unique_idx' }],
  });
  Bank.associate = (models) => {
    Bank.hasMany(models.BankAccount, { as: 'accounts', foreignKey: 'bank_id' });
  };
  return Bank;
};
