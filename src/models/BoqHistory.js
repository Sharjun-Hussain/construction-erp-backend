module.exports = (sequelize, DataTypes) => {
  const BoqHistory = sequelize.define('BoqHistory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    boq_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    detail: { type: DataTypes.TEXT, allowNull: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    user_name: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'boq_history', underscored: true, updatedAt: false });
  return BoqHistory;
};
