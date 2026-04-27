const { Op } = require("sequelize");
const {
  order,
  transaction,
  transactionItem,
  transactionShipping,
  orderPayment,
  platformTransfer,
  customerCart,
  masterProduct,
  masterPackage,
  masterLocation,
  customerVoucher,
  masterCustomer,
  relationshipUserLocation,
  relationshipUserCompany,
  customerAddress,
  masterPaymentMethod,
  masterService,
  masterPackageItems,
  masterLocationImage,
  masterProductImage,
  flashSale,
  flashSaleItem,
  Rating,
  relationshipProductLocation,
  relationshipPackageLocation,
  relationshipServiceLocation,
  AdsConfig,
  AdsPurchase,
  masterUser,
  masterRole,
  sequelize,
  VoucherUsage,
} = require("../models");
const { nanoid } = require("nanoid");
const axios = require("axios");
const biteshipService = require("./biteship.service");
const socketInstance = require("../socket/socketInstance");
const {
  schedulePaymentTimeout,
  cancelPaymentTimeout,
} = require("../utils/paymentTimeout");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const pushNotificationService = require("./pushNotification.service");
const NotificationService = require("./notification.service");
const xenditPlatformService = require("./xenditPlatform.service");
const voucherService = require("./voucher.service");

const SERVICE_FEE = 4500;

