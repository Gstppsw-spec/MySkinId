const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

class FirebaseStorageService {
  constructor() {
    this.bucket = null;
    this.init();
  }

  init() {
    try {
      const keyPath = process.env.FIREBASE_KEY_PATH || process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
      if (!keyPath) {
        console.warn("[FirebaseStorageService] FIREBASE_KEY_PATH is not set");
        return;
      }

      const fullPath = path.resolve(process.cwd(), keyPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[FirebaseStorageService] Key file not found at ${fullPath}`);
        return;
      }

      const serviceAccount = require(fullPath);
      
      // Initialize Firebase Admin if not already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: `${serviceAccount.project_id}.firebasestorage.app`, // Default Firebase storage bucket
        });
      }

      this.bucket = admin.storage().bucket();
      console.log("[FirebaseStorageService] Initialized successfully");
    } catch (error) {
      console.error("[FirebaseStorageService] Initialization failed:", error);
    }
  }

  /**
   * Upload file to Firebase Storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Destination folder in bucket
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  async uploadFile(file, folder = "ads-design") {
    if (!this.bucket) {
      throw new Error("Firebase Storage is not initialized");
    }

    try {
      const destination = `${folder}/${Date.now()}-${file.originalname}`;
      const fileOptions = {
        destination: destination,
        public: true,
        metadata: {
          contentType: file.mimetype,
        },
      };

      await this.bucket.upload(file.path, fileOptions);

      // Construct public URL
      // https://storage.googleapis.com/BUCKET_NAME/FILE_NAME
      return `https://storage.googleapis.com/${this.bucket.name}/${destination}`;
    } catch (error) {
      console.error("[FirebaseStorageService] Upload failed:", error);
      throw error;
    }
  }
}

module.exports = new FirebaseStorageService();
