module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    // flags
    is_service: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_taxable: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_sellable: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_purchasable: { type: DataTypes.BOOLEAN, defaultValue: true },
    // general info
    category: { type: DataTypes.STRING, allowNull: true },
    manufacturer: { type: DataTypes.STRING, allowNull: true },
    manufacturer_part_no: { type: DataTypes.STRING, allowNull: true },
    model_no: { type: DataTypes.STRING, allowNull: true },
    suffix: { type: DataTypes.STRING, allowNull: true },
    description_ar: { type: DataTypes.TEXT, allowNull: true },
    vat_rate_id: { type: DataTypes.UUID, allowNull: true },
    vat_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 15 },
    inventory_account: { type: DataTypes.STRING, defaultValue: 'Inventory Asset' },
    income_account: { type: DataTypes.STRING, defaultValue: 'Sales of Product Income' },
    expense_account: { type: DataTypes.STRING, defaultValue: 'Cost Of Sales' },
    preferred_supplier_id: { type: DataTypes.UUID, allowNull: true },
    discount_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    lead_time_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    lead_time_unit: { type: DataTypes.STRING, defaultValue: 'Days' },
    department: { type: DataTypes.STRING, allowNull: true },
    has_tolerance: { type: DataTypes.BOOLEAN, defaultValue: false },
    tolerance_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    // item details
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NOS' },
    purchase_unit: { type: DataTypes.STRING, allowNull: true },
    conversion_factor: { type: DataTypes.DECIMAL(18, 4), defaultValue: 1 },
    barcode: { type: DataTypes.STRING, allowNull: true },
    brand: { type: DataTypes.STRING, allowNull: true },
    country_of_origin: { type: DataTypes.STRING, allowNull: true },
    weight_kg: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    length_m: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    width_m: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    height_m: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    max_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    reorder_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    batch_tracking: { type: DataTypes.BOOLEAN, defaultValue: false },
    serial_tracking: { type: DataTypes.BOOLEAN, defaultValue: false },
    expiry_tracking: { type: DataTypes.BOOLEAN, defaultValue: false },
    shelf_life_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    // pricing
    purchase_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    sell_price: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    last_rate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    min_qty: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'materials', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'code'], name: 'materials_org_code_unique_idx' }],
  });
  Material.associate = (models) => {
    Material.hasMany(models.ItemPrice, { as: 'prices', foreignKey: 'material_id' });
    Material.hasMany(models.ItemSpec, { as: 'specs', foreignKey: 'material_id' });
    Material.belongsTo(models.VatRate, { as: 'vat_rate', foreignKey: 'vat_rate_id' });
    Material.belongsTo(models.Supplier, { as: 'preferred_supplier', foreignKey: 'preferred_supplier_id' });
  };
  return Material;
};
