const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../config/db");
const ConsultationCategory = require("./consultationCategoryModel");
const MsUserCustomer = require("./userCustomerModel");

const ConsultationRoom = sequelize.define(
  "ConsultationRoom",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomcode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    categoryid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "consultationcategory",
        key: "id",
      },
    },
    doctorid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    customerid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        mode: "msuser_customer",
        key: "id",
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    expiredat: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("DATE_ADD(NOW(), INTERVAL 7 DAY)")
    },
    createdate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    createuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updateuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "consultationroom",
    timestamps: false,
  }
);

ConsultationRoom.belongsTo(ConsultationCategory, { foreignKey: 'categoryid', as: 'categoryconsultation' });
ConsultationCategory.hasMany(ConsultationRoom, { foreignKey: 'categoryid', as: 'consultationroom' });

ConsultationRoom.belongsTo(MsUserCustomer, { foreignKey: 'customerid', as: 'user_customer' });
MsUserCustomer.hasMany(ConsultationRoom, { foreignKey: 'customerid', as: 'consultationroom' });

module.exports = ConsultationRoom;
