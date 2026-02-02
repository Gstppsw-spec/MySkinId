const {
  orderCartProduct,
  orderCartService,
  masterProduct,
  masterProductImage,
  masterService,
  masterLocation,
  customerCart,
  masterPackage,
  masterLocationImage,
} = require("../models");
const validateReference = require("../helpers/validateReference");

module.exports = {
  async getCustomerCart(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const customerCarts = await customerCart.findAll({
        where: { customerId },
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        include: [
          {
            model: masterProduct,
            as: "product",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterProductImage,
                as: "images",
                attributes: ["imageUrl"],
              },
            ],
          },
          {
            model: masterPackage,
            as: "package",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name"],
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                    separate: true,
                  },
                ],
              },
            ],
          },
          {
            model: masterService,
            as: "service",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name"],
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                    separate: true,
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!customerCarts) {
        return { status: false, message: "Product not found", data: null };
      }

      const result = {
        product: [],
        service: [],
        package: [],
      };

      customerCarts.forEach((cart) => {
        if (cart.product) result.product.push(cart.product);
        if (cart.service) result.service.push(cart.service);
        if (cart.package) result.package.push(cart.package);
      });

      return { status: true, message: "Berhasil", data: result };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async createCustomerCart(data) {
    try {
      const { refferenceId, customerId, refferenceType } = data;

      if (!refferenceId || !customerId || !refferenceType)
        return { status: false, message: "Data belum lengkap" };

      await validateReference(refferenceType, refferenceId);

      let cart = await customerCart.findOne({
        where: { refferenceId, customerId, refferenceType },
      });

      if (cart) {
        cart.qty += 1;
        await cart.save();

        return {
          status: true,
          message: "Qty berhasil ditambahkan",
          data: cart,
        };
      }

      const newCustomerCart = await customerCart.create({
        refferenceId,
        customerId,
        refferenceType,
        qty: 1,
      });

      return {
        status: true,
        message: "Berhasil menambahkan ke keranjang",
        data: newCustomerCart,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async deleteCustomerCart(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cart = await customerCart.findByPk(cartId);

      if (!cart) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      await cart.destroy();

      return {
        status: true,
        message: "Cart berhasil di hapus",
        data: cart,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async clearCartByRefferenceType(customerId, refferenceType) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      await customerCart.destroy({
        where: { customerId, refferenceType },
      });
      return { status: true, message: "Semua cart service berhasil dihapus" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async addQtyCustomerCart({ refferenceId, customerId }) {
    try {
      if (!refferenceId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      let cart = await customerCart.findOne({
        where: { refferenceId, customerId },
      });

      if (!cart) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      cart.qty += 1;
      await cart.save();

      return { status: true, message: "Berhasil menambahkan qty", data: cart };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async reduceQtyCustomerCart({ refferenceId, customerId }) {
    try {
      if (!refferenceId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      const cart = await customerCart.findOne({
        where: { refferenceId, customerId },
      });

      if (!cart) {
        return { status: false, message: "Cart service tidak ditemukan" };
      }

      cart.qty -= 1;

      if (cart.qty <= 0) {
        await cart.destroy();
        return { status: true, message: "Item dihapus karena qty habis" };
      }

      await cart.save();

      return { status: true, message: "Berhasil mengurangi qty", data: cart };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async selectCustomerCart(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cart = await customerCart.findByPk(cartId);

      if (!cart) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      if (cart.isSelected == false) {
        await cart.update({
          isSelected: true,
        });
        return {
          status: true,
          message: "Cart berhasil diupdate",
          data: cart,
        };
      }

      if (cart.isSelected == true) {
        await cart.update({
          isSelected: false,
        });
        return {
          status: true,
          message: "Cart berhasil diupdate",
          data: cart,
        };
      }
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async selectAllCustomerCartByRefferenceType(customerId, refferenceType) {
    try {
      if (!customerId || !refferenceType)
        return {
          status: false,
          message: "Customer dan type tidak boleh kosong",
        };

      const cart = await customerCart.findAll({
        where: { customerId, refferenceType },
      });

      if (!cart || cart.length === 0) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }
      const hasUnselected = cart.some((item) => !item.isSelected);
      const newSelectedValue = hasUnselected ? true : false;

      await customerCart.update(
        { isSelected: newSelectedValue },
        { where: { customerId, refferenceType } }
      );

      return {
        status: true,
        message: newSelectedValue
          ? "Semua cart product berhasil di-select"
          : "Semua cart product berhasil di-unselect",
        data: { isSelected: newSelectedValue },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
