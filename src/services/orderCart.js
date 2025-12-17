const {
  orderCartProduct,
  orderCartService,
  masterProduct,
  masterProductImage,
  masterService,
  masterLocation,
} = require("../models");

module.exports = {
  async getCartProduct(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const cartProduct = await orderCartProduct.findAll({
        where: { customerId },
        include: [
          {
            model: masterProduct,
            as: "product",
            include: [
              {
                model: masterProductImage,
                as: "images",
              },
            ],
          },
        ],
      });

      return { status: true, message: "Berhasil", data: cartProduct };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async createCartProduct(data) {
    try {
      const { productId, customerId } = data;

      if (!productId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      let cart = await orderCartProduct.findOne({
        where: { productId, customerId },
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

      const newCartProduct = await orderCartProduct.create({
        productId,
        customerId,
        qty: 1,
      });

      return { status: true, message: "Berhasil", data: newCartProduct };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async deleteCartProduct(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cartProduct = await orderCartProduct.findByPk(cartId);

      if (!cartProduct) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      await cartProduct.destroy();

      return {
        status: true,
        message: "Cart berhasil di hapus",
        data: cartProduct,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async clearCartProduct(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      await orderCartProduct.destroy({
        where: { customerId },
      });

      return { status: true, message: "Semua cart service berhasil dihapus" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async addQtyCartProduct({ productId, customerId }) {
    try {
      if (!productId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      let cart = await orderCartProduct.findOne({
        where: { productId, customerId },
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

  async reduceQtyCartProduct({ productId, customerId }) {
    try {
      if (!productId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      const cart = await orderCartProduct.findOne({
        where: { productId, customerId },
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

  async selectCartProduct(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cartProduct = await orderCartProduct.findByPk(cartId);

      if (!cartProduct) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      if (cartProduct.isSelected == false) {
        await cartProduct.update({
          isSelected: true,
        });
        return {
          status: true,
          message: "Cart berhasil diupdate",
          data: cartProduct,
        };
      }

      if (cartProduct.isSelected == true) {
        await cartProduct.update({
          isSelected: false,
        });
        return {
          status: true,
          message: "Cart berhasil diupdate",
          data: cartProduct,
        };
      }
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async selectAllCartProduct(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const cartProducts = await orderCartProduct.findAll({
        where: { customerId },
      });

      if (!cartProducts || cartProducts.length === 0) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }
      const hasUnselected = cartProducts.some((item) => !item.isSelected);
      const newSelectedValue = hasUnselected ? true : false;

      await orderCartProduct.update(
        { isSelected: newSelectedValue },
        { where: { customerId } }
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

  async getCartService(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const cartService = await orderCartService.findAll({
        where: { customerId },
        include: [
          {
            model: masterService,
            as: "service",
            include: [
              {
                model: masterLocation,
                as: "location",
              },
            ],
          },
        ],
      });

      return { status: true, message: "Berhasil", data: cartService };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async createCartService(data) {
    try {
      const { serviceId, customerId } = data;

      if (!serviceId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      let cart = await orderCartService.findOne({
        where: { serviceId, customerId },
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

      const newCartService = await orderCartService.create({
        serviceId,
        customerId,
        qty: 1,
      });

      return { status: true, message: "Berhasil", data: newCartService };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async deleteCartService(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cartService = await orderCartService.findByPk(cartId);

      if (!cartService) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      await cartService.destroy();

      return {
        status: true,
        message: "Cart berhasil di hapus",
        data: cartService,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async clearCartService(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      await orderCartService.destroy({
        where: { customerId },
      });

      return { status: true, message: "Semua cart service berhasil dihapus" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async addQtyCartService({ serviceId, customerId }) {
    try {
      if (!serviceId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      let cart = await orderCartService.findOne({
        where: { serviceId, customerId },
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

  async reduceQtyCartService({ serviceId, customerId }) {
    try {
      if (!serviceId || !customerId)
        return { status: false, message: "Data belum lengkap" };

      const cart = await orderCartService.findOne({
        where: { serviceId, customerId },
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

  async selectCartService(cartId) {
    try {
      if (!cartId)
        return { status: false, message: "Product tidak boleh kosong" };

      const cartService = await orderCartService.findByPk(cartId);

      if (!cartService) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }

      if (cartService.isSelected == false) {
        await cartService.update({
          isSelected: true,
        });
        return {
          status: true,
          message: "Cart berhasil di update",
          data: cartService,
        };
      }

      if (cartService.isSelected == true) {
        await cartService.update({
          isSelected: false,
        });
        return {
          status: true,
          message: "Cart berhasil di update",
          data: cartService,
        };
      }
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async selectAllCartService(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const cartServices = await orderCartService.findAll({
        where: { customerId },
      });

      if (!cartServices || cartServices.length === 0) {
        return { status: false, message: "Cart tidak ditemukan", data: null };
      }
      const hasUnselected = cartServices.some((item) => !item.isSelected);
      const newSelectedValue = hasUnselected ? true : false;

      await orderCartService.update(
        { isSelected: newSelectedValue },
        { where: { customerId } }
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
