const MsServicePackageItem = sequelize.define(
  "MsServicePackageItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    packageid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "msservice",
        key: "id",
      },
    },
    serviceid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "msservice",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      default: 1,
    },
    sortorder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    createbyuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updateuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    isactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "msservicepackageitem",
    timestamps: false,
  }
);