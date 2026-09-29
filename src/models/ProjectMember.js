module.exports = (sequelize, DataTypes) => {
  const ProjectMember = sequelize.define('ProjectMember', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    member_name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Site Engineer' },
    phone: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'project_members', underscored: true });
  return ProjectMember;
};
