module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define('Reminder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: true },
    ref_id: { type: DataTypes.UUID, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    assigned_to: { type: DataTypes.STRING, allowNull: true },
    is_done: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'reminders', underscored: true });
  return Reminder;
};
