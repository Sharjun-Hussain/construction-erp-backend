module.exports = (sequelize, DataTypes) => {
  const Boq = sequelize.define('Boq', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    title_ar: { type: DataTypes.STRING, allowNull: true },
    revision: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Revised'), defaultValue: 'Draft' },
    total_amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  }, {
    tableName: 'boqs', underscored: true,
    indexes: [{ unique: true, fields: ['organization_id', 'project_id', 'number', 'revision'], name: 'boqs_org_proj_num_rev_unique_idx' }],
  });
  Boq.associate = (models) => {
    Boq.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
    Boq.hasMany(models.BoqItem, { as: 'items', foreignKey: 'boq_id' });
    Boq.hasMany(models.BoqHistory, { as: 'history', foreignKey: 'boq_id' });
  };
  return Boq;
};
