module.exports = (sequelize, DataTypes) => {
  const BankAccount = sequelize.define('BankAccount', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    bank_id: { type: DataTypes.UUID, allowNull: false },
    account_name: { type: DataTypes.STRING, allowNull: false },
    account_no: { type: DataTypes.STRING, allowNull: false },
    iban: { type: DataTypes.STRING, allowNull: true },
    currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
    opening_balance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'bank_accounts', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'account_no'], name: 'bankacct_org_no_unique_idx' }],
  });
  BankAccount.associate = (models) => {
    BankAccount.belongsTo(models.Bank, { as: 'bank', foreignKey: 'bank_id' });
  };
  return BankAccount;
};
