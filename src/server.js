require("dotenv").config();
const express = require("express");
const sequelize = require("./config/db");
const locationsRoute = require("./routes/locationRoute");
const companyRoutes = require("./routes/companyRoute");
const userRoutes = require("./routes/userRoute");
const roleRoutes = require("./routes/roleRoute");
const imageLocationRoutes = require("./routes/imageLocationRoute");
const subServiceCategoryRoutes = require("./routes/subCategoryServiceRoute");
const mainServiceCategoryRoutes = require("./routes/mainCategoryServiceRoute");
const serviceTypeRoutes = require("./routes/serviceTypeRoute");
const serviceRoutes = require("./routes/serviceRoute");
const consultationRoutes = require("./routes/consultationRoute");
const consultationCategoryRoutes = require("./routes/consultationCategoryRoute");

const userCustomerRoutes = require("./routes/userCustomerRoute");
const path = require("path");
const cors = require("cors");

const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/uploads/consultation",
  express.static(path.join(__dirname, "../uploads/consultation"))
);

// sequelize.sync({ alter: true })
//   .then(() => console.log('✅ Tables synchronized'))
//   .catch(err => console.error('❌ Sync failed:', err));

// Routes
app.use(bodyParser.json());
app.use("/api/location", locationsRoute);
app.use("/api/company", companyRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subCategoryService", subServiceCategoryRoutes);
app.use("/api/mainCategoryService", mainServiceCategoryRoutes);
app.use("/api/image-location", imageLocationRoutes);
app.use("/api/userCustomer", userCustomerRoutes);
app.use("/api/consultation", consultationRoutes);
app.use("/api/consultation-category", consultationCategoryRoutes);

app.use("/api/service", serviceRoutes);
app.use("/api/servicetype", serviceTypeRoutes);

app.listen(process.env.PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
