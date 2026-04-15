require("dotenv").config();
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = require(path.resolve(process.env.FIREBASE_KEY_PATH));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
