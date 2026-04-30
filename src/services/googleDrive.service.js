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
   * Get or create a folder in Google Drive
   * @param {string} name - Folder name
   * @param {string} parentId - Parent folder ID
   * @returns {Promise<string>} Folder ID
   */
  async getOrCreateFolder(name, parentId) {
    try {
      // Search for existing folder
      const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const list = await this.drive.files.list({
        q: query,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (list.data.files && list.data.files.length > 0) {
        return list.data.files[0].id;
      }

      // Create new folder if not found
      const folderMetadata = {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
        supportsAllDrives: true,
      });

      return folder.data.id;
    } catch (error) {
      console.error("[GoogleDriveService] Error in getOrCreateFolder:", error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive with optional subfolders
   * @param {Object} file - The file object from Multer
   * @param {Array} subfolders - Array of folder names to create/use as path
   * @returns {Promise<string>} The public webViewLink of the uploaded file
   */
  async uploadFile(file, subfolders = []) {
    if (!this.drive) {
      throw new Error("Google Drive API is not initialized");
    }

    if (!this.folderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in .env");
    }

    try {
      let currentParentId = this.folderId;

      // Navigate/Create subfolder structure
      for (const folderName of subfolders) {
        if (folderName) {
          currentParentId = await this.getOrCreateFolder(folderName, currentParentId);
        }
      }

      const fileMetadata = {
        name: `${Date.now()}-${file.originalname}`,
        parents: [currentParentId],
      };

      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };

      console.log(`[GoogleDriveService] Uploading ${file.originalname} to folder ID: ${currentParentId}`);
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink",
        supportsAllDrives: true,
      });
      
      return response.data.webViewLink;
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
