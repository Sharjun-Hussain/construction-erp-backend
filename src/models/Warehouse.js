module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define(
    'Warehouse',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      organization_id: { type: DataTypes.UUID, allowNull: false },
      is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
      locator_available: { type: DataTypes.BOOLEAN, defaultValue: false },
      code: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      name_ar: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      address_ar: { type: DataTypes.TEXT, allowNull: true },
      contact_person: { type: DataTypes.STRING, allowNull: true },
      contact_person_ar: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'warehouses',
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['organization_id', 'code'],
          name: 'warehouse_org_code_unique_idx',
        },
      ],
    }
  );
  return Warehouse;
};
