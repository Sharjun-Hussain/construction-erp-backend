module.exports = (sequelize, DataTypes) => {
  const TenderAddendum = sequelize.define('TenderAddendum', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    tender_id: { type: DataTypes.UUID, allowNull: false },
    ref_no: { type: DataTypes.INTEGER, defaultValue: 1, comment: 'Addendum sequence' },
    type: { type: DataTypes.ENUM('Addendum', 'Clarification', 'QandA', 'Corrigendum'), defaultValue: 'Clarification' },
    subject: { type: DataTypes.STRING, allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true, comment: 'Question or change description' },
    response: { type: DataTypes.TEXT, allowNull: true, comment: 'Consultant / client response' },
    issued_date: { type: DataTypes.DATEONLY, allowNull: true },
    responded_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('Open', 'Answered', 'Closed'), defaultValue: 'Open' },
  }, { tableName: 'tender_addenda', underscored: true });
  TenderAddendum.associate = (models) => {
    TenderAddendum.belongsTo(models.Tender, { as: 'tender', foreignKey: 'tender_id' });
  };
  return TenderAddendum;
};
