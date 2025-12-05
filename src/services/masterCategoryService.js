const {
  masterMainCategoryService,
  masterSubCategoryService,
} = require("../models");

module.exports = {
  async getAllMainServiceCategory() {
    try {
      const mainCategoryService = await masterMainCategoryService.findAll({
        order: [["name", "ASC"]],
      });

      return {
        status: true,
        message: "Berhasil fetch main category service",
        data: mainCategoryService,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getMainServiceCategoryById(id) {
    try {
      const category = await masterMainCategoryService.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }
      return { status: true, message: "Success", data: category };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async createMainServiceCategory(data) {
    try {
      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      const existing = await masterMainCategoryService.findOne({
        where: { name: data.name },
      });
      if (existing) {
        return {
          status: false,
          message: "Category with this name already exists",
          data: null,
        };
      }

      const newCategory = await masterMainCategoryService.create({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });

      return {
        status: true,
        message: "Category created successfully",
        data: newCategory,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async updateMainServiceCategory(id, data) {
    try {
      const category = await masterMainCategoryService.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }

      if (data.name && data.name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      if (data.name && data.name !== category.name) {
        const existing = await masterMainCategoryService.findOne({
          where: { name: data.name },
        });
        if (existing) {
          return {
            status: false,
            message: "Category with this name already exists",
            data: null,
          };
        }
      }

      category.name = data.name !== undefined ? data.name : category.name;
      category.description =
        data.description !== undefined
          ? data.description
          : category.description;
      category.isActive =
        data.isActive !== undefined ? data.isActive : category.isActive;

      await category.save();

      return {
        status: true,
        message: "Category updated successfully",
        data: category,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  //sub category service
  async getAllSubServiceCategory() {
    try {
      const subCategoryService = await masterSubCategoryService.findAll({
        order: [["name", "ASC"]],
      });

      return {
        status: true,
        message: "Berhasil fetch sub category service",
        data: subCategoryService,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getSubServiceCategoryById(id) {
    try {
      const category = await masterSubCategoryService.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }
      return { status: true, message: "Success", data: category };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async createSubServiceCategory(data) {
    try {
      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      const existing = await masterSubCategoryService.findOne({
        where: { name: data.name },
      });
      if (existing) {
        return {
          status: false,
          message: "Category with this name already exists",
          data: null,
        };
      }

      const newCategory = await masterSubCategoryService.create({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        mainCategoryServiceId: data.mainCategoryServiceId,
      });

      return {
        status: true,
        message: "Category created successfully",
        data: newCategory,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async updateSubServiceCategory(id, data) {
    try {
      const category = await masterSubCategoryService.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }

      if (data.name && data.name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      if (data.name && data.name !== category.name) {
        const existing = await masterSubCategoryService.findOne({
          where: { name: data.name },
        });
        if (existing) {
          return {
            status: false,
            message: "Category with this name already exists",
            data: null,
          };
        }
      }

      category.name = data.name !== undefined ? data.name : category.name;
      category.description =
        data.description !== undefined
          ? data.description
          : category.description;
      category.isActive =
        data.isActive !== undefined ? data.isActive : category.isActive;
      category.mainCategoryServiceId =
        data.mainCategoryServiceId !== undefined
          ? data.mainCategoryServiceId
          : category.mainCategoryServiceId;

      await category.save();

      return {
        status: true,
        message: "Category updated successfully",
        data: category,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
