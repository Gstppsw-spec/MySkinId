const adsDesignService = require("../services/adsDesign.service");
const googleDriveService = require("../services/googleDrive.service");
const response = require("../helpers/response");
const fs = require("fs");

const uploadFilesToDrive = async (files) => {
  const uploadedUrls = [];
  if (!files) return uploadedUrls;

  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  if (fileList.length === 0) return uploadedUrls;

  for (const file of fileList) {
    try {
      const url = await googleDriveService.uploadFile(file);
      uploadedUrls.push(url);
    } catch (error) {
      console.error("[AdsDesign Controller] Google Drive upload failed:", error);
      throw error;
    } finally {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }
  return uploadedUrls;
};

module.exports = {
  // --- MITRA ---
  async createRequest(req, res) {
    try {
      const { title, adsType, description } = req.body;
      const { locationId } = req.query; // Assuming locationId is passed in query or body
      
      if (!locationId) {
        return response.error(res, "locationId is required");
      }

      const referenceImages = await uploadFilesToDrive(req.files);

      const data = {
        title,
        adsType,
        description,
        referenceImages,
      };

      const result = await adsDesignService.createRequest(locationId, data);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updateRequest(req, res) {
    try {
      const { id } = req.params;
      const { title, adsType, description } = req.body;

      const referenceImages = await uploadFilesToDrive(req.files);

      const data = {
        title,
        adsType,
        description,
      };

      if (referenceImages.length > 0) {
        data.referenceImages = referenceImages;
      }

      const result = await adsDesignService.updateRequest(id, data);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteRequest(req, res) {
    try {
      const { id } = req.params;
      const result = await adsDesignService.deleteRequest(id);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getMyRequests(req, res) {
    try {
      const { locationId, page, pageSize, search } = req.query;
      const userId = req.user.id;

      const result = await adsDesignService.getMyRequests(userId, { locationId, page, pageSize, search });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const result = await adsDesignService.getRequestById(id);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async requestRevision(req, res) {
    try {
      const { id } = req.params;
      const { revisionNote } = req.body;

      if (!revisionNote) {
        return response.error(res, "revisionNote is required");
      }

      const result = await adsDesignService.requestRevision(id, revisionNote);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async approveDesign(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { paymentMethodCode } = req.body;

      if (!paymentMethodCode) {
        return response.error(res, "paymentMethodCode is required");
      }

      const result = await adsDesignService.approveDesign(id, userId, paymentMethodCode);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // --- ADMIN ---
  async getAllRequests(req, res) {
    try {
      const { page, pageSize, search, status, locationId } = req.query;
      const result = await adsDesignService.getAllRequests({ page, pageSize, search, status, locationId });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async processRequest(req, res) {
    try {
      const { id } = req.params;
      const result = await adsDesignService.processRequest(id);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async submitDesignResult(req, res) {
    try {
      const { id } = req.params;
      const { price } = req.body;

      if (price === undefined || price === null) {
        return response.error(res, "price is required");
      }

      const resultImages = await uploadFilesToDrive(req.files);
      if (resultImages.length === 0) {
        return response.error(res, "At least one result image is required");
      }

      const result = await adsDesignService.submitDesignResult(id, resultImages, price);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
