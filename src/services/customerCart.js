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
              {
                model: masterLocation,
                as: "locations",
                attributes: ["id", "name", "address", "cityId", "districtId", "postalCode", "biteshipAreaId"],
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
                as: "locations",
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
            model: require("../models").flashSaleItem,
            as: "flashSaleItem",
            include: [{ model: require("../models").flashSale, as: "flashSale" }]
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
                as: "locations",
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
        package: [],
        service: [],
        totalItem: customerCarts.length,
      };

      customerCarts.forEach((cart) => {
        let isPromoActive = false;
        let promoError = null;
        let finalPrice = 0;

        if (cart.flashSaleItemId && cart.flashSaleItem) {
          const fsItem = cart.flashSaleItem;
          const fs = fsItem.flashSale;
          const now = new Date();

          if (fs && fs.status === "ACTIVE" && now >= fs.startDate && now <= fs.endDate && (fsItem.quota - fsItem.sold) > 0) {
            isPromoActive = true;
          } else {
            if (!fs || fs.status !== "ACTIVE") promoError = "Promo is no longer active";
            else if (now < fs.startDate) promoError = "Promo has not started";
            else if (now > fs.endDate) promoError = "Promo has ended";
            else if ((fsItem.quota - fsItem.sold) <= 0) promoError = "Promo quota is full";
          }
        }

        if (cart.product) {
          finalPrice = isPromoActive ? cart.flashSaleItem.flashPrice : cart.product.price;
          result.product.push({
            id: cart.product.id,
            name: cart.product.name,
            desc: cart.product.description,
            price: cart.product.price,
            flashPrice: isPromoActive ? cart.flashSaleItem.flashPrice : null,
            finalPrice: finalPrice,
            isPromoActive: isPromoActive,
            discountpercent: cart.product.discountPercent,
            images: cart.product.images,
            location: cart.product.locations?.[0] || null,
            isSelected: cart.isSelected,
            isDirect: cart.isDirect,
            isOnPayment: cart.isOnPayment,
            cartId: cart.id,
            quantity: cart.qty,
            weight: cart.product.weightGram,
            flashSaleItemId: cart.flashSaleItemId,
          });
        }
        if (cart.package) {
          finalPrice = isPromoActive ? cart.flashSaleItem.flashPrice : cart.package.price;
          result.package.push({
            id: cart.package.id,
            name: cart.package.name,
            desc: cart.package.description,
            price: cart.package.price,
            flashPrice: isPromoActive ? cart.flashSaleItem.flashPrice : null,
            finalPrice: finalPrice,
            isPromoActive: isPromoActive,
            discpercent: cart.package.discountPercent,
            location: cart.package.locations?.[0] || null,
            isSelected: cart.isSelected,
            isDirect: cart.isDirect,
            isOnPayment: cart.isOnPayment,
            cartId: cart.id,
            quantity: cart.qty,
            flashSaleItemId: cart.flashSaleItemId,
          });
        }
        if (cart.service) {
          finalPrice = isPromoActive ? cart.flashSaleItem.flashPrice : cart.service.price;
          result.service.push({
            id: cart.service.id,
            name: cart.service.name,
            desc: cart.service.description,
            price: cart.service.price,
            flashPrice: isPromoActive ? cart.flashSaleItem.flashPrice : null,
            finalPrice: finalPrice,
            isPromoActive: isPromoActive,
            discountpercent: cart.service.discountPercent,
            duration: cart.service.duration,
            location: cart.service.locations?.[0] || null,
            isSelected: cart.isSelected,
            isDirect: cart.isDirect,
            isOnPayment: cart.isOnPayment,
            cartId: cart.id,
            quantity: cart.qty,
            flashSaleItemId: cart.flashSaleItemId,
          });
        }
      });

      return { status: true, message: "Berhasil", data: result };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async createCustomerCart(data, customerId) {
    try {
      const { refferenceId, refferenceType, flashSaleItemId } = data;

      if (!refferenceId || !customerId || !refferenceType)
        return { status: false, message: "Data belum lengkap" };

      await validateReference(refferenceType, refferenceId);

      if (flashSaleItemId) {
        const fsItem = await require("../models").flashSaleItem.findByPk(flashSaleItemId);
        if (!fsItem) {
          return { status: false, message: "Flash sale item tidak ditemukan" };
        }
        
        const isMatch = refferenceType === "product" ? fsItem.productId === refferenceId : fsItem.packageId === refferenceId;
        if (!isMatch) {
          return { status: false, message: "Item flash sale tidak sesuai dengan produk/paket yang dipilih" };
        }
      }

      let cart = await customerCart.findOne({
        where: { refferenceId, customerId, refferenceType, flashSaleItemId: flashSaleItemId || null },
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
        flashSaleItemId: flashSaleItemId || null,
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

  async addQtyCustomerCart(refferenceId, customerId) {
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

  async reduceQtyCustomerCart(refferenceId, customerId) {
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
