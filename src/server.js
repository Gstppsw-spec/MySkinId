require("dotenv").config();
const express = require("express");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swagger/swagger-output.json");
const http = require("http");
const initSocket = require("./socket/socket");



const authUserRoute = require("./routes/authUserRoute");
const categoryRoute = require("./routes/master/categoryRoute");
const productRoute = require("./routes/master/product");
const companyRoute = require("./routes/company/relationshipUserCompany.route");
const companyVerificationRoute = require("./routes/verification/companyVerificationRoutes");
const requestVerificationRoute = require("./routes/verification/requestVerificationRoute");
const locationRoute = require("./routes/master/masterLocation.route");
const locationVerificationRoute = require("./routes/verification/locationVerificationRoutes");
const customerRoute = require("./routes/master/masterCustomer.route");
const serviceRoute = require("./routes/master/service");
const consultationRoute = require("./routes/consultation/consultation");
const orderCartRoute = require("./routes/transaction/orderCart");
const favoritesRoute = require("./routes/favorites/favorites");
const skinAnalysisRoute = require("./routes/skinAnalysis.route");
const ratingRoute = require("./routes/ratingRoute");
const packageRoute = require("./routes/master/package");

const customerCartRoute = require("./routes/transaction/customerCart");
const transactionOrderRoute = require("./routes/transaction/order");
const userRoute = require("./routes/userRoute");

// Social media routes
const postRoute = require("./routes/social/post.route");
const likeRoute = require("./routes/social/like.route");
const commentRoute = require("./routes/social/comment.route");
const followRoute = require("./routes/social/follow.route");

const path = require("path");
const cors = require("cors");

const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(cors());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "userid"],
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/uploads/consultation",
  express.static(path.join(__dirname, "../uploads/consultation")),
);
app.use(
  "/uploads/location",
  express.static(path.join(__dirname, "../uploads/location")),
);
app.use(
  "/uploads/posts",
  express.static(path.join(__dirname, "../uploads/posts")),
);

app.use(bodyParser.json());
app.use("/api/v2/auth", authUserRoute);
app.use("/api/v2/category", categoryRoute);
app.use("/api/v2/product", productRoute);
app.use("/api/v2/company", companyRoute);
app.use("/api/v2/request-verification", requestVerificationRoute);
app.use("/api/v2/verification/company", companyVerificationRoute);
app.use("/api/v2/verification/location", locationVerificationRoute);
app.use("/api/v2/location", locationRoute);
app.use("/api/v2/auth-customer", customerRoute);
app.use("/api/v2/customer", customerRoute);
app.use("/api/v2/service", serviceRoute);
app.use("/api/v2/consultation", consultationRoute);
app.use("/api/v2/cart", orderCartRoute);
app.use("/api/v2/favorite", favoritesRoute);
app.use("/api/v2/skin-analysis", skinAnalysisRoute);
app.use("/api/v2/rating", ratingRoute);
app.use("/api/v2/package", packageRoute);
app.use("/api/v2/user", userRoute);

app.use("/api/v2/customer-cart", customerCartRoute);
app.use("/api/v2/transaction/order", transactionOrderRoute);

// Social media routes
app.use("/api/v2/posts", postRoute);
app.use("/api/v2/posts", likeRoute);
app.use("/api/v2/posts", commentRoute);
app.use("/api/v2/users", followRoute);

const server = http.createServer(app);

initSocket(server);

// const io = new Server(server, { cors: { origin: "*" } });

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

server.listen(process.env.PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`),
);
