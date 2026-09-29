module.exports = (sequelize, DataTypes) => {
  const CustomerContact = sequelize.define('CustomerContact', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    customer_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'customer_contacts', underscored: true });
  CustomerContact.associate = (models) => {
    CustomerContact.belongsTo(models.Customer, { as: 'customer', foreignKey: 'customer_id' });
  };
  return CustomerContact;
};