module.exports = {
  async _getAdminLocationIds(adminId) {
    const user = await masterUser.findByPk(adminId, {
      include: [{ model: masterRole, as: "role" }],
    });

    if (!user) return [];

    const roleCode = user.role?.roleCode;

    // 0. Super Admin / Operational Admin -> ALL locations
    if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
      const allLocations = await masterLocation.findAll({
        attributes: ["id"],
        raw: true,
      });
      return allLocations.map((loc) => loc.id);
    }

    const locationIdSet = new Set();

    // 1. Check direct outlet assignment
    const userLocations = await relationshipUserLocation.findAll({
      where: { userId: adminId, isactive: true },
      attributes: ["locationId"],
      raw: true,
    });
    userLocations.forEach((ul) => locationIdSet.add(ul.locationId));

    // 2. Check company assignment
    const userCompanies = await relationshipUserCompany.findAll({
      where: { userId: adminId, isactive: true },
      attributes: ["companyId"],
      raw: true,
    });

    if (userCompanies.length > 0) {
      const companyIds = userCompanies.map((uc) => uc.companyId);
      const companyLocations = await masterLocation.findAll({
        where: { companyId: { [Op.in]: companyIds } },
        attributes: ["id"],
        raw: true,
      });
      companyLocations.forEach((loc) => locationIdSet.add(loc.id));
    }

    return Array.from(locationIdSet);
  },

  async _createXenditPayment(orderNumber, amount, customer, paymentMethodCode) {
    try {
      const secretKey = process.env.XENDIT_SECRET_KEY;
      const authHeader = Buffer.from(secretKey + ":").toString("base64");

      // Look up payment method in database
      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethodCode, isActive: true },
      });

      if (!methodRecord) {
        throw new Error(
          `Payment method ${paymentMethodCode} is not available or inactive.`,
        );
      }

      const paymentType = methodRecord.type;
      const formattedPhone = this._formatPhoneNumber(
        customer ? customer.phoneNumber : null,
      );

      if (paymentType === "VIRTUAL_ACCOUNT") {
        // Fixed Virtual Account
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 1); // 1 hour expiry

        const response = await axios.post(
          "https://api.xendit.co/callback_virtual_accounts",
          {
            external_id: orderNumber,
            bank_code: paymentMethodCode,
            name: customer
              ? customer.name || customer.username || "Customer MySkinId"
              : "Customer MySkinId",
            expected_amount: amount,
            is_closed: true,
            is_single_use: true,
            expiration_date: expirationDate.toISOString(),
          },
          { headers: { Authorization: `Basic ${authHeader}` } },
        );
        return {
          paymentType: "VIRTUAL_ACCOUNT",
          id: response.data.id,
          externalId: response.data.external_id,
          bankCode: response.data.bank_code,
          accountNumber: response.data.account_number,
          expectedAmount: response.data.expected_amount,
          expirationDate: response.data.expiration_date,
          expiresAt: response.data.expiration_date,
          instructions: this._getPaymentInstructions(
            "VIRTUAL_ACCOUNT",
            paymentMethodCode,
            { accountNumber: response.data.account_number },
          ),
          rawPayload: response.data,
        };
      } else if (paymentType === "EWALLET") {
        // E-Wallet Charge
        const response = await axios.post(
          "https://api.xendit.co/payment_requests",
          {
            reference_id: orderNumber,
            currency: "IDR",
            amount: amount,

            checkout_method: "ONE_TIME_PAYMENT",

            payment_method: {
              type: "EWALLET",
              reusability: "ONE_TIME_USE",
              ewallet: {
                channel_code: paymentMethodCode,

                channel_properties:
                  paymentMethodCode === "OVO"
                    ? { mobile_number: formattedPhone || "+6281234567890" }
                    : {
                      success_return_url: `${process.env.FRONTEND_URL || "myskinid://app"}/checkout/payment_success`,
                      failure_return_url: `${process.env.FRONTEND_URL || "myskinid://app"}/checkout/payment_failure`,
                      cancel_return_url: `${process.env.FRONTEND_URL || "myskinid://app"}/checkout/payment_cancel`,
                    },
              },
            },
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
            },
          },
        );

        let checkoutUrl = null;
        if (response.data.actions) {
          const appDeeplink = response.data.actions.find(
            (a) => a.url_type === "DEEPLINK" || a.url_type === "MOBILE",
          );
          const webLink = response.data.actions.find(
            (a) =>
              a.url_type === "DESKTOP_WEB" ||
              a.url_type === "MOBILE_WEB" ||
              a.url_type === "WEB",
          );
          checkoutUrl = appDeeplink
            ? appDeeplink.url
            : webLink
              ? webLink.url
              : null;
        }

        return {
          paymentType: "EWALLET",
          id: response.data.id,
          referenceId: response.data.reference_id,
          channelCode: response.data.channel_code,
          chargeAmount: response.data.charge_amount,
          checkoutUrl: checkoutUrl,
          instructions: this._getPaymentInstructions(
            "EWALLET",
            paymentMethodCode,
            { checkoutUrl },
          ),
          rawPayload: response.data,
        };
      } else if (paymentType === "QR_CODE") {
        // QR Code (QRIS)
        const response = await axios.post(
          "https://api.xendit.co/qr_codes",
          {
            external_id: orderNumber,
            type: "DYNAMIC",
            callback_url: `${process.env.BACKEND_URL || "https://api.myskin.blog"}/api/v2/transaction/order/callback/xendit`,
            amount: amount,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          { headers: { Authorization: `Basic ${authHeader}` } },
        );

        return {
          paymentType: "QR_CODE",
          id: response.data.id,
          externalId: response.data.external_id,
          qrString: response.data.qr_string,
          amount: response.data.amount,
          status: response.data.status,
          instructions: this._getPaymentInstructions(
            "QR_CODE",
            paymentMethodCode,
            response.data,
          ),
          rawPayload: response.data,
        };
      } else {
        // Fallback to Invoice for other types like RETAIL_OUTLET or unsupported types
        const response = await axios.post(
          "https://api.xendit.co/v2/invoices",
          {
            external_id: orderNumber,
            amount: amount,
            payer_email: customer ? customer.email : "customer@myskinid.com",
            description: `Payment for Order ${orderNumber}`,
            invoice_duration: 3600,
            currency: "IDR",
            payment_methods: [paymentMethodCode],
          },
          { headers: { Authorization: `Basic ${authHeader}` } },
        );
        return {
          paymentType: "INVOICE",
          id: response.data.id,
          externalId: response.data.external_id,
          invoiceUrl: response.data.invoice_url,
          expiryDate: response.data.expiry_date,
          instructions: this._getPaymentInstructions(
            "INVOICE",
            paymentMethodCode,
            response.data,
          ),
          rawPayload: response.data,
        };
      }
    } catch (error) {
      const detail = error.response
        ? JSON.stringify(error.response.data)
        : error.message;
      console.error("Xendit Native API Error:", detail);
      throw new Error(
        `Failed to create Native Payment for ${paymentMethodCode}: ${detail}`,
      );
    }
  },

  _formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    }
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  },

  _getPaymentInstructions(paymentType, paymentMethodCode, data) {
    if (paymentType === "VIRTUAL_ACCOUNT") {
      return [
        `Buka aplikasi ${paymentMethodCode} atau Internet Banking Anda`,
        `Pilih menu Transfer atau Pembayaran Virtual Account`,
        `Masukkan Nomor Virtual Account: ${data.accountNumber}`,
        `Pastikan nominal sesuai dan konfirmasi pembayaran`,
      ];
    } else if (paymentType === "EWALLET") {
      if (paymentMethodCode === "OVO") {
        return [
          "Buka aplikasi OVO di handphone Anda",
          "Cek notifikasi atau halaman utama aplikasi OVO",
          "Klik bayar pada tagihan dari MySkinId",
          "Selesaikan pembayaran dalam waktu 30 detik untuk menghindari expire",
        ];
      } else {
        return [
          "Buka link pembayaran yang tersedia (Checkout URL)",
          "Anda akan diarahkan otomatis ke aplikasi atau halaman pembayaran",
          "Selesaikan pembayaran sesuai instruksi di aplikasi tersebut",
          "Pastikan saldo Anda cukup sebelum melakukan pembayaran",
        ];
      }
    } else if (paymentType === "QR_CODE") {
      return [
        "Scan kode QR yang muncul menggunakan aplikasi (Gopay, OVO, Dana, atau Mobile Banking)",
        "Pastikan nominal pembayaran sudah sesuai",
        "Klik bayar dan masukkan PIN Anda",
        "Jangan tutup halaman ini sampai pembayaran berhasil dikonfirmasi",
      ];
    }
    return [
      "Buka link invoice yang tersedia",
      "Pilih metode pembayaran yang diinginkan",
      "Ikuti instruksi sesuai metode yang dipilih",
      "Bayar sebelum batas waktu berakhir",
    ];
  },

  async getAvailablePaymentMethods() {
    try {
      const methods = await masterPaymentMethod.findAll({
        // where: { isActive: true },
        attributes: ["code", "name", "type", "logoUrl", "id", "isActive"],
        order: [
          ["type", "ASC"],
          ["name", "ASC"],
        ],
      });

      // Group by type
      const grouped = methods.reduce((acc, method) => {
        const type = method.type;
        if (!acc[type]) {
          acc[type] = {
            type: type,
            channels: [],
          };
        }
        acc[type].channels.push({
          name: method.name,
          code: method.code,
          logoUrl: method.logoUrl,
          isActive: method.isActive,
          id: method.id,
        });
        return acc;
      }, {});

      const data = Object.values(grouped);

      return {
        status: true,
        message: "Available payment methods fetched",
        data,
      };
    } catch (error) {
      console.error("Fetch Payment Methods Error:", error.message);
      return { status: false, message: error.message };
    }
  },

  async checkoutFromCart(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const { paymentMethod, shippingOptions, voucherCode, voucherCodes } = data;
      const codesToApply = Array.isArray(voucherCodes) ? voucherCodes : (voucherCode ? [voucherCode] : []);

      const selectedCartItems = await customerCart.findAll({
        where: { customerId, isSelected: true },
        include: [
          { model: masterProduct, as: "product" },
          { model: masterPackage, as: "package" },
          { model: masterService, as: "service" },
        ],
      });

      if (selectedCartItems.length === 0) {
        throw new Error("No items selected in cart");
      }

      const itemsByLocation = {};
      let totalOrderAmount = 0;

      for (const item of selectedCartItems) {
        let actualItem, type;
        if (item.product) {
          actualItem = item.product;
          type = "product";
        } else if (item.package) {
          actualItem = item.package;
          type = "package";
        } else if (item.service) {
          actualItem = item.service;
          type = "service";
        }

        if (!actualItem) {
          throw new Error("Item not found");
        }

        // Resolve locationId: get first active location from pivot table
        const pivotModel =
          type === "product"
            ? relationshipProductLocation
            : type === "service"
              ? relationshipServiceLocation
              : relationshipPackageLocation;
        const fkField =
          type === "product"
            ? "productId"
            : type === "service"
              ? "serviceId"
              : "packageId";
        const firstPivot = await pivotModel.findOne({
          where: { [fkField]: actualItem.id, isActive: true },
          include: [{ model: masterLocation, as: "location", attributes: ["id", "companyId"] }],
        });
        if (!firstPivot || !firstPivot.location) {
          throw new Error(
            `${actualItem.name} tidak tersedia di lokasi manapun`,
          );
        }
        const locationId = firstPivot.locationId;
        const companyId = firstPivot.location.companyId;
        if (!itemsByLocation[locationId]) {
          itemsByLocation[locationId] = [];
        }

        let unitPrice = parseFloat(actualItem.price);
        let discountAmount = 0;
        let flashSaleItemId = item.flashSaleItemId;

        // 🔹 Flash Sale Logic
        if (flashSaleItemId) {
          const fsItem = await flashSaleItem.findOne({
            where: { id: flashSaleItemId },
            include: [{ model: flashSale, as: "flashSale" }],
          });

          if (!fsItem) throw new Error("Flash sale item not found");
          if (fsItem.flashSale.status !== "ACTIVE") {
            flashSaleItemId = null;
          }

          const now = new Date();
          if (
            now < fsItem.flashSale.startDate ||
            now > fsItem.flashSale.endDate
          ) {
            flashSaleItemId = null;
          }

          if (flashSaleItemId && fsItem.quota - fsItem.sold < item.qty) {
            flashSaleItemId = null;
          }

          if (flashSaleItemId) {
            unitPrice = parseFloat(fsItem.flashPrice);
            discountAmount = 0;
          } else {
            const discountPercent = parseFloat(actualItem.discountPercent || 0);
            discountAmount = (unitPrice * discountPercent) / 100;
          }
        } else {
          const discountPercent = parseFloat(actualItem.discountPercent || 0);
          discountAmount = (unitPrice * discountPercent) / 100;
        }
        // (Closing brace for 'if (flashSaleItemId)' logic is already there in the structure)

        const totalPrice = (unitPrice - discountAmount) * item.qty;
        const unitWeight = actualItem.weightGram || 0;
        const totalWeight = unitWeight * item.qty;

        itemsByLocation[locationId].push({
          id: item.id, // Cart Item ID
          itemType: type,
          itemId: actualItem.id,
          itemName: actualItem.name,
          companyId: companyId,
          quantity: item.qty,
          unitPrice: unitPrice,
          discountAmount: discountAmount * item.qty,
          totalPrice: totalPrice,
          weight: unitWeight,
          totalWeight: totalWeight,
          isShippingRequired: type === "product",
          referenceType: type,
          locationId: locationId,
          flashSaleItemId: flashSaleItemId,
        });

        totalOrderAmount += totalPrice;
      }

      // Calculate Shipping Fees and determine definitive totalOrderAmount
      const calculatedShipping = {};
      for (const locationId in itemsByLocation) {
        const items = itemsByLocation[locationId];
        const shippingOpt = shippingOptions
          ? shippingOptions.find((opt) => opt.locationId === locationId)
          : null;

        const location = await masterLocation.findByPk(locationId);
        if (!location) throw new Error(`Location ${locationId} not found`);

        let shippingFee = 0;
        let destinationId = null;
        let finalReceiverName = null;
        let finalReceiverPhone = null;
        let finalAddress = null;

        let resolvedOriginAreaId = null;
        let resolvedDestinationAreaId = null;

        if (shippingOpt) {
          if (shippingOpt.addressId) {
            const custAddr = await customerAddress.findOne({
              where: { id: shippingOpt.addressId, customerId },
            });
            if (!custAddr) throw new Error(`Customer address not found`);

            destinationId = custAddr.districtId || custAddr.cityId;
            finalReceiverName = custAddr.receiverName;
            finalReceiverPhone = custAddr.receiverPhone;
            finalAddress =
              `${custAddr.address}, ${custAddr.district}, ${custAddr.city}, ${custAddr.province} ${custAddr.postalCode || ""}`.trim();
          } else {
            destinationId =
              shippingOpt.destinationDistrictId || shippingOpt.destinationId;
            finalReceiverName = shippingOpt.receiverName;
            finalReceiverPhone = shippingOpt.receiverPhone;
            finalAddress = shippingOpt.address;
          }

          // Validation & Calculation with Biteship
          if (items.some((i) => i.isShippingRequired)) {
            const totalWeight = items.reduce(
              (sum, i) => sum + (i.totalWeight || 0),
              0,
            );
            const totalValue = items.reduce(
              (sum, i) => sum + (i.totalPrice || 0),
              0,
            );

            // Build origin params from location data
            // Include BOTH area_id AND coordinates when available
            // so getRates can split instant vs standard couriers
            const originParams = {};
            if (shippingOpt.origin_area_id) {
              originParams.origin_area_id = shippingOpt.origin_area_id;
            } else if (location.biteshipAreaId) {
              originParams.origin_area_id = location.biteshipAreaId;
            }
            if (location.latitude && location.longitude) {
              originParams.origin_latitude = parseFloat(location.latitude);
              originParams.origin_longitude = parseFloat(location.longitude);
            }
            if (
              !originParams.origin_area_id &&
              !originParams.origin_latitude &&
              location.postalCode
            ) {
              originParams.origin_postal_code = location.postalCode;
            }

            // Build destination params from shipping options or customer address
            // Include BOTH area_id AND coordinates when available
            const destParams = {};
            // Resolve custAddr for destination if addressId is provided
            let resolvedCustAddr = null;
            if (shippingOpt.addressId) {
              resolvedCustAddr = await customerAddress.findOne({
                where: { id: shippingOpt.addressId, customerId },
              });
            }

            // Area ID
            if (shippingOpt.destination_area_id) {
              destParams.destination_area_id = shippingOpt.destination_area_id;
            } else if (resolvedCustAddr && resolvedCustAddr.biteshipAreaId) {
              destParams.destination_area_id = resolvedCustAddr.biteshipAreaId;
            }
            // Coordinates
            if (
              shippingOpt.destination_latitude &&
              shippingOpt.destination_longitude
            ) {
              destParams.destination_latitude = parseFloat(
                shippingOpt.destination_latitude,
              );
              destParams.destination_longitude = parseFloat(
                shippingOpt.destination_longitude,
              );
            } else if (
              resolvedCustAddr &&
              resolvedCustAddr.latitude &&
              resolvedCustAddr.longitude
            ) {
              destParams.destination_latitude = parseFloat(
                resolvedCustAddr.latitude,
              );
              destParams.destination_longitude = parseFloat(
                resolvedCustAddr.longitude,
              );
            }
            // Postal code fallback
            if (
              !destParams.destination_area_id &&
              !destParams.destination_latitude
            ) {
              if (shippingOpt.destination_postal_code) {
                destParams.destination_postal_code =
                  shippingOpt.destination_postal_code;
              } else if (resolvedCustAddr && resolvedCustAddr.postalCode) {
                destParams.destination_postal_code =
                  resolvedCustAddr.postalCode;
              }
            }

            if (Object.keys(originParams).length === 0)
              throw new Error(`Origin location data is missing for shipping`);
            if (Object.keys(destParams).length === 0)
              throw new Error(
                `Destination location data is missing for shipping`,
              );

            resolvedOriginAreaId = originParams.origin_area_id;
            resolvedDestinationAreaId = destParams.destination_area_id;

            console.log(
              `Biteship DEBUG (${shippingOpt.courierCode}):`,
              JSON.stringify({
                ...originParams,
                ...destParams,
                weight: totalWeight,
              }),
            );

            const ratesResponse = await biteshipService.getRates({
              ...originParams,
              ...destParams,
              couriers: shippingOpt.courierCode,
              items: [
                {
                  name: "Order Items",
                  value: totalValue,
                  weight: totalWeight,
                  quantity: 1,
                },
              ],
            });

            console.log(
              "Biteship RAW Response:",
              JSON.stringify(ratesResponse),
            );

            const pricing = ratesResponse.pricing || [];
            const serviceRate = pricing.find(
              (p) =>
                p.courier_code === shippingOpt.courierCode &&
                p.courier_service_code &&
                p.courier_service_code.toUpperCase() ===
                shippingOpt.courierService.toUpperCase(),
            );

            if (!serviceRate) {
              console.error(
                "Service Rate Not Found. Available services:",
                pricing
                  .map((p) => `${p.courier_code}:${p.courier_service_code}`)
                  .join(", "),
              );
              throw new Error(
                `Service ${shippingOpt.courierService} not available for ${shippingOpt.courierCode}`,
              );
            }

            shippingFee = serviceRate.price || 0;
          }
        }

        calculatedShipping[locationId] = {
          shippingFee,
          destinationId,
          finalReceiverName,
          finalReceiverPhone,
          finalAddress,
          location,
          shippingOpt,
          originAreaId: resolvedOriginAreaId,
          destinationAreaId: resolvedDestinationAreaId,
        };

        totalOrderAmount += shippingFee;
      }

      totalOrderAmount += SERVICE_FEE;

      // 🔹 Multiple Voucher Discount Logic
      let totalVoucherDiscount = 0;
      const vouchersToApply = [];

      if (codesToApply.length > 0) {
        // Build flat cart items array for validation
        const allCartItems = [];
        for (const locId in itemsByLocation) {
          for (const item of itemsByLocation[locId]) {
            allCartItems.push(item);
          }
        }

        for (const vData of codesToApply) {
          const vCode = typeof vData === "object" ? vData.code : vData;
          const targetItemId = typeof vData === "object" ? vData.itemId : null;

          const voucherValidation = await voucherService.validateVoucher(
            vCode,
            customerId,
            allCartItems,
            targetItemId
          );

          if (!voucherValidation.status) {
            throw new Error(`Voucher error (${vCode}): ${voucherValidation.message}`);
          }

          const discountForThisVoucher = voucherValidation.data.discountAmount;
          totalVoucherDiscount += discountForThisVoucher;
          vouchersToApply.push({
            code: vCode.toUpperCase(),
            amount: discountForThisVoucher,
          });
        }

        totalOrderAmount -= totalVoucherDiscount;
        if (totalOrderAmount < 0) totalOrderAmount = 0;
      }

      const newOrder = await order.create(
        {
          orderNumber: `ORD-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalOrderAmount,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      // 🔹 Apply voucher usage (record it, increment usedCount)
      for (const v of vouchersToApply) {
        if (v.amount > 0) {
          const applyResult = await voucherService.applyVoucher(
            v.code,
            customerId,
            newOrder.id,
            v.amount,
            t
          );
          if (!applyResult.status) {
            throw new Error(`Failed to apply voucher ${v.code}: ${applyResult.message}`);
          }
        }
      }

      for (const locationId in itemsByLocation) {
        const items = itemsByLocation[locationId];
        const calcInfo = calculatedShipping[locationId];
        const subTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
        const grandTotal = subTotal + calcInfo.shippingFee;

        const newTransaction = await transaction.create(
          {
            orderId: newOrder.id,
            transactionNumber: `TRX-${nanoid(10).toUpperCase()}`,
            locationId: locationId,
            subTotal: subTotal,
            shippingFee: calcInfo.shippingFee,
            grandTotal: grandTotal,
            orderStatus: "CREATED",
          },
          { transaction: t },
        );

        for (const i of items) {
          let voucherCode = null;
          if (i.itemType === "package" || i.itemType === "service") {
            voucherCode = nanoid(8).toUpperCase();
          }

          const newTrxItem = await transactionItem.create(
            {
              transactionId: newTransaction.id,
              ...i,
              voucherCode: voucherCode,
            },
            { transaction: t },
          );

          if (voucherCode) {
            await customerVoucher.create(
              {
                customerId: customerId,
                referenceId: i.itemId,
                referenceType: i.itemType,
                transactionItemId: newTrxItem.id,
                voucherCode: voucherCode,
                status: "NOT_ACTIVE",
              },
              { transaction: t },
            );
          }
        }

        if (calcInfo.shippingOpt) {
          await transactionShipping.create(
            {
              transactionId: newTransaction.id,
              receiverName: calcInfo.finalReceiverName,
              receiverPhone: calcInfo.finalReceiverPhone,
              address: calcInfo.finalAddress,
              originCityId: calcInfo.location
                ? calcInfo.location.districtId || calcInfo.location.cityId || 0
                : 0,
              destinationCityId: calcInfo.destinationId,
              totalWeight: items.reduce(
                (sum, i) => sum + (i.totalWeight || 0),
                0,
              ),
              courierCode: calcInfo.shippingOpt.courierCode,
              courierService: calcInfo.shippingOpt.courierService,
              shippingCost: calcInfo.shippingFee,
              originAreaId: calcInfo.originAreaId,
              destinationAreaId: calcInfo.destinationAreaId,
            },
            { transaction: t },
          );
        }
      }

      // Create Native Payment
      const customer = await masterCustomer.findByPk(customerId);
      if (!paymentMethod) {
        await t.rollback();
        return { status: false, message: "Payment method is required" };
      }

      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord) {
        await t.rollback();
        return {
          status: false,
          message: `Payment method ${paymentMethod} not found or inactive`,
        };
      }

      const gateway = methodRecord.gateway || "xendit";
      let gatewayPayment;

      if (gateway === "yokke") {
        let allItems = [];
        for (const locId in itemsByLocation) {
          allItems = allItems.concat(itemsByLocation[locId]);
        }
        const actualItemsTotal = allItems.reduce(
          (acc, i) => acc + (i.totalPrice || 0),
          0,
        );
        if (totalOrderAmount > actualItemsTotal) {
          allItems.push({
            name: "Shipping Fee",
            quantity: 1,
            amount: totalOrderAmount - actualItemsTotal,
          });
        }

        gatewayPayment = await this._createYokkePayment(
          newOrder.orderNumber,
          totalOrderAmount,
          customer,
          paymentMethod,
          allItems,
        );
      } else {
        gatewayPayment = await this._createXenditPayment(
          newOrder.orderNumber,
          totalOrderAmount,
          customer,
          paymentMethod,
        );
      }

      // Create Payment Record
      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalOrderAmount,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await customerCart.destroy({
        where: { customerId, isSelected: true },
        transaction: t,
      });

      await t.commit();

      // Schedule auto-expiry after 10 minutes if unpaid
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Checkout successful",
        data: {
          ...newOrder.toJSON(),
          serviceFee: SERVICE_FEE,
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async directCheckout(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const { items, paymentMethod, shippingOptions, voucherCode, voucherCodes } = data;
      const codesToApply = Array.isArray(voucherCodes) ? voucherCodes : (voucherCode ? [voucherCode] : []);

      if (!items || items.length === 0) {
        throw new Error("No items provided for checkout");
      }

      let totalOrderAmount = 0;
      const itemsByLocation = {};

      for (const item of items) {
        let actualItem;
        if (item.type === "product") {
          actualItem = await masterProduct.findByPk(item.id);
        } else if (item.type === "package") {
          actualItem = await masterPackage.findByPk(item.id);
        } else if (item.type === "service") {
          actualItem = await masterService.findByPk(item.id);
        }

        if (!actualItem) {
          throw new Error("Item not found");
        }

        // locationId from client request, with pivot validation
        const locationId = item.locationId;
        if (!locationId) {
          throw new Error(
            "locationId is required for each item in direct checkout",
          );
        }
        const pivotModel =
          item.type === "product"
            ? relationshipProductLocation
            : item.type === "service"
              ? relationshipServiceLocation
              : relationshipPackageLocation;
        const fkField =
          item.type === "product"
            ? "productId"
            : item.type === "service"
              ? "serviceId"
              : "packageId";
        const pivotRow = await pivotModel.findOne({
          where: { [fkField]: actualItem.id, locationId, isActive: true },
          include: [{ model: masterLocation, as: "location", attributes: ["id", "companyId"] }],
        });
        if (!pivotRow || !pivotRow.location) {
          throw new Error(
            `${actualItem.name} tidak tersedia di lokasi yang dipilih`,
          );
        }
        const companyId = pivotRow.location.companyId;
        if (!itemsByLocation[locationId]) {
          itemsByLocation[locationId] = [];
        }

        let unitPrice = parseFloat(actualItem.price);
        let discountAmount = 0;
        let flashSaleItemId = item.flashSaleItemId;

        // 🔹 Flash Sale Logic
        if (flashSaleItemId) {
          const fsItem = await flashSaleItem.findOne({
            where: { id: flashSaleItemId },
            include: [{ model: flashSale, as: "flashSale" }],
          });

          if (!fsItem) throw new Error("Flash sale item not found");
          if (fsItem.flashSale.status !== "ACTIVE") {
            flashSaleItemId = null;
          }

          const now = new Date();
          if (
            now < fsItem.flashSale.startDate ||
            now > fsItem.flashSale.endDate
          ) {
            flashSaleItemId = null;
          }

          if (flashSaleItemId && fsItem.quota - fsItem.sold < item.qty) {
            flashSaleItemId = null;
          }

          if (flashSaleItemId) {
            unitPrice = parseFloat(fsItem.flashPrice);
            discountAmount = 0;
          } else {
            const discountPercent = parseFloat(actualItem.discountPercent || 0);
            discountAmount = (unitPrice * discountPercent) / 100;
          }
        } else {
          const discountPercent = parseFloat(actualItem.discountPercent || 0);
          discountAmount = (unitPrice * discountPercent) / 100;
        }

        const totalPrice = (unitPrice - discountAmount) * item.qty;
        const unitWeight = actualItem.weightGram || 0;
        const totalWeight = unitWeight * item.qty;

        itemsByLocation[locationId].push({
          id: item.id, // Provided ID (Product ID in direct checkout)
          itemType: item.type,
          itemId: actualItem.id,
          itemName: actualItem.name,
          companyId: companyId,
          quantity: item.qty,
          unitPrice: unitPrice,
          discountAmount: discountAmount * item.qty,
          totalPrice: totalPrice,
          weight: unitWeight,
          totalWeight: totalWeight,
          isShippingRequired: item.type === "product",
          locationId: locationId,
          flashSaleItemId: flashSaleItemId,
        });

        totalOrderAmount += totalPrice;
      }

      // Calculate Shipping Fees and determine definitive totalOrderAmount
      const calculatedShipping = {};
      for (const locationId in itemsByLocation) {
        const items = itemsByLocation[locationId];
        const shippingOpt = shippingOptions
          ? shippingOptions.find((opt) => opt.locationId === locationId)
          : null;

        const location = await masterLocation.findByPk(locationId);
        if (!location) throw new Error(`Location ${locationId} not found`);

        let shippingFee = 0;
        let destinationId = null;
        let finalReceiverName = null;
        let finalReceiverPhone = null;
        let finalAddress = null;

        let resolvedOriginAreaId = null;
        let resolvedDestinationAreaId = null;

        if (shippingOpt) {
          if (shippingOpt.addressId) {
            const custAddr = await customerAddress.findOne({
              where: { id: shippingOpt.addressId, customerId },
            });
            if (!custAddr) throw new Error(`Customer address not found`);

            destinationId = custAddr.districtId || custAddr.cityId;
            finalReceiverName = custAddr.receiverName;
            finalReceiverPhone = custAddr.receiverPhone;
            finalAddress =
              `${custAddr.address}, ${custAddr.district}, ${custAddr.city}, ${custAddr.province} ${custAddr.postalCode || ""}`.trim();
          } else {
            destinationId =
              shippingOpt.destinationDistrictId || shippingOpt.destinationId;
            finalReceiverName = shippingOpt.receiverName;
            finalReceiverPhone = shippingOpt.receiverPhone;
            finalAddress = shippingOpt.address;
          }

          // Validation & Calculation with Biteship
          if (items.some((i) => i.isShippingRequired)) {
            const totalWeight = items.reduce(
              (sum, i) => sum + (i.totalWeight || 0),
              0,
            );
            const totalValue = items.reduce(
              (sum, i) => sum + (i.totalPrice || 0),
              0,
            );

            // Build origin params from location data
            // Include BOTH area_id AND coordinates when available
            // so getRates can split instant vs standard couriers
            const originParams = {};
            if (shippingOpt.origin_area_id) {
              originParams.origin_area_id = shippingOpt.origin_area_id;
            } else if (location.biteshipAreaId) {
              originParams.origin_area_id = location.biteshipAreaId;
            }
            if (location.latitude && location.longitude) {
              originParams.origin_latitude = parseFloat(location.latitude);
              originParams.origin_longitude = parseFloat(location.longitude);
            }
            if (
              !originParams.origin_area_id &&
              !originParams.origin_latitude &&
              location.postalCode
            ) {
              originParams.origin_postal_code = location.postalCode;
            }

            // Build destination params from shipping options or customer address
            // Include BOTH area_id AND coordinates when available
            const destParams = {};
            // Resolve custAddr for destination if addressId is provided
            let resolvedCustAddr = null;
            if (shippingOpt.addressId) {
              resolvedCustAddr = await customerAddress.findOne({
                where: { id: shippingOpt.addressId, customerId },
              });
            }

            // Area ID
            if (shippingOpt.destination_area_id) {
              destParams.destination_area_id = shippingOpt.destination_area_id;
            } else if (resolvedCustAddr && resolvedCustAddr.biteshipAreaId) {
              destParams.destination_area_id = resolvedCustAddr.biteshipAreaId;
            }
            // Coordinates
            if (
              shippingOpt.destination_latitude &&
              shippingOpt.destination_longitude
            ) {
              destParams.destination_latitude = parseFloat(
                shippingOpt.destination_latitude,
              );
              destParams.destination_longitude = parseFloat(
                shippingOpt.destination_longitude,
              );
            } else if (
              resolvedCustAddr &&
              resolvedCustAddr.latitude &&
              resolvedCustAddr.longitude
            ) {
              destParams.destination_latitude = parseFloat(
                resolvedCustAddr.latitude,
              );
              destParams.destination_longitude = parseFloat(
                resolvedCustAddr.longitude,
              );
            }
            // Postal code fallback
            if (
              !destParams.destination_area_id &&
              !destParams.destination_latitude
            ) {
              if (shippingOpt.destination_postal_code) {
                destParams.destination_postal_code =
                  shippingOpt.destination_postal_code;
              } else if (resolvedCustAddr && resolvedCustAddr.postalCode) {
                destParams.destination_postal_code =
                  resolvedCustAddr.postalCode;
              }
            }

            if (Object.keys(originParams).length === 0)
              throw new Error(`Origin location data is missing for shipping`);
            if (Object.keys(destParams).length === 0)
              throw new Error(
                `Destination location data is missing for shipping`,
              );

            resolvedOriginAreaId = originParams.origin_area_id;
            resolvedDestinationAreaId = destParams.destination_area_id;

            console.log(
              `Biteship DEBUG (${shippingOpt.courierCode}):`,
              JSON.stringify({
                ...originParams,
                ...destParams,
                weight: totalWeight,
              }),
            );

            const ratesResponse = await biteshipService.getRates({
              ...originParams,
              ...destParams,
              couriers: shippingOpt.courierCode,
              items: [
                {
                  name: "Order Items",
                  value: totalValue,
                  weight: totalWeight,
                  quantity: 1,
                },
              ],
            });

            console.log(
              "Biteship RAW Response:",
              JSON.stringify(ratesResponse),
            );

            const pricing = ratesResponse.pricing || [];
            const serviceRate = pricing.find(
              (p) =>
                p.courier_code === shippingOpt.courierCode &&
                p.courier_service_code &&
                p.courier_service_code.toUpperCase() ===
                shippingOpt.courierService.toUpperCase(),
            );

            if (!serviceRate) {
              console.error(
                "Service Rate Not Found. Available services:",
                pricing
                  .map((p) => `${p.courier_code}:${p.courier_service_code}`)
                  .join(", "),
              );
              throw new Error(
                `Service ${shippingOpt.courierService} not available for ${shippingOpt.courierCode}`,
              );
            }

            shippingFee = serviceRate.price || 0;
          }
        }

        calculatedShipping[locationId] = {
          shippingFee,
          destinationId,
          finalReceiverName,
          finalReceiverPhone,
          finalAddress,
          location,
          shippingOpt,
          originAreaId: resolvedOriginAreaId,
          destinationAreaId: resolvedDestinationAreaId,
        };

        totalOrderAmount += shippingFee;
      }

      totalOrderAmount += SERVICE_FEE;

      // 🔹 Multiple Voucher Discount Logic
      let totalVoucherDiscount = 0;
      const vouchersToApply = [];

      if (codesToApply.length > 0) {
        const allCartItems = [];
        for (const locId in itemsByLocation) {
          for (const item of itemsByLocation[locId]) {
            allCartItems.push(item);
          }
        }

        for (const vData of codesToApply) {
          const vCode = typeof vData === "object" ? vData.code : vData;
          const targetItemId = typeof vData === "object" ? vData.itemId : null;

          const voucherValidation = await voucherService.validateVoucher(
            vCode,
            customerId,
            allCartItems,
            targetItemId
          );

          if (!voucherValidation.status) {
            throw new Error(`Voucher error (${vCode}): ${voucherValidation.message}`);
          }

          const discountForThisVoucher = voucherValidation.data.discountAmount;
          totalVoucherDiscount += discountForThisVoucher;
          vouchersToApply.push({
            code: vCode.toUpperCase(),
            amount: discountForThisVoucher,
          });
        }

        totalOrderAmount -= totalVoucherDiscount;
        if (totalOrderAmount < 0) totalOrderAmount = 0;
      }

      const newOrder = await order.create(
        {
          orderNumber: `ORD-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalOrderAmount,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      // 🔹 Apply voucher usage
      for (const v of vouchersToApply) {
        if (v.amount > 0) {
          const applyResult = await voucherService.applyVoucher(
            v.code,
            customerId,
            newOrder.id,
            v.amount,
            t
          );
          if (!applyResult.status) {
            throw new Error(`Failed to apply voucher ${v.code}: ${applyResult.message}`);
          }
        }
      }

      for (const locationId in itemsByLocation) {
        const items = itemsByLocation[locationId];
        const calcInfo = calculatedShipping[locationId];
        const subTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
        const grandTotal = subTotal + calcInfo.shippingFee;

        const newTransaction = await transaction.create(
          {
            orderId: newOrder.id,
            transactionNumber: `TRX-${nanoid(10).toUpperCase()}`,
            locationId: locationId,
            subTotal: subTotal,
            shippingFee: calcInfo.shippingFee,
            grandTotal: grandTotal,
            orderStatus: "CREATED",
          },
          { transaction: t },
        );

        for (const i of items) {
          let voucherCode = null;
          if (i.itemType === "package" || i.itemType === "service") {
            voucherCode = nanoid(8).toUpperCase();
          }

          const newTrxItem = await transactionItem.create(
            {
              transactionId: newTransaction.id,
              ...i,
              voucherCode: voucherCode,
            },
            { transaction: t },
          );

          if (voucherCode) {
            await customerVoucher.create(
              {
                customerId: customerId,
                referenceId: i.itemId,
                referenceType: i.itemType,
                transactionItemId: newTrxItem.id,
                voucherCode: voucherCode,
                status: "NOT_ACTIVE",
              },
              { transaction: t },
            );
          }
        }

        if (calcInfo.shippingOpt) {
          await transactionShipping.create(
            {
              transactionId: newTransaction.id,
              receiverName: calcInfo.finalReceiverName,
              receiverPhone: calcInfo.finalReceiverPhone,
              address: calcInfo.finalAddress,
              originCityId: calcInfo.location
                ? calcInfo.location.districtId || calcInfo.location.cityId || 0
                : 0,
              destinationCityId: calcInfo.destinationId,
              totalWeight: items.reduce(
                (sum, i) => sum + (i.totalWeight || 0),
                0,
              ),
              courierCode: calcInfo.shippingOpt.courierCode,
              courierService: calcInfo.shippingOpt.courierService,
              shippingCost: calcInfo.shippingFee,
              originAreaId: calcInfo.originAreaId,
              destinationAreaId: calcInfo.destinationAreaId,
            },
            { transaction: t },
          );
        }
      }

      // Create Native Payment
      const customer = await masterCustomer.findByPk(customerId);
      if (!paymentMethod) {
        await t.rollback();
        return { status: false, message: "Payment method is required" };
      }

      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord) {
        await t.rollback();
        return {
          status: false,
          message: `Payment method ${paymentMethod} not found or inactive`,
        };
      }

      const gatewayPayment = await this._createXenditPayment(
        newOrder.orderNumber,
        totalOrderAmount,
        customer,
        paymentMethod,
      );

      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalOrderAmount,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await t.commit();

      // Schedule auto-expiry after 10 minutes if unpaid
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Direct checkout successful",
        data: {
          ...newOrder.toJSON(),
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async buyPremiumBadge(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const { locationId, paymentMethod } = data;

      if (!locationId) throw new Error("Location ID is required");
      if (!paymentMethod) throw new Error("Payment method is required");

      const location = await masterLocation.findByPk(locationId);
      if (!location) throw new Error("Location not found");

      const price = 100000; // 100,000 IDR as planned
      const totalOrderAmount = price;

      const newOrder = await order.create(
        {
          orderNumber: `ORD-PREM-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalOrderAmount,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      const newTransaction = await transaction.create(
        {
          orderId: newOrder.id,
          transactionNumber: `TRX-PREM-${nanoid(10).toUpperCase()}`,
          locationId: locationId,
          subTotal: price,
          shippingFee: 0,
          grandTotal: price,
          orderStatus: "CREATED",
        },
        { transaction: t },
      );

      await transactionItem.create(
        {
          transactionId: newTransaction.id,
          itemType: "premium_badge",
          itemId: locationId,
          itemName: `Premium Badge - ${location.name}`,
          quantity: 1,
          unitPrice: price,
          discountAmount: 0,
          totalPrice: price,
          isShippingRequired: false,
          locationId: locationId,
        },
        { transaction: t },
      );

      // Create Native Payment
      const customer = await masterCustomer.findByPk(customerId);

      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord) {
        await t.rollback();
        return {
          status: false,
          message: `Payment method ${paymentMethod} not found or inactive`,
        };
      }

      const gatewayPayment = await this._createXenditPayment(
        newOrder.orderNumber,
        totalOrderAmount,
        customer,
        paymentMethod,
      );

      // Create Payment Record
      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalOrderAmount,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await t.commit();

      // Schedule auto-expiry after 10 minutes if unpaid
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Premium badge purchase initiated",
        data: {
          ...newOrder.toJSON(),
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async buyAds(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const {
        adsConfigId,
        locationId,
        paymentMethod,
        startDate,
        endDate,
        adsData,
        referenceType,
        referenceId,
      } = data;

      // --- POLYMORPHIC REFERENCE VALIDATION ---
      if (referenceType && referenceId) {
        const {
          masterProduct,
          masterPackage,
          masterService,
          masterLocation: locModel,
        } = require("../models");
        let exists = false;

        if (referenceType === "PRODUCT")
          exists = await masterProduct.findByPk(referenceId);
        else if (referenceType === "PACKAGE")
          exists = await masterPackage.findByPk(referenceId);
        else if (referenceType === "SERVICE")
          exists = await masterService.findByPk(referenceId);
        else if (referenceType === "OUTLET")
          exists = await locModel.findByPk(referenceId);

        if (!exists) throw new Error(`Invalid ${referenceType} reference ID`);
      }

      if (!adsConfigId) throw new Error("Ads Configuration ID is required");
      if (!locationId) throw new Error("Location ID is required");
      if (!paymentMethod) throw new Error("Payment method is required");
      if (!startDate || !endDate)
        throw new Error("Start and End dates are required");

      const config = await AdsConfig.findByPk(adsConfigId);
      if (!config) throw new Error("Ads configuration not found");

      const location = await masterLocation.findByPk(locationId);
      if (!location) throw new Error("Location not found");

      const companyId = location.companyId;
      if (!companyId) throw new Error("Location is not linked to a company");

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) throw new Error("End date must be after start date");

      // Calculate days
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      const totalPrice = parseFloat(config.pricePerDay) * diffDays;

      // --- ADS BALANCE CHECK ---
      const balanceService = require("./balance.service");
      const balanceResult = await balanceService.getBalance(companyId);

      if (
        balanceResult.status &&
        parseFloat(balanceResult.data.balance) >= totalPrice
      ) {
        // Sufficient Balance: Spend and Activate immediately
        const spendResult = await balanceService.spendBalance(
          companyId,
          totalPrice,
          null,
          `Purchase Ads ${config.type} for ${location.name}`,
          t
        );

        if (spendResult.status) {
          // Create PAID Order
          const newOrder = await order.create(
            {
              orderNumber: `ORD-ADS-BAL-${nanoid(10).toUpperCase()}`,
              customerId: customerId,
              totalAmount: totalPrice,
              paymentStatus: "PAID",
            },
            { transaction: t },
          );

          const newTransaction = await transaction.create(
            {
              orderId: newOrder.id,
              transactionNumber: `TRX-ADS-BAL-${nanoid(10).toUpperCase()}`,
              locationId: locationId,
              subTotal: totalPrice,
              shippingFee: 0,
              grandTotal: totalPrice,
              orderStatus: "PAID",
            },
            { transaction: t },
          );

          await transactionItem.create(
            {
              transactionId: newTransaction.id,
              itemType: `ADS_${config.type}`,
              itemId: adsConfigId,
              itemName: `Ads ${config.type} - ${location.name} (${diffDays} days)`,
              quantity: 1,
              unitPrice: totalPrice,
              totalPrice: totalPrice,
              isShippingRequired: false,
              locationId: locationId,
            },
            { transaction: t },
          );

          // Create ACTIVE AdsPurchase
          const purchase = await AdsPurchase.create(
            {
              locationId,
              orderId: newOrder.id,
              adsType: config.type,
              configId: adsConfigId,
              startDate: start,
              endDate: end,
              data: adsData,
              status: "PAID",
              isActive: true,
              referenceType: referenceType || "OUTLET",
              referenceId: referenceId || locationId,
            },
            { transaction: t },
          );

          // Special case for PREMIUM updates on location
          if (
            config.type === "PREMIUM_SEARCH" ||
            config.type === "PREMIUM_BADGE"
          ) {
            await masterLocation.update(
              { isPremium: true, premiumExpiredAt: end },
              { where: { id: locationId }, transaction: t },
            );
          }

          await t.commit();
          return {
            status: true,
            message: "Ads purchased using account balance",
            data: { order: newOrder, purchase },
          };
        }
      }

      // --- FALLBACK TO PAYMENT GATEWAY ---
      const newOrder = await order.create(
        {
          orderNumber: `ORD-ADS-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalPrice,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      const newTransaction = await transaction.create(
        {
          orderId: newOrder.id,
          transactionNumber: `TRX-ADS-${nanoid(10).toUpperCase()}`,
          locationId: locationId,
          subTotal: totalPrice,
          shippingFee: 0,
          grandTotal: totalPrice,
          orderStatus: "CREATED",
        },
        { transaction: t },
      );

      await transactionItem.create(
        {
          transactionId: newTransaction.id,
          itemType: `ADS_${config.type}`,
          itemId: adsConfigId,
          itemName: `Ads ${config.type} - ${location.name} (${diffDays} days)`,
          quantity: 1,
          unitPrice: totalPrice,
          discountAmount: 0,
          totalPrice: totalPrice,
          isShippingRequired: false,
          locationId: locationId,
        },
        { transaction: t },
      );

      // Create AdsPurchase record in PENDING status
      await AdsPurchase.create(
        {
          locationId,
          orderId: newOrder.id,
          adsType: config.type,
          configId: adsConfigId,
          startDate: start,
          endDate: end,
          data: adsData,
          status: "PENDING",
          isActive: false,
          referenceType: referenceType || "OUTLET",
          referenceId: referenceId || locationId,
        },
        { transaction: t },
      );

      // Create Native Payment
      const customer = await masterCustomer.findByPk(customerId);
      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord) {
        throw new Error(
          `Payment method ${paymentMethod} not found or inactive`,
        );
      }

      const gatewayPayment = await this._createXenditPayment(
        newOrder.orderNumber,
        totalPrice,
        customer,
        paymentMethod,
      );

      // Create Payment Record
      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalPrice,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await t.commit();

      // Schedule auto-expiry
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Ads purchase initiated",
        data: {
          ...newOrder.toJSON(),
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },
  async buyAdBalance(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const { amount, paymentMethod } = data;

      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error("Invalid topup amount");
      }
      if (!paymentMethod) throw new Error("Payment method is required");

      const companyLink = await relationshipUserCompany.findOne({
        where: { userId: customerId, isactive: true },
      });

      if (!companyLink) throw new Error("User is not linked to any company");

      const totalPrice = parseFloat(amount);

      const newOrder = await order.create(
        {
          orderNumber: `ORD-TOPUP-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalPrice,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      const newTransaction = await transaction.create(
        {
          orderId: newOrder.id,
          transactionNumber: `TRX-TOPUP-${nanoid(10).toUpperCase()}`,
          locationId: null,
          subTotal: totalPrice,
          shippingFee: 0,
          grandTotal: totalPrice,
          orderStatus: "CREATED",
        },
        { transaction: t },
      );

      await transactionItem.create(
        {
          transactionId: newTransaction.id,
          itemType: "AD_BALANCE_TOPUP",
          itemId: companyLink.companyId,
          itemName: `Ad Balance Topup - ${totalPrice}`,
          quantity: 1,
          unitPrice: totalPrice,
          totalPrice: totalPrice,
          isShippingRequired: false,
        },
        { transaction: t },
      );

      // Create Native Payment
      const customer = await masterCustomer.findByPk(customerId);
      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord)
        throw new Error(`Payment method ${paymentMethod} not found`);

      const gatewayPayment = await this._createXenditPayment(
        newOrder.orderNumber,
        totalPrice,
        customer,
        paymentMethod,
      );

      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalPrice,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await t.commit();
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Topup initiated",
        data: {
          ...newOrder.toJSON(),
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async buyConsultationQuota(data, customerId) {
    const t = await sequelize.transaction();
    try {
      const { quantity, paymentMethod } = data;

      if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
        throw new Error("Invalid quantity");
      }
      if (!paymentMethod) throw new Error("Payment method is required");

      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        throw new Error("Akses ditolak. Hanya akun customer yang dapat membeli kuota.");
      }

      const quotaService = require("./quota.service");
      const configResult = await quotaService.getQuotaConfig();
      if (!configResult.status) throw new Error(configResult.message);

      const pricePerQuota = parseFloat(configResult.data.quotaPrice);
      const totalPrice = pricePerQuota * parseInt(quantity);

      const newOrder = await order.create(
        {
          orderNumber: `ORD-QUOTA-${nanoid(10).toUpperCase()}`,
          customerId: customerId,
          totalAmount: totalPrice,
          paymentStatus: "UNPAID",
        },
        { transaction: t },
      );

      const newTransaction = await transaction.create(
        {
          orderId: newOrder.id,
          transactionNumber: `TRX-QUOTA-${nanoid(10).toUpperCase()}`,
          locationId: null,
          subTotal: totalPrice,
          shippingFee: 0,
          grandTotal: totalPrice,
          orderStatus: "CREATED",
        },
        { transaction: t },
      );

      await transactionItem.create(
        {
          transactionId: newTransaction.id,
          itemType: "CONSULTATION_QUOTA",
          itemId: customerId,
          itemName: `Consultation Quota (${quantity} pcs)`,
          quantity: parseInt(quantity),
          unitPrice: pricePerQuota,
          totalPrice: totalPrice,
          isShippingRequired: false,
        },
        { transaction: t },
      );

      // Create Native Payment
      const methodRecord = await masterPaymentMethod.findOne({
        where: { code: paymentMethod, isActive: true },
        transaction: t,
      });

      if (!methodRecord)
        throw new Error(`Payment method ${paymentMethod} not found`);

      const gatewayPayment = await this._createXenditPayment(
        newOrder.orderNumber,
        totalPrice,
        customer,
        paymentMethod,
      );

      await orderPayment.create(
        {
          orderId: newOrder.id,
          paymentMethod: paymentMethod,
          amount: totalPrice,
          paymentStatus: "PENDING",
          referenceNumber: gatewayPayment.id,
          gatewayResponse: gatewayPayment.rawPayload,
          checkoutUrl: gatewayPayment.checkoutUrl || gatewayPayment.invoiceUrl,
          instructions: Array.isArray(gatewayPayment.instructions)
            ? gatewayPayment.instructions.join("\n")
            : gatewayPayment.instructions,
        },
        { transaction: t },
      );

      await t.commit();
      schedulePaymentTimeout(
        newOrder.id,
        newOrder.orderNumber,
        this._expireOrder.bind(this),
      );

      return {
        status: true,
        message: "Quota purchase initiated",
        data: {
          ...newOrder.toJSON(),
          paymentDetails: gatewayPayment,
        },
      };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  // Auto-expire an order that is still UNPAID after timeout
  async _expireOrder(orderId, orderNumber) {
    const t = await sequelize.transaction();
    try {
      const orderData = await order.findOne({
        where: { id: orderId, paymentStatus: "UNPAID" },
        include: [{ model: transaction, as: "transactions" }],
      });

      if (!orderData) return; // Already paid or cancelled

      await orderData.update({ paymentStatus: "EXPIRED" }, { transaction: t });

      for (const trx of orderData.transactions) {
        await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
      }

      await orderPayment.update(
        { paymentStatus: "EXPIRED" },
        { where: { orderId }, transaction: t },
      );

      // Deactivate any vouchers that were pending payment
      const trxItems = await transactionItem.findAll({
        where: {
          transactionId: orderData.transactions.map((trx) => trx.id),
          voucherCode: { [Op.ne]: null },
        },
      });
      if (trxItems.length > 0) {
        await customerVoucher.update(
          { status: "EXPIRED" },
          {
            where: {
              voucherCode: trxItems.map((item) => item.voucherCode),
              status: "NOT_ACTIVE",
            },
          },
        );
      }

      await t.commit();

      // Notify frontend via WebSocket
      socketInstance.emitPaymentUpdate(orderNumber, "EXPIRED", { orderId });
      console.log(
        `[PaymentTimeout] Order ${orderNumber} expired (unpaid after 60 minutes)`,
      );
    } catch (err) {
      await t.rollback();
      console.error(
        `[PaymentTimeout] Failed to expire order ${orderNumber}:`,
        err.message,
      );
    }
  },

  async getTransactionStatus(orderId, customerId) {
    try {
      const orderData = await order.findOne({
        where: { id: orderId, customerId },
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
          {
            model: transaction,
            as: "transactions",
            include: [
              { model: transactionItem, as: "items" },
              { model: transactionShipping, as: "shipping" },
              {
                model: masterLocation,
                as: "location",
                attributes: ["name", "address", "phone"],
              },
            ],
          },
          { model: orderPayment, as: "payments" },
        ],
      });

      if (!orderData) {
        return { status: false, message: "Order not found" };
      }

      const plain = orderData.get({ plain: true });
      const result = {
        ...plain,
        customerPhone: plain.customer?.phoneNumber || null,
        transactions: (plain.transactions || []).map((trx) => {
          const t = { ...trx };
          if (t.location) {
            t.outletPhone = t.location.phone || null;
            delete t.location.phone;
          }
          return t;
        }),
      };
      delete result.customer; // Remove redundant customer object as phone is extracted

      // Get the primary payment record
      const latestPayment = plain.payments?.[0];
      let paymentDetail = null;

      if (latestPayment) {
        paymentDetail = {
          method: latestPayment.paymentMethod,
          status: latestPayment.paymentStatus,
          amount: latestPayment.amount,
        };

        // Add instructions/URL if UNPAID
        if (plain.paymentStatus === "UNPAID" && latestPayment.gatewayResponse) {
          const gr = latestPayment.gatewayResponse;

          // Simple logic to extract IDs/URLs
          if (gr.account_number)
            paymentDetail.accountNumber = gr.account_number;
          if (gr.bank_code) paymentDetail.bankCode = gr.bank_code;
          if (gr.qr_string) paymentDetail.qrString = gr.qr_string;

          if (gr.actions) {
            const webLink = gr.actions.find((a) => a.url_type.includes("WEB"));
            if (webLink) paymentDetail.checkoutUrl = webLink.url;
          }
          if (gr.invoice_url) paymentDetail.checkoutUrl = gr.invoice_url;

          // Get user-friendly instructions
          let pType = "EWALLET";
          if (latestPayment.paymentMethod.includes("VA"))
            pType = "VIRTUAL_ACCOUNT";
          else if (latestPayment.paymentMethod.includes("QR"))
            pType = "QR_CODE";
          else if (gr.invoice_url) pType = "INVOICE";

          paymentDetail.instructions = this._getPaymentInstructions(
            pType,
            latestPayment.paymentMethod,
            gr,
          );
        }
      }

      result.paymentDetail = paymentDetail;

      return { status: true, message: "Status found", data: result };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async cancelOrder(orderId, customerId) {
    const t = await sequelize.transaction();
    try {
      const orderData = await order.findOne({
        where: { id: orderId, customerId },
        include: [{ model: transaction, as: "transactions" }],
      });

      if (!orderData) {
        throw new Error("Order not found");
      }

      if (orderData.paymentStatus === "UNPAID") {
        await orderData.update(
          { paymentStatus: "CANCELLED" },
          { transaction: t },
        );
        for (const trx of orderData.transactions) {
          await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
        }
      } else if (orderData.paymentStatus === "PAID") {
        // After payment callback, orderStatus becomes "PAID", not "CREATED"
        // Can only cancel if all transactions are still PAID (not yet in processing stages like SHIPPED, DELIVERED, etc.)
        const canCancel = orderData.transactions.every(
          (trx) => trx.orderStatus === "PAID",
        );
        if (!canCancel) {
          throw new Error(
            "Order cannot be cancelled as some items are being processed",
          );
        }
        await orderData.update(
          { paymentStatus: "REFUND_REQUESTED" },
          { transaction: t },
        );
        for (const trx of orderData.transactions) {
          await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
        }
      } else {
        throw new Error("Order cannot be cancelled in current status");
      }

      await t.commit();
      return { status: true, message: "Order cancelled successfully" };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async handleXenditCallback(payload, callbackTokenHeader) {
    console.log(
      "Xendit Callback RAW Payload:",
      JSON.stringify(payload, null, 2),
    );
    const t = await sequelize.transaction();
    try {
      // Security: Verify Xendit Callback Token
      const localToken = process.env.XENDIT_CALLBACK_TOKEN;
      if (localToken && callbackTokenHeader !== localToken) {
        console.warn("Xendit Callback: Invalid Token received");
        throw new Error("Invalid callback token");
      }

      let _external_id = null;
      let _status = null;
      let _payment_channel = null;

      // Aggressive Payload Extraction to handle different Xendit Webhook Versions
      const payloadData = payload.data || {};
      const payloadQrCode = payload.qr_code || {};
      
      _external_id = 
        payload.external_id || 
        payloadData.external_id || 
        payloadQrCode.external_id ||
        payload.reference_id || 
        payloadData.reference_id || 
        payload.qr_id ||
        payloadData.qr_id ||
        payloadQrCode.id ||
        payload.id ||
        payloadData.id;

      const rawStatus = payload.status || payloadData.status;
      if (rawStatus === "SUCCEEDED" || rawStatus === "COMPLETED" || rawStatus === "SETTLED") {
        _status = "PAID";
      } else {
        _status = rawStatus;
      }

      const paymentDetails = payload.payment_details || payloadData.payment_details || {};

      _payment_channel = 
        payload.payment_channel || 
        payload.payment_method || 
        payload.bank_code || 
        payloadData.channel_code || 
        (payloadData.payment_method && payloadData.payment_method.type) || 
        paymentDetails.source ||
        (payload.event === "qr.payment" ? "QRIS" : null);


      console.log(
        `Xendit Callback Processed: ID=${_external_id}, Status=${_status}, Channel=${_payment_channel}`,
      );

      if (!_external_id) {
        throw new Error("Missing reference/external ID in callback");
      }

      if (
        _status === "PAID" ||
        _status === "COMPLETED" ||
        _status === "SETTLED" ||
        _status === "SUCCEEDED"
      ) {
        let orderData = await order.findOne({
          where: { orderNumber: _external_id },
          include: [{ model: transaction, as: "transactions" }],
        });

        if (!orderData) {
          // Fallback: search by gateway reference number in orderPayment
          const paymentRecord = await orderPayment.findOne({
            where: { referenceNumber: _external_id },
            include: [{
              model: order,
              as: "order",
              include: [{ model: transaction, as: "transactions" }]
            }]
          });
          if (paymentRecord && paymentRecord.order) {
            orderData = paymentRecord.order;
          }
        }

        if (!orderData) {
          throw new Error(`Order ${_external_id} not found`);
        }

        if (orderData.paymentStatus !== "PAID") {
          // Cancel auto-expiry timer since payment is now confirmed
          cancelPaymentTimeout(orderData.id);

          await orderData.update({ paymentStatus: "PAID" }, { transaction: t });

          // Update all transactions in this order to PAID
          for (const trx of orderData.transactions) {
            await trx.update({ orderStatus: "PAID" }, { transaction: t });
          }

          // Fetch actual MDR fee from Xendit
          let mdrFee = 0;
          try {
            const xenditTrx = await xenditPlatformService.getTransactionDetail(_external_id);
            if (xenditTrx.status && xenditTrx.data) {
              mdrFee = parseFloat(xenditTrx.data.fee_amount || 0);
              console.log(`[XenditCallback] Captured MDR Fee for ${_external_id}: ${mdrFee}`);
            }
          } catch (feeErr) {
            console.error(`[XenditCallback] Error fetching MDR fee for ${_external_id}:`, feeErr.message);
          }

          // Update payment record with detailed info and MDR
          await orderPayment.update(
            {
              paymentStatus: "SUCCESS",
              gatewayResponse: payload,
              paymentMethod: _payment_channel || orderData.paymentMethod,
              mdrFee: mdrFee,
            },
            { where: { orderId: orderData.id }, transaction: t },
          );

          // Notify frontend via WebSocket
          socketInstance.emitPaymentUpdate(orderData.orderNumber, "PAID", {
            orderId: orderData.id,
            paymentChannel: _payment_channel,
          });

          // 🔹 SKIP Notifications for Ads and Topups
          const isAdsOrTopupOrQuota =
            orderData.orderNumber.startsWith("ORD-ADS-") ||
            orderData.orderNumber.startsWith("ORD-TOPUP-") ||
            orderData.orderNumber.startsWith("ORD-QUOTA-");

          if (!isAdsOrTopupOrQuota) {
            // Push notification: payment success
            const firstTrxId = orderData.transactions.length > 0 ? orderData.transactions[0].id : null;
            await pushNotificationService.sendPushNotification(
              orderData.customerId,
              "customer",
              {
                title: "Pembayaran Berhasil ✅",
                body: `Pesanan ${orderData.orderNumber} telah berhasil dibayar.`,
                data: {
                  type: "payment",
                  orderId: orderData.id,
                  trxId: firstTrxId || "",
                  orderNumber: orderData.orderNumber,
                },
              }
            );

            // === SEND ADMIN NOTIFICATION ===
            for (const trx of orderData.transactions) {
              try {
                const loc = await masterLocation.findByPk(trx.locationId);
                if (loc && loc.companyId) {
                  await NotificationService.createNotification({
                    companyId: loc.companyId,
                    locationId: loc.id,
                    title: "Transaksi Baru ✅",
                    body: `Ada pesanan baru ${orderData.orderNumber} senilai ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(trx.grandTotal)} untuk outlet ${loc.name}.`,
                    category: "Transaction",
                    type: "TRANSACTION_SUCCESS",
                    referenceId: trx.id,
                    referenceType: "transaction",
                  });
                }
              } catch (adminNotifErr) {
                console.error("[TransactionOrder] Admin Notification Error:", adminNotifErr.message);
              }
            }
          }

          // Activate vouchers linked to this order's transactions
          const transactionIds = orderData.transactions.map((trx) => trx.id);
          if (transactionIds.length > 0) {
            const trxItems = await transactionItem.findAll({
              where: { transactionId: transactionIds },
            });

            for (const item of trxItems) {
              if (item.voucherCode) {
                const now = new Date();
                const expiredAt = new Date(
                  now.getTime() + 7 * 24 * 60 * 60 * 1000,
                ); // 7 days from now

                await customerVoucher.update(
                  { status: "BOOKED", expiredAt: expiredAt },
                  {
                    where: {
                      voucherCode: item.voucherCode,
                      status: "NOT_ACTIVE",
                    },
                    transaction: t,
                  },
                );
              }

              // 🔹 Increment totalSold
              if (item.itemType === "product") {
                await masterProduct.increment(
                  { totalSold: item.quantity },
                  { where: { id: item.itemId }, transaction: t },
                );
              } else if (item.itemType === "package") {
                await masterPackage.increment(
                  { totalSold: item.quantity },
                  { where: { id: item.itemId }, transaction: t },
                );
              } else if (item.itemType === "service") {
                await masterService.increment(
                  { totalSold: item.quantity },
                  { where: { id: item.itemId }, transaction: t },
                );
              } else if (item.itemType === "premium_badge") {
                const now = new Date();
                const expiredAt = new Date(
                  now.getTime() + 30 * 24 * 60 * 60 * 1000,
                ); // 30 days
                await masterLocation.update(
                  { isPremium: true, premiumExpiredAt: expiredAt },
                  { where: { id: item.itemId }, transaction: t },
                );
              }

              // Handle Ads activation
              const adsService = require("./ads.service");
              await adsService.activatePurchase(orderData.id);

              // Handle AD_BALANCE_TOPUP
              if (item.itemType === "AD_BALANCE_TOPUP") {
                const balanceService = require("./balance.service");
                await balanceService.addBalance(
                  item.itemId,
                  item.totalPrice,
                  "TOPUP",
                  orderData.id,
                );
              }

              // Handle CONSULTATION_QUOTA
              if (item.itemType === "CONSULTATION_QUOTA") {
                const quotaService = require("./quota.service");
                const configResult = await quotaService.getQuotaConfig();
                
                let bonus = 0;
                if (configResult.status && configResult.data) {
                  const { buyThreshold, bonusQuota } = configResult.data;
                  if (buyThreshold > 0 && bonusQuota > 0) {
                    bonus = Math.floor(item.quantity / buyThreshold) * bonusQuota;
                  }
                }

                const totalToAdd = item.quantity + bonus;
                
                const { ConsultationQuota } = require("../models");
                let userQuota = await ConsultationQuota.findOne({
                  where: { customerId: orderData.customerId },
                  transaction: t
                });

                if (!userQuota) {
                  userQuota = await ConsultationQuota.create({
                    customerId: orderData.customerId,
                    purchasedBalance: totalToAdd,
                  }, { transaction: t });
                } else {
                  await userQuota.update({
                    purchasedBalance: userQuota.purchasedBalance + totalToAdd
                  }, { transaction: t });
                }
                
                console.log(`[QuotaActivator] Added ${totalToAdd} quota (incl. ${bonus} bonus) to customer ${orderData.customerId}`);
              }

              // 🔹 Flash Sale sold update
              if (item.flashSaleItemId) {
                await flashSaleItem.increment(
                  { sold: item.quantity },
                  { where: { id: item.flashSaleItemId }, transaction: t },
                );
              }
            }
          }

          // 🔹 Credit voucher subsidy to mitra's ads balance
          try {
            await voucherService.creditVoucherSubsidy(orderData.id);
          } catch (voucherSubsidyErr) {
            console.error("[XenditCallback] Voucher subsidy error:", voucherSubsidyErr.message);
          }
        }
      } else if (_status === "EXPIRED" || _status === "FAILED") {
        let orderData = await order.findOne({
          where: { orderNumber: _external_id },
          include: [{ model: transaction, as: "transactions" }],
        });

        if (!orderData) {
          const paymentRecord = await orderPayment.findOne({
            where: { referenceNumber: _external_id },
            include: [{
              model: order,
              as: "order",
              include: [{ model: transaction, as: "transactions" }]
            }]
          });
          if (paymentRecord && paymentRecord.order) {
            orderData = paymentRecord.order;
          }
        }

        if (orderData && orderData.paymentStatus !== "PAID") {
          await orderData.update(
            { paymentStatus: _status },
            { transaction: t },
          );
          for (const trx of orderData.transactions) {
            await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
          }

          await orderPayment.update(
            { paymentStatus: "FAILED", gatewayResponse: payload },
            { where: { orderId: orderData.id }, transaction: t },
          );

          // Notify frontend via WebSocket
          socketInstance.emitPaymentUpdate(orderData.orderNumber, _status, {
            orderId: orderData.id,
          });

          // Push notification: payment failed/expired
          pushNotificationService.sendPushNotification(
            orderData.customerId,
            "customer",
            {
              title: "Pembayaran Gagal ❌",
              body: `Pembayaran untuk pesanan ${orderData.orderNumber} ${_status === "EXPIRED" ? "telah kedaluwarsa" : "gagal diproses"}.`,
              data: {
                type: "payment",
                orderId: orderData.id,
                orderNumber: orderData.orderNumber,
                paymentStatus: _status,
              },
            }
          );
        }
      }

      await t.commit();
      return { status: true, message: "Callback processed successfully" };
    } catch (error) {
      await t.rollback();
      console.error("Xendit Callback Error:", error.message);
      return { status: false, message: error.message };
    }
  },

  async updateTransactionToShipped(transactionId, adminId, trackingNumber) {
    const t = await sequelize.transaction();
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      const trx = await transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: order,
            as: "order",
            where: { paymentStatus: "PAID" },
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: masterLocation,
            as: "location",
          },
        ],
      });

      if (!trx) {
        throw new Error("Transaction not found or order not paid");
      }

      // 2. Security Check: Admin location must match transaction location
      if (!locationIds.includes(trx.locationId)) {
        throw new Error("Unauthorized: You are not assigned to this outlet");
      }

      // Can only ship items that are PAID
      if (trx.orderStatus !== "PAID") {
        throw new Error(
          `Cannot ship transaction with status ${trx.orderStatus}`,
        );
      }

      let finalTrackingNumber = trackingNumber;

      // 3. Biteship Auto-Booking (if trackingNumber is not provided)
      const hasAreaIds =
        trx.shipping &&
        trx.shipping.originAreaId &&
        trx.shipping.destinationAreaId;
      const hasLocationCoords =
        trx.location && trx.location.latitude && trx.location.longitude;
      if (
        !finalTrackingNumber &&
        trx.shipping &&
        (hasAreaIds || hasLocationCoords)
      ) {
        const items = await transactionItem.findAll({
          where: { transactionId: trx.id },
        });

        const biteshipData = {
          origin_contact_name: trx.location.name,
          origin_contact_phone: trx.location.phone || "08123456789",
          origin_address: trx.location.address,

          destination_contact_name: trx.shipping.receiverName,
          destination_contact_phone: trx.shipping.receiverPhone,
          destination_address: trx.shipping.address,

          courier_company: trx.shipping.courierCode,
          courier_type: trx.shipping.courierService,

          items: items.map((item) => ({
            name: item.itemName,
            value: parseFloat(item.totalPrice),
            weight: item.weight || 0,
            totalWeight: item.totalWeight || 0,
            quantity: item.quantity,
          })),
        };

        // Use area_id when available, otherwise use coordinates
        if (trx.shipping.originAreaId) {
          biteshipData.origin_area_id = trx.shipping.originAreaId;
        } else if (trx.location.latitude && trx.location.longitude) {
          biteshipData.origin_latitude = parseFloat(trx.location.latitude);
          biteshipData.origin_longitude = parseFloat(trx.location.longitude);
        }

        if (trx.shipping.destinationAreaId) {
          biteshipData.destination_area_id = trx.shipping.destinationAreaId;
        }
        // Note: For instant couriers, destination coordinates come from the customer address
        // The createOrder endpoint will use what's available

        const biteshipOrder = await biteshipService.createOrder(biteshipData);
        finalTrackingNumber = biteshipOrder.courier?.waybill_id;

        // Save full response for debug/audit
        await trx.shipping.update(
          {
            shippingApiResponse: biteshipOrder,
          },
          { transaction: t },
        );
      }

      await trx.update({ orderStatus: "WAITING_PICKUP" }, { transaction: t });

      if (trx.shipping) {
        await trx.shipping.update(
          {
            shippingStatus: "WAITING_PICKUP",
            trackingNumber: finalTrackingNumber || trx.shipping.trackingNumber,
          },
          { transaction: t },
        );
      }

      await t.commit();
      return {
        status: true,
        message: "Transaction is waiting for pickup",
        data: { trackingNumber: finalTrackingNumber },
      };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async updateTransactionToDelivered(transactionId, adminId) {
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      const trx = await transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: transactionShipping,
            as: "shipping",
          },
        ],
      });

      if (!trx) {
        throw new Error("Transaction not found");
      }

      // 2. Security Check: Admin location must match transaction location
      if (!locationIds.includes(trx.locationId)) {
        throw new Error("Unauthorized: You are not assigned to this outlet");
      }

      // Can only mark as delivered if currently SHIPPED or PAID
      if (!["PAID", "SHIPPED"].includes(trx.orderStatus)) {
        throw new Error(
          `Cannot deliver transaction with status ${trx.orderStatus}`,
        );
      }

      const result = await this._completeDelivery(trx);
      if (!result.status) throw new Error(result.message);

      return { status: true, message: "Transaction marked as delivered" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Internal method to complete the delivery process:
   * 1. Update order status to DELIVERED
   * 2. Update shipping status to DELIVERED (if exists)
   * 3. Trigger Xendit Platform transfer to merchant
   * @param {Object} trx - Sequelize model instance of transaction
   */
  async _completeDelivery(trx) {
    const t = await sequelize.transaction();
    try {
      await trx.update({ orderStatus: "DELIVERED" }, { transaction: t });
      if (trx.shipping) {
        await trx.shipping.update(
          { shippingStatus: "DELIVERED" },
          { transaction: t },
        );
      }
      await t.commit();

      // 🔹 Xendit Platform Transfer (Non-blocking)
      try {
        const xenditPlatformService = require("./xenditPlatform.service");
        const transferableItems = await transactionItem.findAll({
          where: {
            transactionId: trx.id,
            itemType: { [Op.in]: ["product", "service"] },
          },
        });

        if (transferableItems.length > 0) {
          const totalTransferAmount = transferableItems.reduce(
            (sum, item) => sum + parseFloat(item.totalPrice),
            0,
          );
          const transferResult = await xenditPlatformService.transferToMerchant(
            {
              locationId: trx.locationId,
              amount: totalTransferAmount,
              transferType: "ITEM_DELIVERED",
              transactionId: trx.id,
              orderId: trx.orderId,
            },
          );
          if (!transferResult.status) {
            console.warn(
              `[Deliver] Platform transfer skipped/failed: ${transferResult.message}`,
            );
          }
        }
      } catch (transferError) {
        console.error(
          "[Deliver] Platform transfer error (non-blocking):",
          transferError.message,
        );
      }
      return { status: true };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async handleBiteshipCallback(payload) {
    try {
      const { courier_waybill_id, courier_tracking_id, status } = payload;
      const trackingNumber = courier_waybill_id || courier_tracking_id;

      if (!trackingNumber) {
        // Return success for Biteship webhook installation/validation
        return {
          status: true,
          message: "Biteship webhook validation: No tracking number found",
        };
      }

      const shipInfo = await transactionShipping.findOne({
        where: { trackingNumber },
        include: [{ model: transaction, as: "transaction" }],
      });

      if (!shipInfo || !shipInfo.transaction) {
        return {
          status: false,
          message: `Transaction for tracking number ${trackingNumber} not found`,
        };
      }

      const trx = shipInfo.transaction;
      const normalizedStatus = (status || "").toLowerCase();

      // 1. Map Delivered
      if (["delivered", "received"].includes(normalizedStatus)) {
        if (
          trx.orderStatus !== "DELIVERED" &&
          trx.orderStatus !== "COMPLETED"
        ) {
          // Ensure shipping info is attached so _completeDelivery can update it
          trx.shipping = shipInfo;
          await this._completeDelivery(trx);
          console.log(
            `[Biteship Webhook] Transaction ${trx.transactionNumber} marked as DELIVERED`,
          );
        }
      }
      // 2. Map Shipped
      else if (
        ["shipped", "picked_up", "picked", "dropping_off"].includes(
          normalizedStatus,
        )
      ) {
        if (["PAID", "CREATED", "WAITING_PICKUP"].includes(trx.orderStatus)) {
          await trx.update({ orderStatus: "SHIPPED" });
          await shipInfo.update({ shippingStatus: "SHIPPED" });
          console.log(
            `[Biteship Webhook] Transaction ${trx.transactionNumber} marked as SHIPPED`,
          );
        }
      }

      // Always save/update the response for audit
      await shipInfo.update({ shippingApiResponse: payload });

      return {
        status: true,
        message: `Biteship status ${status} processed successfully`,
      };
    } catch (error) {
      console.error("[Biteship Webhook Error]:", error.message);
      return { status: false, message: error.message };
    }
  },

  async completeTransaction(transactionId, customerId) {
    const t = await sequelize.transaction();
    try {
      const trx = await transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: order,
            as: "order",
            where: { customerId: customerId, paymentStatus: "PAID" },
          },
          {
            model: transactionItem,
            as: "items",
          },
        ],
      });

      if (!trx) {
        throw new Error("Transaction not found or you don't have access");
      }

      // Can only complete if already delivered or if it's a voucher-based transaction that's already PAID
      const isVoucherBased = trx.items.some((item) => item.voucherCode);

      if (isVoucherBased) {
        if (trx.orderStatus !== "PAID" && trx.orderStatus !== "DELIVERED") {
          throw new Error(
            `Cannot complete voucher transaction with status ${trx.orderStatus}. Must be PAID or DELIVERED.`,
          );
        }

        // Verify all vouchers are REDEEM
        const vouchers = await customerVoucher.findAll({
          where: {
            voucherCode: trx.items
              .filter((item) => item.voucherCode)
              .map((item) => item.voucherCode),
          },
          transaction: t,
        });

        const allClaimed = vouchers.every((v) => v.status === "REDEEM");
        if (!allClaimed) {
          throw new Error(
            "Cannot complete transaction. All vouchers must be REDEEM first.",
          );
        }
      } else {
        // For regular products, must be DELIVERED first
        if (trx.orderStatus !== "DELIVERED") {
          throw new Error(
            `Cannot complete transaction with status ${trx.orderStatus}. Must be DELIVERED first.`,
          );
        }
      }

      await trx.update({ orderStatus: "COMPLETED" }, { transaction: t });

      await t.commit();
      return { status: true, message: "Transaction completed successfully" };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async getMyVouchers(customerId, { page = 1, pageSize = 10, status = null }) {
    try {
      // 1. Auto-expire vouchers first
      await customerVoucher.update(
        { status: "EXPIRED" },
        {
          where: {
            customerId,
            status: "BOOKED",
            expiredAt: { [Op.lt]: new Date() },
          },
        },
      );

      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const whereCondition = { customerId };
      if (status && status.length > 0) {
        whereCondition.status = { [Op.in]: status };
      }

      // 2. Fetch only vouchers from orders that have been PAID
      const { count: totalCount, rows: vouchers } =
        await customerVoucher.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: transactionItem,
              as: "transactionItem",
              required: true,
              include: [
                {
                  model: transaction,
                  as: "transaction",
                  required: true,
                  include: [
                    {
                      model: order,
                      as: "order",
                      required: true,
                      where: { paymentStatus: "PAID" },
                      attributes: ["id", "orderNumber", "paymentStatus"],
                    },
                  ],
                },
              ],
            },
            {
              model: masterCustomer,
              as: "customer",
              attributes: ["phoneNumber"],
            },
            {
              model: masterPackage,
              as: "package",
              include: [
                {
                  model: masterLocation,
                  as: "locations",
                  attributes: ["id", "name", "address", "phone"],
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
                {
                  model: masterPackageItems,
                  as: "items",
                  include: [
                    {
                      model: masterService,
                      as: "service",
                      attributes: [
                        "id",
                        "name",
                        "description",
                        "price",
                        "duration",
                      ],
                    },
                  ],
                },
              ],
            },
            {
              model: masterService,
              as: "service",
              include: [
                {
                  model: masterLocation,
                  as: "locations",
                  attributes: ["id", "name", "address", "phone"],
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
          limit,
          offset,
          order: [["createdAt", "DESC"]],
        });

      const result = vouchers.map((v) => {
        const plain = v.get({ plain: true });
        const refItem = plain.package || plain.service || null;
        const firstLocation = refItem?.locations?.[0] || null;
        const imageLocation = firstLocation?.images?.[0]?.imageUrl || null;

        // Cleanup internal objects if preferred, or just add the field
        const res = {
          ...plain,
          customerPhone: plain.customer?.phoneNumber || null,
          outletPhone: firstLocation?.phone || null,
          imageLocation,
        };
        delete res.customer;
        if (res.package?.locations) {
          delete res.package.locations;
        }
        if (res.service?.locations) {
          delete res.service.locations;
        }
        // Maintain backward compatibility for single location object if needed
        if (res.package) res.package.location = firstLocation;
        if (res.service) res.service.location = firstLocation;
        return res;
      });

      return {
        status: true,
        message: "Vouchers fetched successfully",
        data: result,
        totalCount: totalCount,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async claimVoucher(voucherCode, adminId) {
    const t = await sequelize.transaction();
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      // 2. Find Voucher
      const voucher = await customerVoucher.findOne({
        where: { voucherCode },
        include: [
          {
            model: masterPackage,
            as: "package",
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: ["id", "phone"],
              },
            ],
          },
          {
            model: masterService,
            as: "service",
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: ["id", "phone"],
              },
            ],
          },
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
        ],
      });

      if (!voucher) {
        throw new Error("Voucher not found");
      }

      const plainVoucher = voucher.get({ plain: true });

      // Handle both package and service
      const item = plainVoucher.package || plainVoucher.service;
      if (!item) {
        throw new Error("Voucher item details not found");
      }

      const itemLocations = item.locations || [];
      const firstLocation = itemLocations[0] || null;

      const resultVoucher = {
        ...plainVoucher,
        customerPhone: plainVoucher.customer?.phoneNumber || null,
        outletPhone: firstLocation?.phone || null,
      };
      delete resultVoucher.customer;

      // Maintain backward compatibility
      if (resultVoucher.package) resultVoucher.package.location = firstLocation;
      if (resultVoucher.service) resultVoucher.service.location = firstLocation;

      if (voucher.status !== "BOOKED") {
        throw new Error(`Voucher is already ${voucher.status}`);
      }

      // 3. Expiration Check
      if (voucher.expiredAt && new Date() > new Date(voucher.expiredAt)) {
        await voucher.update({ status: "EXPIRED" }, { transaction: t });
        throw new Error("Voucher has expired and can no longer be claimed");
      }

      // 4. Security Check: Admin must be assigned to one of the item's locations
      const itemLocationIds = itemLocations.map((loc) => loc.id);
      const isAuthorized = locationIds.some((id) =>
        itemLocationIds.includes(id),
      );

      if (!isAuthorized) {
        throw new Error("Voucher cannot be claimed at this location");
      }

      // 5. Update Status
      await voucher.update({ status: "REDEEM" }, { transaction: t });

      // 6. Auto-Complete Transaction logic
      const voucherTrxItem = await transactionItem.findOne({
        where: { id: voucher.transactionItemId },
        transaction: t,
      });

      if (voucherTrxItem) {
        const trxId = voucherTrxItem.transactionId;
        const trx = await transaction.findOne({
          where: { id: trxId },
          include: [{ model: transactionItem, as: "items" }],
          transaction: t,
        });

        if (
          trx &&
          (trx.orderStatus === "PAID" || trx.orderStatus === "DELIVERED")
        ) {
          const voucherCodes = trx.items
            .filter((item) => item.voucherCode)
            .map((item) => item.voucherCode);
          const hasOtherItems = trx.items.some((item) => !item.voucherCode);

          // Verify all vouchers in this transaction are REDEEM
          const redeemedVouchersCount = await customerVoucher.count({
            where: {
              voucherCode: { [Op.in]: voucherCodes },
              status: "REDEEM",
            },
            transaction: t,
          });

          if (redeemedVouchersCount === voucherCodes.length && !hasOtherItems) {
            await trx.update({ orderStatus: "COMPLETED" }, { transaction: t });
            console.log(
              `[ClaimVoucher] Transaction ${trxId} automatically marked as COMPLETED`,
            );
          }
        }
      }

      await t.commit();

      // 🔹 Xendit Platform: Transfer package amount to merchant after REDEEM
      try {
        const xenditPlatformService = require("./xenditPlatform.service");
        const vTrxItem = await transactionItem.findOne({
          where: { id: voucher.transactionItemId },
          include: [{ model: transaction, as: "transaction" }],
        });

        if (vTrxItem && vTrxItem.transaction) {
          const transferResult = await xenditPlatformService.transferToMerchant(
            {
              locationId: vTrxItem.locationId,
              amount: parseFloat(vTrxItem.totalPrice),
              transferType: "VOUCHER_REDEEM",
              transactionId: vTrxItem.transaction.id,
              transactionItemId: vTrxItem.id,
              orderId: vTrxItem.transaction.orderId,
            },
          );
          if (!transferResult.status) {
            console.warn(
              `[ClaimVoucher] Platform transfer skipped/failed: ${transferResult.message}`,
            );
          }
        }
      } catch (transferError) {
        console.error(
          "[ClaimVoucher] Platform transfer error (non-blocking):",
          transferError.message,
        );
      }

      return {
        status: true,
        message: "Voucher claimed successfully",
        data: resultVoucher,
      };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  async checkVoucher(voucherCode, adminId) {
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      // 2. Find Voucher
      const voucher = await customerVoucher.findOne({
        where: { voucherCode },
        include: [
          {
            model: masterPackage,
            as: "package",
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: ["id", "name", "address", "phone"],
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
              {
                model: masterPackageItems,
                as: "items",
                include: [
                  {
                    model: masterService,
                    as: "service",
                    attributes: [
                      "id",
                      "name",
                      "description",
                      "price",
                      "duration",
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: masterService,
            as: "service",
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: ["id", "name", "address", "phone"],
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
            model: masterCustomer,
            as: "customer",
            attributes: ["id", "name", "username", "email", "phoneNumber"],
          },
        ],
      });

      if (!voucher) {
        throw new Error("Voucher not found");
      }

      const plainVoucher = voucher.get({ plain: true });

      // Handle both package and service
      const item = plainVoucher.package || plainVoucher.service;
      if (!item) {
        throw new Error("Voucher item details not found");
      }

      const itemLocations = item.locations || [];
      const firstLocation = itemLocations[0] || null;
      const imageLocation = firstLocation?.images?.[0]?.imageUrl || null;

      if (plainVoucher.status !== "BOOKED") {
        return {
          status: false,
          message: `Voucher is already ${plainVoucher.status}`,
          data: {
            ...plainVoucher,
            customerPhone: plainVoucher.customer?.phoneNumber || null,
            outletPhone: firstLocation?.phone || null,
            imageLocation,
            location: firstLocation, // Backward compatibility
          },
        };
      }

      // 3. Expiration Check
      if (
        plainVoucher.status === "BOOKED" &&
        plainVoucher.expiredAt &&
        new Date() > new Date(plainVoucher.expiredAt)
      ) {
        await customerVoucher.update(
          { status: "EXPIRED" },
          { where: { id: plainVoucher.id } },
        );
        return {
          status: false,
          message: "Voucher has expired",
          data: {
            ...plainVoucher,
            status: "EXPIRED",
            customerPhone: plainVoucher.customer?.phoneNumber || null,
            outletPhone: firstLocation?.phone || null,
            imageLocation,
          },
        };
      }

      // 4. Security Check: Admin must be assigned to one of the item's locations
      const itemLocationIds = itemLocations.map((loc) => loc.id);
      const isAuthorized = locationIds.some((id) =>
        itemLocationIds.includes(id),
      );

      if (!isAuthorized) {
        throw new Error("Voucher cannot be claimed at this location");
      }

      const finalData = {
        ...plainVoucher,
        customerPhone: plainVoucher.customer?.phoneNumber || null,
        outletPhone: firstLocation?.phone || null,
        imageLocation,
        location: firstLocation, // for compatibility
        item: item,
      };

      return {
        status: true,
        message: "Voucher is valid and claimable",
        data: finalData,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async addPaymentMethod(data) {
    try {
      if (Array.isArray(data)) {
        await masterPaymentMethod.bulkCreate(data, {
          updateOnDuplicate: ["name", "code", "type", "isActive", "logoUrl"],
        });
      } else {
        await masterPaymentMethod.create(data);
      }
      return { status: true, message: "Payment method(s) added successfully" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getOutletTransactions(
    adminId,
    {
      page = 1,
      pageSize = 10,
      search = "",
      status = "",
      locationId = null,
      companyId = null,
      productOnlyForPaid = false,
    },
  ) {
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      // Filter allowed locations
      let targetLocationIds = locationIds;
      if (locationId && locationId.length > 0) {
        targetLocationIds = locationId.filter(id => locationIds.includes(id));
      }

      if (targetLocationIds.length === 0) {
        return {
          status: true,
          message: "No transactions found for requested filters",
          data: [],
          totalCount: 0,
        };
      }

      const whereClause = {
        locationId: { [Op.in]: targetLocationIds },
      };

      if (companyId && companyId.length > 0) {
        whereClause["$location.companyId$"] = { [Op.in]: companyId };
      }

      if (search) {
        whereClause[Op.or] = [
          { transactionNumber: { [Op.like]: `%${search}%` } },
          { "$order.customer.name$": { [Op.like]: `%${search}%` } },
        ];
      }

      if (status) {
        const statusArr = Array.isArray(status) ? status : [status];

        if (productOnlyForPaid && statusArr.includes("PAID")) {
          // For PAID status: only include transactions that have at least one PRODUCT item
          const otherStatuses = statusArr.filter((s) => s !== "PAID");
          const orConditions = [];

          if (otherStatuses.length > 0) {
            orConditions.push({ orderStatus: { [Op.in]: otherStatuses } });
          }

          orConditions.push({
            [Op.and]: [
              { orderStatus: "PAID" },
              sequelize.literal(
                `EXISTS (SELECT 1 FROM transactionItems ti WHERE ti.transactionId = \`transaction\`.\`id\` AND ti.itemType = 'product')`,
              ),
            ],
          });

          // Merge with existing Op.or (search) if present
          if (whereClause[Op.or]) {
            const searchConditions = whereClause[Op.or];
            delete whereClause[Op.or];
            whereClause[Op.and] = [
              { [Op.or]: searchConditions },
              { [Op.or]: orConditions },
            ];
          } else {
            whereClause[Op.or] = orConditions;
          }
        } else {
          whereClause.orderStatus =
            statusArr.length === 1 ? statusArr[0] : { [Op.in]: statusArr };
        }
      }

      const { count, rows } = await transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: order,
            as: "order",
            required: !!search,
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["id", "name", "phoneNumber"],
                required: !!search,
              },
              {
                model: orderPayment,
                as: "payments",
                attributes: ["paymentMethod", "paymentStatus", "amount", "mdrFee"],
              },
              {
                model: VoucherUsage,
                as: "vouchers",
                attributes: ["discountAmount", "myskinSubsidy", "mitraSubsidy"],
              },
            ],
          },
          {
            model: transactionItem,
            as: "items",
            attributes: ["itemName", "quantity", "totalPrice"],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["createdAt", "DESC"]],
        distinct: true,
        subQuery: false,
      });

      const result = rows.map((r) => {
        const plain = r.get({ plain: true });
        
        // --- Financial Breakdown Calculation ---
        const orderData = plain.order;
        const paymentData = orderData && orderData.payments && orderData.payments.length > 0 ? orderData.payments[0] : null;
        const vouchers = orderData && orderData.vouchers ? orderData.vouchers : [];
        
        const subtotal = parseFloat(plain.grandTotal || 0); // This is usually sum(items) + shipping
        const shippingFee = parseFloat(plain.shipping?.shippingCost || 0);
        
        // 🔹 Proportional Calculation for MDR and Voucher
        const totalOrderAmountBeforeDiscount = parseFloat(orderData?.totalAmount || 0) + vouchers.reduce((sum, v) => sum + parseFloat(v.discountAmount), 0);
        
        // Proportion of this transaction relative to the whole order
        const proportion = totalOrderAmountBeforeDiscount > 0 ? subtotal / totalOrderAmountBeforeDiscount : 0;

        // MDR Calculation
        let mdrFee = 0;
        if (paymentData && paymentData.mdrFee > 0) {
          mdrFee = Math.round(proportion * parseFloat(paymentData.mdrFee));
        }

        // Voucher Calculation (Proportional)
        const totalVoucherDiscount = vouchers.reduce((sum, v) => sum + parseFloat(v.discountAmount), 0);
        const totalMitraSubsidy = vouchers.reduce((sum, v) => sum + parseFloat(v.mitraSubsidy), 0);
        
        const voucherDiscountPortion = Math.round(proportion * totalVoucherDiscount);
        const mitraSubsidyPortion = Math.round(proportion * totalMitraSubsidy);

        // Platform Fee (1% of subtotal before voucher if we want, or after? usually after item discount but before voucher)
        // Let's stick to 1% of the subtotal (grandTotal) as defined in getFinancialReport
        const platformFeePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "1");
        const platformFee = Math.round((subtotal * platformFeePercent) / 100);

        // Net for Outlet: Subtotal - platformFee - mdrFee - (portion of voucher that outlet pays)
        const netForOutlet = subtotal - platformFee - mdrFee - mitraSubsidyPortion;

        const res = {
          ...plain,
          customerPhone: plain.shipping?.receiverPhone || plain.order?.customer?.phoneNumber || null,
          outletPhone: plain.location?.phone || null,
          serviceFee: plain.order?.orderNumber?.startsWith("ORD-") ? SERVICE_FEE : 0,
          financials: {
            subtotal,
            shippingFee,
            voucherDiscount: voucherDiscountPortion,
            xenditMdrFee: mdrFee,
            platformFee: platformFee,
            netForOutlet: netForOutlet,
          }
        };
        if (res.order?.customer) {
          delete res.order.customer.phoneNumber;
        }
        if (res.location) {
          delete res.location.phone;
        }
        return res;
      });

      return {
        status: true,
        message: "Transactions fetched successfully",
        data: result,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerTransactionHistory(customerId, { page = 1, pageSize = 10, status = null }) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status && status.length > 0) {
        const orConditions = [];

        status.forEach((s) => {
          const normStatus = s.toLowerCase();
          if (normStatus === "unpaid") {
            orConditions.push({
              "$order.paymentStatus$": { [Op.in]: ["UNPAID", "PENDING"] },
            });
          } else if (normStatus === "processed") {
            orConditions.push({ orderStatus: "PAID" });
          } else if (normStatus === "shipped") {
            orConditions.push({
              orderStatus: { [Op.in]: ["WAITING_PICKUP", "SHIPPED"] },
            });
          } else if (normStatus === "on_delivery") {
            orConditions.push({ orderStatus: "DELIVERED" });
          } else if (normStatus === "completed") {
            orConditions.push({ orderStatus: "COMPLETED" });
          } else if (normStatus === "expired") {
            orConditions.push({
              [Op.or]: [
                { "$order.paymentStatus$": "EXPIRED" },
                { orderStatus: "EXPIRED" },
              ],
            });
          }
        });

        if (orConditions.length > 0) {
          whereCondition[Op.or] = orConditions;
        }
      }

      const { count, rows } = await transaction.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: order,
            as: "order",
            where: { customerId },
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["phoneNumber"],
              },
              {
                model: orderPayment,
                as: "payments",
                attributes: ["paymentMethod", "paymentStatus", "amount"],
              },
            ],
          },
          {
            model: transactionItem,
            as: "items",
            attributes: ["itemName", "quantity", "totalPrice"],
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name"],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["createdAt", "DESC"]],
        distinct: true,
        subQuery: false,
      });

      const result = rows.map((r) => {
        const plain = r.get({ plain: true });
        const res = {
          ...plain,
          customerPhone: plain.shipping?.receiverPhone || plain.order?.customer?.phoneNumber || null,
          outletPhone: plain.location?.phone || null,
        };
        if (res.order?.customer) {
          delete res.order.customer.phoneNumber;
        }
        if (res.location) {
          delete res.location.phone;
        }
        return res;
      });

      return {
        status: true,
        message: "Transaction history fetched successfully",
        data: result,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerOrderHistory(customerId, { page = 1, pageSize = 10 }) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const { count, rows } = await order.findAndCountAll({
        where: { customerId },
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
          {
            model: orderPayment,
            as: "payments",
            attributes: [
              "paymentMethod",
              "paymentStatus",
              "amount",
              "checkoutUrl",
            ],
          },
          {
            model: transaction,
            as: "transactions",
            include: [
              {
                model: transactionItem,
                as: "items",
                include: [
                  {
                    model: masterProduct,
                    as: "product",
                    attributes: ["id", "name"],
                    include: [
                      {
                        model: masterProductImage,
                        as: "images",
                        attributes: ["imageUrl"],
                        limit: 1,
                      },
                    ],
                  },
                  {
                    model: masterPackage,
                    as: "package",
                    attributes: ["id", "name"],
                  },
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: transactionShipping,
                as: "shipping",
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "phone"],
              },
            ],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["createdAt", "DESC"]],
        distinct: true,
      });

      const processedRows = rows.map((o) => {
        const plainOrder = o.get({ plain: true });
        return {
          id: plainOrder.id,
          orderNumber: plainOrder.orderNumber,
          totalAmount: plainOrder.totalAmount,
          paymentStatus: plainOrder.paymentStatus,
          customerPhone: plainOrder.transactions?.[0]?.shipping?.receiverPhone || plainOrder.customer?.phoneNumber || null,
          createdAt: plainOrder.createdAt,
          serviceFee: plainOrder.orderNumber?.startsWith("ORD-") ? SERVICE_FEE : 0,
          payments: plainOrder.payments,
          transactions: (plainOrder.transactions || []).map((trx) => {
            const t = {
              id: trx.id,
              transactionNumber: trx.transactionNumber,
              orderStatus: trx.orderStatus,
              locationName: trx.location?.name || null,
              outletPhone: trx.location?.phone || null,
              grandTotal: trx.grandTotal,
              items: (trx.items || []).map((item) => ({
                itemName: item.itemName,
                itemType: item.itemType,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                imageUrl: item.product?.images?.[0]?.imageUrl || null,
              })),
            };
            return t;
          }),
        };
      });

      return {
        status: true,
        message: "Order history fetched successfully",
        data: processedRows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerPurchasedProducts(customerId, { page = 1, pageSize = 10, type = null }) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const whereCondition = { orderStatus: "PAID" };
      const itemIncludeWhere = {};
      if (type) {
        itemIncludeWhere.itemType = type;
      }

      const { count, rows } = await transaction.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: order,
            as: "order",
            where: { customerId },
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["phoneNumber"],
              },
            ],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
          {
            model: transactionItem,
            as: "items",
            where: itemIncludeWhere,
            required: !!type,
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name", "price"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name", "price"],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "price"],
              },
            ],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["updatedAt", "DESC"]],
        distinct: true,
        subQuery: false,
      });

      const processedRows = rows.map((trx) => {
        const plainTrx = trx.get({ plain: true });

        const items = plainTrx.items.map((item) => {
          let imageUrl = null;
          if (
            item.product &&
            item.product.images &&
            item.product.images.length > 0
          ) {
            imageUrl = item.product.images[0].imageUrl;
          }

          return {
            id: item.itemId,
            title: item.itemName,
            type: item.itemType,
            imageUrl: imageUrl,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          };
        });

        return {
          orderId: plainTrx.orderId,
          transactionId: plainTrx.id,
          status: plainTrx.orderStatus,
          purchasedAt: plainTrx.updatedAt,
          locationId: plainTrx.locationId,
          locationName: plainTrx.location?.name,
          customerPhone: plainTrx.order?.customer?.phoneNumber || null,
          outletPhone: plainTrx.location?.phone || null,
          items: items,
        };
      });

      return {
        status: true,
        message: "Purchased products fetched successfully",
        data: processedRows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerCompletedTransactions(
    customerId,
    { page = 1, pageSize = 10 },
  ) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const { count, rows } = await transaction.findAndCountAll({
        where: { orderStatus: "COMPLETED" },
        include: [
          {
            model: order,
            as: "order",
            where: { customerId },
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["phoneNumber"],
              },
            ],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
          {
            model: transactionItem,
            as: "items",
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name", "price"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name", "price"],
                include: [
                  {
                    model: masterLocation,
                    as: "locations",
                    attributes: ["id"],
                    include: [
                      {
                        model: masterLocationImage,
                        as: "images",
                        attributes: ["imageUrl"],
                        limit: 1,
                      },
                    ],
                  },
                ],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "price"],
              },
            ],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["updatedAt", "DESC"]],
        distinct: true,
        subQuery: false,
      });

      const processedRows = await Promise.all(
        rows.map(async (trx) => {
          const plainTrx = trx.get({ plain: true });

          const items = await Promise.all(
            plainTrx.items.map(async (item) => {
              const entityType = item.itemType; // "product", "package", or "service"
              const entityId = item.itemId;

              // Fetch user rating for this item
              const itemRating = await Rating.findOne({
                where: {
                  customerId,
                  entityType,
                  entityId,
                },
              });

              let imageUrl = null;
              if (
                item.product &&
                item.product.images &&
                item.product.images.length > 0
              ) {
                imageUrl = item.product.images[0].imageUrl;
              } else if (
                item.package &&
                item.package.location &&
                item.package.location.images &&
                item.package.location.images.length > 0
              ) {
                imageUrl = item.package.location.images[0].imageUrl;
              }

              return {
                title: item.itemName,
                imageUrl: imageUrl,
                productId: item.itemId,
                type: item.itemType,
                rating: itemRating ? itemRating.rating : 0,
                ratingId: itemRating ? itemRating.id : null,
                isRating: !!itemRating,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              };
            }),
          );

          return {
            orderId: plainTrx.orderId,
            transactionId: plainTrx.id,
            status: plainTrx.orderStatus,
            completedAt: plainTrx.updatedAt,
            locationId: plainTrx.locationId,
            locationName: plainTrx.location?.name,
            customerPhone: plainTrx.shipping?.receiverPhone || plainTrx.order?.customer?.phoneNumber || null,
            outletPhone: plainTrx.location?.phone || null,
            items: items,
          };
        }),
      );

      return {
        status: true,
        message: "Completed transactions fetched successfully",
        data: processedRows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerUnpaidOrders(customerId, { page = 1, pageSize = 10 }) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const { count, rows } = await order.findAndCountAll({
        where: { customerId, paymentStatus: "UNPAID" },
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
          {
            model: transaction,
            as: "transactions",
            include: [
              {
                model: transactionItem,
                as: "items",
                include: [
                  {
                    model: masterProduct,
                    as: "product",
                    attributes: ["id", "name"],
                    include: [
                      {
                        model: masterProductImage,
                        as: "images",
                        attributes: ["imageUrl"],
                        limit: 1,
                      },
                    ],
                  },
                  {
                    model: masterPackage,
                    as: "package",
                    attributes: ["id", "name"],
                  },
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: transactionShipping,
                as: "shipping",
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["phone"],
              },
            ],
          },
          {
            model: orderPayment,
            as: "payments",
            attributes: [
              "id",
              "paymentMethod",
              "paymentStatus",
              "amount",
              "checkoutUrl",
            ],
            limit: 1,
          },
        ],
        limit: limit,
        offset: offset,
        order: [["createdAt", "DESC"]],
        distinct: true,
      });

      const processedRows = rows.map((o) => {
        const plainOrder = o.get({ plain: true });
        const latestPayment = plainOrder.payments?.[0] || null;

        const items = (plainOrder.transactions || []).flatMap((trx) =>
          (trx.items || []).map((item) => {
            let imageUrl = null;
            if (item.product?.images?.length > 0) {
              imageUrl = item.product.images[0].imageUrl;
            }
            return {
              title: item.itemName,
              imageUrl,
              productId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            };
          }),
        );

        return {
          orderId: plainOrder.id,
          orderNumber: plainOrder.orderNumber,
          transactionId: plainOrder.transactions?.[0]?.id || null,
          paymentStatus: plainOrder.paymentStatus,
          totalAmount: plainOrder.totalAmount,
          createdAt: plainOrder.createdAt,
          customerPhone: plainOrder.transactions?.[0]?.shipping?.receiverPhone || plainOrder.customer?.phoneNumber || null,
          outletPhone: plainOrder.transactions?.[0]?.location?.phone || null,
          paymentMethod: latestPayment?.paymentMethod || null,
          checkoutUrl: latestPayment?.checkoutUrl || null,
          items,
        };
      });

      return {
        status: true,
        message: "Unpaid orders fetched successfully",
        data: processedRows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerShippingTransactions(
    customerId,
    { page = 1, pageSize = 10, status = null },
  ) {
    try {
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const whereCondition = {};
      const productCheckLiteral = sequelize.literal(
        `EXISTS (SELECT 1 FROM transactionItems ti WHERE ti.transactionId = \`transaction\`.\`id\` AND ti.itemType = 'product')`,
      );

      if (status && status.length > 0) {
        const orConditions = [];
        status.forEach((s) => {
          const normStatus = s.toLowerCase();
          if (normStatus === "processed") {
            orConditions.push({
              [Op.and]: [{ orderStatus: "PAID" }, productCheckLiteral],
            });
          } else if (normStatus === "waiting_pickup") {
            orConditions.push({ orderStatus: "WAITING_PICKUP" });
          } else if (normStatus === "shipped") {
            orConditions.push({ orderStatus: "SHIPPED" });
          } else if (normStatus === "delivered") {
            orConditions.push({ orderStatus: "DELIVERED" });
          }
        });
        if (orConditions.length > 0) {
          whereCondition[Op.or] = orConditions;
        }
      } else {
        // Default: Show all active shipping stages including delivered
        whereCondition[Op.or] = [
          { orderStatus: { [Op.in]: ["WAITING_PICKUP", "SHIPPED", "DELIVERED"] } },
          {
            [Op.and]: [{ orderStatus: "PAID" }, productCheckLiteral],
          },
        ];
      }

      // Image 4 "Dalam Pengiriman"
      const { count, rows } = await transaction.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: order,
            as: "order",
            where: { customerId },
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["phoneNumber"],
              },
            ],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: transactionItem,
            as: "items",
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name"],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["phone"],
          },
        ],
        limit: limit,
        offset: offset,
        order: [["updatedAt", "DESC"]],
        distinct: true,
        subQuery: false,
      });

      const processedRows = rows.map((r) => {
        const plain = r.get({ plain: true });
        const res = {
          ...plain,
          customerPhone:
            plain.shipping?.receiverPhone ||
            plain.order?.customer?.phoneNumber ||
            null,
          outletPhone: plain.location?.phone || null,
        };

        // Filter out non-shippable items (packages/services) for this shipping view
        res.items = (res.items || []).filter((item) => item.itemType === "product");

        if (res.order?.customer) {
          delete res.order.customer.phoneNumber;
        }
        if (res.location) {
          delete res.location.phone;
        }
        return res;
      });

      return {
        status: true,
        message: "Shipping transactions fetched successfully",
        data: processedRows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getCustomerOrderTrackingDetail(transactionId, userId) {
    try {
      const trx = await transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: order,
            as: "order",
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["phoneNumber"],
              },
            ],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: transactionItem,
            as: "items",
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name", "price"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name", "price"],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "price"],
              },
            ],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
        ],
      });

      if (!trx) {
        throw new Error("Transaction not found");
      }

      // Security: Owner OR Admin of the outlet
      const isAdmin = await relationshipUserLocation.findOne({
        where: { userId: userId, locationId: trx.locationId, isactive: true },
      });

      if (trx.order.customerId !== userId && !isAdmin) {
        throw new Error(
          "Unauthorized: You don't have access to this tracking detail",
        );
      }

      const plainTrx = trx.get({ plain: true });

      // Timeline logic
      const timeline = [
        {
          title: "Order placed",
          description: "Kami telah menerima pesanan Anda",
          time: plainTrx.createdAt,
          completed: true,
        },
        {
          title: "Waiting for courier",
          description: "Pesanan sudah dikemas dan menunggu kurir",
          time: [
            "WAITING_PICKUP",
            "SHIPPED",
            "DELIVERED",
            "COMPLETED",
          ].includes(plainTrx.orderStatus)
            ? plainTrx.updatedAt
            : null,
          completed: [
            "WAITING_PICKUP",
            "SHIPPED",
            "DELIVERED",
            "COMPLETED",
          ].includes(plainTrx.orderStatus),
        },
        {
          title: "In transit",
          description: "Pesanan sedang dalam perjalanan ke lokasi Anda",
          time: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(
            plainTrx.orderStatus,
          )
            ? plainTrx.updatedAt
            : null,
          completed: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(
            plainTrx.orderStatus,
          ),
        },
        {
          title: "Order delivered",
          description: "Pesanan telah sampai di tujuan",
          time: ["DELIVERED", "COMPLETED"].includes(plainTrx.orderStatus)
            ? plainTrx.updatedAt
            : null,
          completed: ["DELIVERED", "COMPLETED"].includes(plainTrx.orderStatus),
        },
      ];

      let trackingRealtime = null;
      if (plainTrx.shipping?.trackingNumber) {
        try {
          trackingRealtime = await biteshipService.trackShipment(
            plainTrx.shipping.trackingNumber,
            plainTrx.shipping.courierCode,
          );
        } catch (e) {
          console.error("Realtime Tracking Error:", e.message);
        }
      }

      const simplifiedTransaction = {
        id: plainTrx.id,
        transactionNumber: plainTrx.transactionNumber,
        orderStatus: plainTrx.orderStatus,
        paymentStatus: plainTrx.order?.paymentStatus || "UNPAID",
        createdAt: plainTrx.createdAt,
        customerPhone: plainTrx.order?.customer?.phoneNumber || null,
        outletPhone: plainTrx.location?.phone || null,
        location: {
          id: plainTrx.location?.id,
          name: plainTrx.location?.name,
        },
        shipping: {
          receiverName: plainTrx.shipping?.receiverName,
          receiverPhone: plainTrx.shipping?.receiverPhone,
          address: plainTrx.shipping?.address,
          courierCode: plainTrx.shipping?.courierCode,
          courierService: plainTrx.shipping?.courierService,
          trackingNumber: plainTrx.shipping?.trackingNumber,
        },
        items: (plainTrx.items || [])
          .map((item) => ({
            id: item.id,
            itemName: item.itemName,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice),
            image: item.product?.images?.[0]?.imageUrl || null,
          })),
        serviceFee: SERVICE_FEE,
      };

      return {
        status: true,
        message: "Order tracking detail fetched successfully",
        data: {
          transaction: simplifiedTransaction,
          timeline,
          trackingRealtime,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getTransactionDetail(transactionId, userId) {
    try {
      const trx = await transaction.findOne({
        where: { id: transactionId },
        include: [
          {
            model: order,
            as: "order",
            include: [
              {
                model: masterCustomer,
                as: "customer",
                attributes: ["id", "name", "email", "phoneNumber", "profileImageUrl"],
              },
              {
                model: orderPayment,
                as: "payments",
                attributes: ["paymentMethod", "paymentStatus", "amount", "mdrFee"],
              },
              {
                model: VoucherUsage,
                as: "vouchers",
                attributes: ["discountAmount", "myskinSubsidy", "mitraSubsidy"],
              },
            ],
          },
          {
            model: transactionShipping,
            as: "shipping",
          },
          {
            model: transactionItem,
            as: "items",
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name", "price"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                  },
                ],
              },
              {
                model: masterPackage,
                as: "package",
                attributes: ["id", "name", "price"],
              },
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "price"],
              },
            ],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "phone"],
          },
        ],
      });

      if (!trx) {
        throw new Error("Transaction not found");
      }

      // Security Check
      const authorizedLocationIds = await this._getAdminLocationIds(userId);
      const isAuthorizedAdmin = authorizedLocationIds.includes(trx.locationId);
      const isOwner = trx.order.customerId === userId;

      if (!isOwner && !isAuthorizedAdmin) {
        throw new Error(
          "Unauthorized: You don't have access to this transaction detail",
        );
      }

      const plain = trx.get({ plain: true });
      
      // --- Financial Constants ---
      const orderData = plain.order;
      const paymentData = orderData && orderData.payments && orderData.payments.length > 0 ? orderData.payments[0] : null;
      const vouchers = orderData && orderData.vouchers ? orderData.vouchers : [];
      const totalVoucherDiscount = vouchers.reduce((sum, v) => sum + parseFloat(v.discountAmount), 0);
      const totalMitraSubsidy = vouchers.reduce((sum, v) => sum + parseFloat(v.mitraSubsidy), 0);
      const totalMyskinSubsidy = vouchers.reduce((sum, v) => sum + parseFloat(v.myskinSubsidy), 0);
      
      const totalOrderAmountBeforeDiscount = parseFloat(orderData?.totalAmount || 0) + totalVoucherDiscount;

      const resultData = {
        ...plain,
        customerPhone: plain.shipping?.receiverPhone || plain.order?.customer?.phoneNumber || null,
        outletPhone: plain.location?.phone || null,
        items: plain.items.map(item => {
          const itemSubtotal = parseFloat(item.totalPrice || 0); // Price * Qty (after item-level discount)
          
          // Proportion of this item relative to the WHOLE order
          const proportion = totalOrderAmountBeforeDiscount > 0 ? itemSubtotal / totalOrderAmountBeforeDiscount : 0;

          // MDR Calculation for this item
          let mdrFee = 0;
          if (paymentData && paymentData.mdrFee > 0) {
            mdrFee = Math.round(proportion * parseFloat(paymentData.mdrFee));
          }

          // Voucher Calculation for this item
          const voucherDiscount = Math.round(proportion * totalVoucherDiscount);
          const mitraSubsidy = Math.round(proportion * totalMitraSubsidy);
          const myskinSubsidy = Math.round(proportion * totalMyskinSubsidy);

          // Platform Fee (1%)
          const platformFeePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "1");
          const platformFee = Math.round((itemSubtotal * platformFeePercent) / 100);

          // Net for Item
          const netForItem = itemSubtotal - platformFee - mdrFee - mitraSubsidy;

          return {
            ...item,
            financials: {
              itemSubtotal,
              itemMdrFee: mdrFee,
              itemPlatformFee: platformFee,
              itemVoucherDiscount: voucherDiscount,
              itemVoucherSubsidySplit: {
                myskin: myskinSubsidy,
                mitra: mitraSubsidy
              },
              netForItem: netForItem
            }
          };
        })
      };

      if (resultData.order?.customer) {
        // Keep the customer object but can remove sensitive fields if needed
        // resultData.customer = resultData.order.customer; 
      }
      if (resultData.location) delete resultData.location.phone;

      return {
        status: true,
        message: "Transaction detail fetched successfully",
        data: resultData,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getOrderDetail(orderId, userId, userRole) {
    try {
      let where;
      if (!userRole) {
        where = {
          id: orderId,
          customerId: userId,
        };
      } else {
        where = {
          id: orderId,
        };
      }
      const orderData = await order.findOne({
        where,
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
          {
            model: orderPayment,
            as: "payments",
          },
          {
            model: transaction,
            as: "transactions",
            include: [
              {
                model: transactionItem,
                as: "items",
                include: [
                  {
                    model: masterProduct,
                    as: "product",
                    attributes: ["id", "name", "price"],
                    include: [
                      {
                        model: masterProductImage,
                        as: "images",
                        attributes: ["imageUrl"],
                        limit: 1,
                      },
                    ],
                  },
                  {
                    model: masterPackage,
                    as: "package",
                    attributes: ["id", "name", "price"],
                  },
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name", "price"],
                  },
                ],
              },
              {
                model: transactionShipping,
                as: "shipping",
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "address", "phone"],
              },
            ],
          },
        ],
      });

      if (!orderData) {
        return { status: false, message: "Order not found" };
      }

      const plainOrder = orderData.get({ plain: true });
      const processedData = {
        id: plainOrder.id,
        orderNumber: plainOrder.orderNumber,
        totalAmount: plainOrder.totalAmount,
        paymentStatus: plainOrder.paymentStatus,
        customerPhone: plainOrder.transactions?.[0]?.shipping?.receiverPhone || plainOrder.customer?.phoneNumber || null,
        createdAt: plainOrder.createdAt,
        payments: (plainOrder.payments || []).map((p) => ({
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          amount: p.amount,
          checkoutUrl: p.checkoutUrl,
          instructions: p.instructions ? p.instructions.split("\n") : [],
        })),
        transactions: (plainOrder.transactions || []).map((trx) => ({
          id: trx.id,
          transactionNumber: trx.transactionNumber,
          orderStatus: trx.orderStatus,
          locationName: trx.location?.name || null,
          locationAddress: trx.location?.address || null,
          outletPhone: trx.location?.phone || null,
          grandTotal: trx.grandTotal,
          items: (trx.items || []).map((item) => ({
            id: item.itemId,
            itemName: item.itemName,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            imageUrl: item.product?.images?.[0]?.imageUrl || null,
          })),
          shipping: trx.shipping
            ? {
              courierName: trx.shipping.courierName,
              trackingNumber: trx.shipping.trackingNumber,
              shippingAddress: trx.shipping.shippingAddress,
            }
            : null,
        })),
      };

      return {
        status: true,
        message: "Order detail fetched successfully",
        data: processedData,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getPaymentDetail(orderId, customerId) {
    try {
      const orderData = await order.findOne({
        where: { id: orderId, customerId },
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["phoneNumber"],
          },
          { model: orderPayment, as: "payments" },
          {
            model: transaction,
            as: "transactions",
            include: [
              {
                model: transactionShipping,
                as: "shipping",
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["phone"],
              },
            ],
          },
        ],
      });

      if (!orderData) {
        return { status: false, message: "Order not found" };
      }

      const latestPayment = orderData.payments?.[0];
      if (!latestPayment) {
        return { status: false, message: "Payment info not found" };
      }

      const paymentStatus = orderData.paymentStatus;
      const gr = latestPayment.gatewayResponse || {};

      // Calculate remaining time (expiry is usually 24h for VA/QR, 10m for our internal timeout)
      // But let's use our internal 10 minute timeout as the target for the UI timer if it's UNPAID
      const createdAt = new Date(orderData.createdAt);
      const expiryDate = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes
      const now = new Date();
      const remainingMs = Math.max(0, expiryDate - now);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      const paymentDetail = {
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        paymentStatus: orderData.paymentStatus,
        paymentMethod: latestPayment.paymentMethod,
        customerPhone: orderData.transactions?.[0]?.shipping?.receiverPhone || orderData.customer?.phoneNumber || null,
        outletPhone: orderData.transactions?.[0]?.location?.phone || null,
        remainingSeconds,
        instructions: latestPayment.instructions
          ? latestPayment.instructions.split("\n")
          : [],
        checkoutUrl: latestPayment.checkoutUrl,
      };

      // Extract specific IDs based on payment method
      if (gr.account_number) paymentDetail.accountNumber = gr.account_number;
      if (gr.bank_code) paymentDetail.bankCode = gr.bank_code;
      if (gr.qr_string) paymentDetail.qrString = gr.qr_string;

      return {
        status: true,
        message: "Payment detail fetched successfully",
        data: paymentDetail,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getOutletStats(adminId, { startDate, endDate }) {
    try {
      // 1. Get Admin's Locations
      const locationIds = await this._getAdminLocationIds(adminId);

      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      const whereClause = { locationId: { [Op.in]: locationIds } };

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // A. Total Transaksi
      const totalTransactions = await transaction.count({ where: whereClause });

      // B. Total Pendapatan (Status SUCCESS in platformTransfers)
      const incomeWhere = {
        locationId: { [Op.in]: locationIds },
        status: "SUCCESS",
      };
      if (startDate && endDate) {
        incomeWhere.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }
      const totalRevenue =
        (await platformTransfer.sum("amount", { where: incomeWhere })) || 0;

      // C. Transaksi Sukses (orderStatus = 'COMPLETED')
      const successTransactions = await transaction.count({
        where: { ...whereClause, orderStatus: "COMPLETED" },
      });

      // D. Transaksi Pending (PAID, SHIPPED, DELIVERED)
      const pendingTransactions = await transaction.count({
        where: {
          ...whereClause,
          orderStatus: { [Op.in]: ["PAID", "SHIPPED", "DELIVERED"] },
        },
      });

      // E. Treatment Package
      const voucherWhere = {
        status: ["BOOKED", "REDEEM"],
      };
      // To filter by location and date, we need to include transactionItem -> transaction
      const vouchers = await customerVoucher.findAll({
        include: [
          {
            model: transactionItem,
            as: "transactionItem",
            where: { locationId: { [Op.in]: locationIds } },
            include: [
              {
                model: transaction,
                as: "transaction",
                where:
                  startDate && endDate
                    ? {
                      createdAt: {
                        [Op.between]: [
                          new Date(startDate),
                          new Date(endDate),
                        ],
                      },
                    }
                    : {},
              },
            ],
          },
        ],
        where: {
          status: { [Op.in]: ["BOOKED", "REDEEM"] },
        },
      });

      const totalBook = vouchers.filter((v) => v.status === "BOOKED").length;
      const totalRedeem = vouchers.filter((v) => v.status === "REDEEM").length;
      const totalPaid = vouchers.length;

      return {
        status: true,
        message: "Outlet statistics fetched successfully",
        data: {
          totalTransactions,
          totalRevenue: parseFloat(totalRevenue),
          successTransactions,
          pendingTransactions,
          treatmentPackage: {
            totalBook,
            totalRedeem,
            totalPaid,
          },
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getFinancialReport(adminId, { startDate, endDate, locationId, page = 1, pageSize = 100 }) {
    try {
      const locationIds = await this._getAdminLocationIds(adminId);
      if (!locationIds || locationIds.length === 0) {
        throw new Error("Admin not assigned to any location");
      }

      let targetLocationIds = locationIds;
      if (locationId && locationId.length > 0) {
        targetLocationIds = locationId.filter(id => locationIds.includes(id));
      }

      if (targetLocationIds.length === 0) {
        throw new Error("Unauthorized access to requested location");
      }

      const whereClause = {
        locationId: { [Op.in]: targetLocationIds },
        orderStatus: { [Op.in]: ["PAID", "SHIPPED", "DELIVERED", "COMPLETED"] },
      };

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      } else if (startDate) {
        whereClause.createdAt = { [Op.gte]: new Date(startDate) };
      } else if (endDate) {
        whereClause.createdAt = { [Op.lte]: new Date(endDate) };
      }

      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const { count: totalCount, rows: transactions } = await transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: order,
            as: "order",
            include: [
              { model: masterCustomer, as: "customer", attributes: ["name"] },
              { 
                model: orderPayment, 
                as: "payments", 
                where: { paymentStatus: "SUCCESS" },
                required: false 
              },
            ],
          },
          { model: transactionShipping, as: "shipping" },
          { model: platformTransfer, as: "transfers" },
          { model: masterLocation, as: "location", attributes: ["name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      const reportData = transactions.map((trx) => {
        const orderData = trx.order;
        const paymentData = orderData.payments && orderData.payments.length > 0 ? orderData.payments[0] : null;
        
        const subtotal = parseFloat(trx.grandTotal || 0);
        const shippingFee = parseFloat(trx.shipping?.shippingCost || 0);
        const totalItemsInOrder = orderData.totalAmount - (orderData.shippingCost || 0) - SERVICE_FEE;
        
        // MDR Calculation (Proportional to the item's share of total order amount)
        let mdrFee = 0;
        if (paymentData && paymentData.mdrFee > 0) {
          const totalOrderAmount = parseFloat(orderData.totalAmount);
          mdrFee = Math.round((subtotal / totalOrderAmount) * parseFloat(paymentData.mdrFee));
        }

        // Platform Fee Calculation (1% of subtotal)
        // If transfer already exists, use that. Otherwise calculate.
        let platformFee = 0;
        if (trx.transfers && trx.transfers.length > 0) {
          platformFee = parseFloat(trx.transfers[0].platformFee || 0);
        } else {
          const platformFeePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "0");
          platformFee = Math.round((subtotal * platformFeePercent) / 100);
        }

        // Service Fee (Only for the platform, but shown here for context as part of the total customer paid)
        // Actually, Service Fee is paid ONCE per order. For reporting per transaction, 
        // we can assign it proportionally or just show it in a separate total.
        // User asked to "Show It", usually it's best to show it as the platform's revenue portion for this order.
        const serviceFeeShare = Math.round((subtotal / totalItemsInOrder) * SERVICE_FEE);

        const totalCustomerPaid = subtotal + shippingFee; // This trx's portion
        const netForOutlet = subtotal - platformFee - mdrFee;

        return {
          transactionId: trx.id,
          orderNumber: orderData.orderNumber,
          transactionNumber: trx.transactionNumber,
          date: trx.createdAt,
          locationName: trx.location?.name,
          customerName: orderData.customer?.name || "N/A",
          status: trx.orderStatus,
          financials: {
            subtotal: subtotal,
            shippingFee: shippingFee,
            serviceFeeShare: serviceFeeShare, // Portion of 4500
            totalPaidPortion: totalCustomerPaid + serviceFeeShare,
            xenditMdrFee: mdrFee,
            platformFee: platformFee,
            netForOutlet: netForOutlet,
          }
        };
      });

      return {
        status: true,
        message: "Financial report fetched successfully",
        data: reportData,
        totalCount,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async exportTransactions(adminId, { startDate, endDate, format = "excel" }) {
    try {
      // Reuse the financial report logic to get all details
      const reportResult = await this.getFinancialReport(adminId, { 
        startDate, 
        endDate, 
        pageSize: 1000 // Get many for export
      });

      if (!reportResult.status) {
        throw new Error(reportResult.message);
      }

      const transactions = reportResult.data;

      if (format === "excel") {
        return await this._generateExcel(transactions);
      } else if (format === "pdf") {
        return await this._generatePDF(transactions);
      } else {
        throw new Error("Invalid export format");
      }
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async _generateExcel(transactions) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Transactions");

      worksheet.columns = [
        { header: "No", key: "no", width: 5 },
        { header: "Date", key: "date", width: 15 },
        { header: "Order #", key: "orderNumber", width: 20 },
        { header: "Customer", key: "customerName", width: 20 },
        { header: "Location", key: "locationName", width: 20 },
        { header: "Subtotal", key: "subtotal", width: 15 },
        { header: "Shipping", key: "shippingFee", width: 15 },
        { header: "Service Fee share", key: "serviceFeeShare", width: 15 },
        { header: "Paid by Customer", key: "totalPaid", width: 15 },
        { header: "Xendit MDR", key: "xenditMdrFee", width: 15 },
        { header: "MySkin 1% Fee", key: "platformFee", width: 15 },
        { header: "Net for Outlet", key: "netForOutlet", width: 15 },
        { header: "Status", key: "status", width: 12 },
      ];

      transactions.forEach((item, index) => {
        worksheet.addRow({
          no: index + 1,
          date: item.date ? new Date(item.date).toISOString().split("T")[0] : "N/A",
          orderNumber: item.orderNumber,
          customerName: item.customerName,
          locationName: item.locationName,
          subtotal: item.financials.subtotal,
          shippingFee: item.financials.shippingFee,
          serviceFeeShare: item.financials.serviceFeeShare,
          totalPaid: item.financials.totalPaidPortion,
          xenditMdrFee: item.financials.xenditMdrFee,
          platformFee: item.financials.platformFee,
          netForOutlet: item.financials.netForOutlet,
          status: item.status,
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        status: true,
        data: buffer,
        filename: `transactions_${Date.now()}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async _generatePDF(transactions) {
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 20, size: "A4", layout: "landscape" });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          let pdfData = Buffer.concat(buffers);
          resolve({
            status: true,
            data: pdfData,
            filename: `transactions_${Date.now()}.pdf`,
            contentType: "application/pdf",
          });
        });

        doc.fontSize(20).text("Financial Transaction Report", { align: "center" });
        doc.moveDown();

        const tableTop = 80;
        // Adjusted for Landscape A4 (width ~842 points)
        const colX = [30, 50, 160, 280, 400, 480, 560, 640, 720];
        const headers = [
          "No",
          "Order #",
          "Customer",
          "Date",
          "Subtotal",
          "Shipping",
          "MDR",
          "Fee 1%",
          "Net",
        ];

        doc.fontSize(9).font("Helvetica-Bold");
        headers.forEach((h, i) => doc.text(h, colX[i], tableTop));

        doc
          .moveTo(30, tableTop + 15)
          .lineTo(810, tableTop + 15)
          .stroke();

        let currentY = tableTop + 25;
        doc.font("Helvetica");

        transactions.forEach((item, index) => {
          if (currentY > 500) {
            doc.addPage();
            currentY = 40;
          }

          doc.text(index + 1, colX[0], currentY);
          doc.text(item.orderNumber, colX[1], currentY);
          doc.text(item.customerName || "N/A", colX[2], currentY, { width: 110 });
          doc.text(
            item.date ? new Date(item.date).toISOString().split("T")[0] : "N/A",
            colX[3],
            currentY,
          );
          doc.text(item.financials.subtotal.toLocaleString(), colX[4], currentY);
          doc.text(item.financials.shippingFee.toLocaleString(), colX[5], currentY);
          doc.text(item.financials.xenditMdrFee.toLocaleString(), colX[6], currentY);
          doc.text(item.financials.platformFee.toLocaleString(), colX[7], currentY);
          doc.text(item.financials.netForOutlet.toLocaleString(), colX[8], currentY);

          currentY += 20;
        });

        doc.end();
      });
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async updatePaymentMethod(id, data, file) {
    try {
      const { name, isActive } = data;
      const payment_method = await masterPaymentMethod.findByPk(id);

      if (!payment_method) {
        return {
          status: false,
          message: "Payment method not found",
          data: null,
        };
      }

      if (!name) {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      if (name && name !== payment_method.name) {
        const existing = await masterPaymentMethod.findOne({
          where: { name: name },
        });
        if (existing) {
          return {
            status: false,
            message: "Payment method with this name already exists",
            data: null,
          };
        }
      }
      let updateDate = { name, isActive };

      if (file) {
        updateDate.logoUrl = file.path.replace(/\\/g, "/");
      }
      await payment_method.update(updateDate);

      const updatedPaymentMethod = await masterPaymentMethod.findByPk(id);

      return {
        status: true,
        message: "Payment method updated successfully",
        data: updatedPaymentMethod,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
