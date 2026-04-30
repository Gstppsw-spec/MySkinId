const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.init();
  }

  init() {
    try {
      const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
      if (!credentialsPath) {
        console.warn("GOOGLE_DRIVE_CREDENTIALS_PATH is not set in .env");
        return;
      }

      const fullPath = path.resolve(process.cwd(), credentialsPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`Google Drive credentials not found at ${fullPath}`);
        return;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: fullPath,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });

      this.drive = google.drive({ version: "v3", auth });
      console.log("[GoogleDriveService] Drive API initialized successfully");
    } catch (error) {
      console.error("[GoogleDriveService] Failed to initialize Drive API:", error);
    }
  }

  /**
   * Upload a file to Google Drive
   * @param {Object} file - The file object from Multer
   * @returns {Promise<string>} The public webViewLink of the uploaded file
   */
  async uploadFile(file) {
    if (!this.drive) {
      throw new Error("Google Drive API is not initialized");
    }

    if (!this.folderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in .env");
    }

    try {
      const fileMetadata = {
        name: `${Date.now()}-${file.originalname}`,
        parents: [this.folderId],
      };

      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };

      console.log("[GoogleDriveService] Sending request to Google Drive API...");
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink",
        supportsAllDrives: true, // Required for Shared Drives
      });
      console.log("[GoogleDriveService] Google Drive API response received:", response.data.id);

      const fileId = response.data.id;

      // Unnecessary since the folder should have 'Anyone with link can view' permission,
      // but just in case, we can also explicitly set the file permission.
      // await this.drive.permissions.create({
      //   fileId: fileId,
      //   requestBody: {
      //     role: 'reader',
      //     type: 'anyone',
      //   },
      // });

      // Return the Google Drive link
      // Alternatively, we can construct the direct download link if needed:
      // return `https://drive.google.com/uc?id=${fileId}`;
      
      return response.data.webViewLink;
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
