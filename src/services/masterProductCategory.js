const { masterProductCategory } = require("../models");

module.exports = {
  async getAll() {
    try {
      const categories = await masterProductCategory.findAll({
        // where: { isActive: true },
        order: [["name", "ASC"]],
      });
      return { status: true, message: "Success", data: categories };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getById(id) {
    try {
      const category = await masterProductCategory.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }
      return { status: true, message: "Success", data: category };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async create(data) {
    try {
      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      const existing = await masterProductCategory.findOne({
        where: { name: data.name },
      });
      if (existing) {
        return {
          status: false,
          message: "Category with this name already exists",
          data: null,
        };
      }

      const newCategory = await masterProductCategory.create({
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

  async update(id, data) {
    try {
      const category = await masterProductCategory.findByPk(id);
      if (!category) {
        return { status: false, message: "Category not found", data: null };
      }

      if (data.name && data.name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      if (data.name && data.name !== category.name) {
        const existing = await masterProductCategory.findOne({
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
};
