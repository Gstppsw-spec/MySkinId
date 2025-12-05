const { masterGroupProduct } = require("../models");

module.exports = {
  async getAll() {
    try {
      const group = await masterGroupProduct.findAll({
        // where: { isActive: true },
        order: [["name", "ASC"]],
      });
      return { status: true, message: "Success", data: group };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getById(id) {
    try {
      const group = await masterGroupProduct.findByPk(id);
      if (!group) {
        return { status: false, message: "Group not found", data: null };
      }
      return { status: true, message: "Success", data: group };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async create(data) {
    try {
      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      const existing = await masterGroupProduct.findOne({
        where: { name: data.name },
      });
      if (existing) {
        return {
          status: false,
          message: "Group with this name already exists",
          data: null,
        };
      }

      const newCategory = await masterGroupProduct.create({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });

      return {
        status: true,
        message: "Group created successfully",
        data: newCategory,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async update(id, data) {
    try {
      const group = await masterGroupProduct.findByPk(id);
      if (!group) {
        return { status: false, message: "Group not found", data: null };
      }

      if (data.name && data.name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      if (data.name && data.name !== group.name) {
        const existing = await masterGroupProduct.findOne({
          where: { name: data.name },
        });
        if (existing) {
          return {
            status: false,
            message: "Group with this name already exists",
            data: null,
          };
        }
      }

      group.name = data.name !== undefined ? data.name : group.name;
      group.description =
        data.description !== undefined ? data.description : group.description;
      group.isActive =
        data.isActive !== undefined ? data.isActive : group.isActive;

      await group.save();

      return {
        status: true,
        message: "Group updated successfully",
        data: group,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
