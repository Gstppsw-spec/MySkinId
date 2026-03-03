const { Op } = require("sequelize");
const {
    order,
    transaction,
    transactionItem,
    transactionShipping,
    orderPayment,
    customerCart,
    masterProduct,
    masterPackage,
    masterLocation,
    customerVoucher,
    masterCustomer,
    relationshipUserLocation,
    customerAddress,
    masterPaymentMethod,
    masterService,
    masterPackageItems,
    masterLocationImage,
    masterProductImage,
    Rating,
    sequelize,
} = require("../models");
const { nanoid } = require("nanoid");
const axios = require("axios");
const rajaongkirService = require("./rajaongkir.service");
const socketInstance = require("../socket/socketInstance");
const { schedulePaymentTimeout, cancelPaymentTimeout } = require("../utils/paymentTimeout");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

module.exports = {
    async _createXenditPayment(orderNumber, amount, customer, paymentMethodCode) {
        try {
            const secretKey = process.env.XENDIT_SECRET_KEY;
            const authHeader = Buffer.from(secretKey + ":").toString("base64");

            // Look up payment method in database
            const methodRecord = await masterPaymentMethod.findOne({
                where: { code: paymentMethodCode, isActive: true }
            });

            if (!methodRecord) {
                throw new Error(`Payment method ${paymentMethodCode} is not available or inactive.`);
            }

            const paymentType = methodRecord.type;
            const formattedPhone = this._formatPhoneNumber(customer ? customer.phoneNumber : null);

            if (paymentType === "VIRTUAL_ACCOUNT") {
                // Fixed Virtual Account
                const expirationDate = new Date();
                expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours expiry

                const response = await axios.post(
                    "https://api.xendit.co/callback_virtual_accounts",
                    {
                        external_id: orderNumber,
                        bank_code: paymentMethodCode,
                        name: customer ? (customer.name || customer.username || "Customer MySkinId") : "Customer MySkinId",
                        expected_amount: amount,
                        is_closed: true,
                        is_single_use: true,
                        expiration_date: expirationDate.toISOString()
                    },
                    { headers: { Authorization: `Basic ${authHeader}` } }
                );
                return {
                    paymentType: "VIRTUAL_ACCOUNT",
                    id: response.data.id,
                    externalId: response.data.external_id,
                    bankCode: response.data.bank_code,
                    accountNumber: response.data.account_number,
                    expectedAmount: response.data.expected_amount,
                    expirationDate: response.data.expiration_date,
                    instructions: this._getPaymentInstructions("VIRTUAL_ACCOUNT", paymentMethodCode, { accountNumber: response.data.account_number }),
                    rawPayload: response.data
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

                                channel_properties: paymentMethodCode === "OVO"
                                    ? { mobile_number: formattedPhone || "+6281234567890" }
                                    : {
                                        success_return_url: `${process.env.FRONTEND_URL || "myskinid://app"}/checkout/payment_success`,
                                        failure_return_url: `${process.env.FRONTEND_URL || "myskinid://app"}/checkout/payment_failure`
                                    }
                            }
                        }
                    },
                    {
                        headers: {
                            Authorization: `Basic ${authHeader}`
                        }
                    }
                );

                let checkoutUrl = null;
                if (response.data.actions) {
                    const appDeeplink = response.data.actions.find(a => a.url_type === "DEEPLINK" || a.url_type === "MOBILE");
                    const webLink = response.data.actions.find(a => a.url_type === "DESKTOP_WEB" || a.url_type === "MOBILE_WEB" || a.url_type === "WEB");
                    checkoutUrl = appDeeplink ? appDeeplink.url : (webLink ? webLink.url : null);
                }

                return {
                    paymentType: "EWALLET",
                    id: response.data.id,
                    referenceId: response.data.reference_id,
                    channelCode: response.data.channel_code,
                    chargeAmount: response.data.charge_amount,
                    checkoutUrl: checkoutUrl,
                    instructions: this._getPaymentInstructions("EWALLET", paymentMethodCode, { checkoutUrl }),
                    rawPayload: response.data
                };
            } else if (paymentType === "QR_CODE") {
                // QR Code (QRIS)
                const response = await axios.post(
                    "https://api.xendit.co/qr_codes",
                    {
                        external_id: orderNumber,
                        type: "DYNAMIC",
                        callback_url: `${process.env.BACKEND_URL || 'https://api.myskin.blog'}/api/v2/transaction/order/callback/xendit`,
                        amount: amount,
                    },
                    { headers: { Authorization: `Basic ${authHeader}` } }
                );

                return {
                    paymentType: "QR_CODE",
                    id: response.data.id,
                    externalId: response.data.external_id,
                    qrString: response.data.qr_string,
                    amount: response.data.amount,
                    status: response.data.status,
                    instructions: this._getPaymentInstructions("QR_CODE", paymentMethodCode, response.data),
                    rawPayload: response.data
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
                        payment_methods: [paymentMethodCode]
                    },
                    { headers: { Authorization: `Basic ${authHeader}` } }
                );
                return {
                    paymentType: "INVOICE",
                    id: response.data.id,
                    externalId: response.data.external_id,
                    invoiceUrl: response.data.invoice_url,
                    expiryDate: response.data.expiry_date,
                    instructions: this._getPaymentInstructions("INVOICE", paymentMethodCode, response.data),
                    rawPayload: response.data
                };
            }
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error("Xendit Native API Error:", detail);
            throw new Error(`Failed to create Native Payment for ${paymentMethodCode}: ${detail}`);
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
                `Pastikan nominal sesuai dan konfirmasi pembayaran`
            ];
        } else if (paymentType === "EWALLET") {
            if (paymentMethodCode === "OVO") {
                return [
                    "Buka aplikasi OVO di handphone Anda",
                    "Cek notifikasi atau halaman utama aplikasi OVO",
                    "Klik bayar pada tagihan dari MySkinId",
                    "Selesaikan pembayaran dalam waktu 30 detik untuk menghindari expire"
                ];
            } else {
                return [
                    "Buka link pembayaran yang tersedia (Checkout URL)",
                    "Anda akan diarahkan otomatis ke aplikasi atau halaman pembayaran",
                    "Selesaikan pembayaran sesuai instruksi di aplikasi tersebut",
                    "Pastikan saldo Anda cukup sebelum melakukan pembayaran"
                ];
            }
        } else if (paymentType === "QR_CODE") {
            return [
                "Scan kode QR yang muncul menggunakan aplikasi (Gopay, OVO, Dana, atau Mobile Banking)",
                "Pastikan nominal pembayaran sudah sesuai",
                "Klik bayar dan masukkan PIN Anda",
                "Jangan tutup halaman ini sampai pembayaran berhasil dikonfirmasi"
            ];
        }
        return [
            "Buka link invoice yang tersedia",
            "Pilih metode pembayaran yang diinginkan",
            "Ikuti instruksi sesuai metode yang dipilih",
            "Bayar sebelum batas waktu berakhir"
        ];
    },

    async getAvailablePaymentMethods() {
        try {
            const methods = await masterPaymentMethod.findAll({
                where: { isActive: true },
                attributes: ["code", "name", "type", "logoUrl"],
                order: [["type", "ASC"], ["name", "ASC"]]
            });

            // Group by type
            const grouped = methods.reduce((acc, method) => {
                const type = method.type;
                if (!acc[type]) {
                    acc[type] = {
                        type: type,
                        channels: []
                    };
                }
                acc[type].channels.push({
                    name: method.name,
                    code: method.code,
                    logoUrl: method.logoUrl
                });
                return acc;
            }, {});

            const data = Object.values(grouped);

            return { status: true, message: "Available payment methods fetched", data };
        } catch (error) {
            console.error("Fetch Payment Methods Error:", error.message);
            return { status: false, message: error.message };
        }
    },

    async checkoutFromCart(data, customerId) {
        const t = await sequelize.transaction();
        try {
            const { paymentMethod, shippingOptions } = data;

            const selectedCartItems = await customerCart.findAll({
                where: { customerId, isSelected: true },
                include: [
                    { model: masterProduct, as: "product" },
                    { model: masterPackage, as: "package" },
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
                }

                if (!actualItem) {
                    throw new Error("Item not found");
                }

                const locationId = actualItem.locationId;
                if (!itemsByLocation[locationId]) {
                    itemsByLocation[locationId] = [];
                }

                const unitPrice = parseFloat(actualItem.price);
                const discountPercent = parseFloat(actualItem.discountPercent || 0);
                const discountAmount = (unitPrice * discountPercent) / 100;
                const totalPrice = (unitPrice - discountAmount) * item.qty;

                const unitWeight = actualItem.weightGram || 0;
                const totalWeight = unitWeight * item.qty;

                itemsByLocation[locationId].push({
                    itemType: type,
                    itemId: actualItem.id,
                    itemName: actualItem.name,
                    quantity: item.qty,
                    unitPrice: unitPrice,
                    discountAmount: discountAmount * item.qty,
                    totalPrice: totalPrice,
                    unitWeight: unitWeight,
                    totalWeight: totalWeight,
                    isShippingRequired: type === "product",
                    locationId: locationId,
                });

                totalOrderAmount += totalPrice;
            }

            // Calculate Shipping Fees and determine definitive totalOrderAmount
            const calculatedShipping = {};
            for (const locationId in itemsByLocation) {
                const items = itemsByLocation[locationId];
                const shippingOpt = shippingOptions ? shippingOptions.find((opt) => opt.locationId === locationId) : null;

                const location = await masterLocation.findByPk(locationId);
                if (!location) throw new Error(`Location ${locationId} not found`);

                let shippingFee = 0;
                let destinationId = null;
                let finalReceiverName = null;
                let finalReceiverPhone = null;
                let finalAddress = null;

                if (shippingOpt) {
                    if (shippingOpt.addressId) {
                        const custAddr = await customerAddress.findOne({ where: { id: shippingOpt.addressId, customerId } });
                        if (!custAddr) throw new Error(`Customer address not found`);

                        destinationId = custAddr.districtId || custAddr.cityId;
                        finalReceiverName = custAddr.receiverName;
                        finalReceiverPhone = custAddr.receiverPhone;
                        finalAddress = `${custAddr.address}, ${custAddr.district}, ${custAddr.city}, ${custAddr.province} ${custAddr.postalCode || ''}`.trim();
                    } else {
                        destinationId = shippingOpt.destinationDistrictId || shippingOpt.destinationId;
                        finalReceiverName = shippingOpt.receiverName;
                        finalReceiverPhone = shippingOpt.receiverPhone;
                        finalAddress = shippingOpt.address;
                    }

                    // Validation & Calculation with RajaOngkir
                    if (items.some(i => i.isShippingRequired)) {
                        if (!destinationId) throw new Error(`Destination city ID is missing for shipping`);
                        const totalWeight = items.reduce((sum, i) => sum + (i.totalWeight || 0), 0);
                        const originId = location.districtId || location.cityId || 0;
                        console.log(`RajaOngkir DEBUG (${shippingOpt.courierCode}): Origin=${originId}, Dest=${destinationId}, Weight=${totalWeight}`);
                        const rates = await rajaongkirService.calculateCost({
                            origin: originId,
                            destination: destinationId,
                            weight: totalWeight,
                            courier: shippingOpt.courierCode
                        });

                        console.log("RajaOngkir RAW Response:", JSON.stringify(rates));

                        const serviceRate = rates && Array.isArray(rates)
                            ? rates.find(c => c.service && c.service.toUpperCase() === shippingOpt.courierService.toUpperCase())
                            : null;

                        if (!serviceRate) {
                            console.error("Service Rate Not Found. Available services:", rates ? rates.map(r => r.service).join(", ") : "None");
                            throw new Error(`Service ${shippingOpt.courierService} not available for ${shippingOpt.courierCode}`);
                        }

                        if (!serviceRate.cost || !Array.isArray(serviceRate.cost) || serviceRate.cost.length === 0) {
                            console.error("Invalid Service Rate structure:", JSON.stringify(serviceRate));
                            throw new Error(`Invalid cost data for service ${shippingOpt.courierService}`);
                        }

                        shippingFee = serviceRate.cost[0].value || 0;
                    }
                }

                calculatedShipping[locationId] = {
                    shippingFee,
                    destinationId,
                    finalReceiverName,
                    finalReceiverPhone,
                    finalAddress,
                    location,
                    shippingOpt
                };

                totalOrderAmount += shippingFee;
            }

            const newOrder = await order.create(
                {
                    orderNumber: `ORD-${nanoid(10).toUpperCase()}`,
                    customerId: customerId,
                    totalAmount: totalOrderAmount,
                    paymentStatus: "UNPAID",
                },
                { transaction: t }
            );

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
                    { transaction: t }
                );

                for (const i of items) {
                    let voucherCode = null;
                    if (i.itemType === "package") {
                        voucherCode = nanoid(8).toUpperCase();
                    }

                    const newTrxItem = await transactionItem.create(
                        {
                            transactionId: newTransaction.id,
                            ...i,
                            voucherCode: voucherCode,
                        },
                        { transaction: t }
                    );

                    if (voucherCode) {
                        await customerVoucher.create(
                            {
                                customerId: customerId,
                                packageId: i.itemId,
                                transactionItemId: newTrxItem.id,
                                voucherCode: voucherCode,
                                status: "NOT_ACTIVE",
                            },
                            { transaction: t }
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
                            originCityId: calcInfo.location ? (calcInfo.location.districtId || calcInfo.location.cityId || 0) : 0,
                            destinationCityId: calcInfo.destinationId,
                            totalWeight: items.reduce((sum, i) => sum + (i.totalWeight || 0), 0),
                            courierCode: calcInfo.shippingOpt.courierCode,
                            courierService: calcInfo.shippingOpt.courierService,
                            shippingCost: calcInfo.shippingFee,
                        },
                        { transaction: t }
                    );
                }
            }

            // Create Native Xendit Payment
            const customer = await masterCustomer.findByPk(customerId);
            if (!paymentMethod) {
                await t.rollback();
                return { status: false, message: "Payment method is required" };
            }
            const xenditPayment = await this._createXenditPayment(newOrder.orderNumber, totalOrderAmount, customer, paymentMethod);

            // Create Payment Record with Xendit data
            await orderPayment.create(
                {
                    orderId: newOrder.id,
                    paymentMethod: paymentMethod,
                    amount: totalOrderAmount,
                    paymentStatus: "PENDING",
                    referenceNumber: xenditPayment.id,
                    gatewayResponse: xenditPayment.rawPayload,
                    checkoutUrl: xenditPayment.checkoutUrl || xenditPayment.invoiceUrl,
                    instructions: Array.isArray(xenditPayment.instructions) ? xenditPayment.instructions.join("\n") : xenditPayment.instructions,
                },
                { transaction: t }
            );

            await customerCart.destroy({
                where: { customerId, isSelected: true },
                transaction: t,
            });

            await t.commit();

            // Schedule auto-expiry after 10 minutes if unpaid
            schedulePaymentTimeout(newOrder.id, newOrder.orderNumber, this._expireOrder.bind(this));

            return {
                status: true,
                message: "Checkout successful",
                data: {
                    ...newOrder.toJSON(),
                    paymentDetails: xenditPayment
                }
            };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
        }
    },

    async directCheckout(data, customerId) {
        const t = await sequelize.transaction();
        try {
            const { items, paymentMethod, shippingOptions } = data;

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
                }

                if (!actualItem) {
                    throw new Error("Item not found");
                }

                const locationId = actualItem.locationId;
                if (!itemsByLocation[locationId]) {
                    itemsByLocation[locationId] = [];
                }

                const unitPrice = parseFloat(actualItem.price);
                const discountPercent = parseFloat(actualItem.discountPercent || 0);
                const discountAmount = (unitPrice * discountPercent) / 100;
                const totalPrice = (unitPrice - discountAmount) * item.qty;

                const unitWeight = actualItem.weightGram || 0;
                const totalWeight = unitWeight * item.qty;

                itemsByLocation[locationId].push({
                    itemType: item.type,
                    itemId: actualItem.id,
                    itemName: actualItem.name,
                    quantity: item.qty,
                    unitPrice: unitPrice,
                    discountAmount: discountAmount * item.qty,
                    totalPrice: totalPrice,
                    unitWeight: unitWeight,
                    totalWeight: totalWeight,
                    isShippingRequired: item.type === "product",
                    locationId: locationId,
                });

                totalOrderAmount += totalPrice;
            }

            // Calculate Shipping Fees and determine definitive totalOrderAmount
            const calculatedShipping = {};
            for (const locationId in itemsByLocation) {
                const items = itemsByLocation[locationId];
                const shippingOpt = shippingOptions ? shippingOptions.find((opt) => opt.locationId === locationId) : null;

                const location = await masterLocation.findByPk(locationId);
                if (!location) throw new Error(`Location ${locationId} not found`);

                let shippingFee = 0;
                let destinationId = null;
                let finalReceiverName = null;
                let finalReceiverPhone = null;
                let finalAddress = null;

                if (shippingOpt) {
                    if (shippingOpt.addressId) {
                        const custAddr = await customerAddress.findOne({ where: { id: shippingOpt.addressId, customerId } });
                        if (!custAddr) throw new Error(`Customer address not found`);

                        destinationId = custAddr.districtId || custAddr.cityId;
                        finalReceiverName = custAddr.receiverName;
                        finalReceiverPhone = custAddr.receiverPhone;
                        finalAddress = `${custAddr.address}, ${custAddr.district}, ${custAddr.city}, ${custAddr.province} ${custAddr.postalCode || ''}`.trim();
                    } else {
                        destinationId = shippingOpt.destinationDistrictId || shippingOpt.destinationId;
                        finalReceiverName = shippingOpt.receiverName;
                        finalReceiverPhone = shippingOpt.receiverPhone;
                        finalAddress = shippingOpt.address;
                    }

                    // Validation & Calculation with RajaOngkir
                    if (items.some(i => i.isShippingRequired)) {
                        if (!destinationId) throw new Error(`Destination city ID is missing for shipping`);
                        const totalWeight = items.reduce((sum, i) => sum + (i.totalWeight || 0), 0);
                        const originId = location.districtId || location.cityId || 0;
                        console.log(`RajaOngkir DEBUG (${shippingOpt.courierCode}): Origin=${originId}, Dest=${destinationId}, Weight=${totalWeight}`);
                        const rates = await rajaongkirService.calculateCost({
                            origin: originId,
                            destination: destinationId,
                            weight: totalWeight,
                            courier: shippingOpt.courierCode
                        });

                        console.log("RajaOngkir RAW Response:", JSON.stringify(rates));

                        const serviceRate = rates && Array.isArray(rates)
                            ? rates.find(c => c.service && c.service.toUpperCase() === shippingOpt.courierService.toUpperCase())
                            : null;

                        if (!serviceRate) {
                            console.error("Service Rate Not Found. Available services:", rates ? rates.map(r => r.service).join(", ") : "None");
                            throw new Error(`Service ${shippingOpt.courierService} not available for ${shippingOpt.courierCode}`);
                        }

                        if (!serviceRate.cost || !Array.isArray(serviceRate.cost) || serviceRate.cost.length === 0) {
                            console.error("Invalid Service Rate structure:", JSON.stringify(serviceRate));
                            throw new Error(`Invalid cost data for service ${shippingOpt.courierService}`);
                        }

                        shippingFee = serviceRate.cost[0].value || 0;
                    }
                }

                calculatedShipping[locationId] = {
                    shippingFee,
                    destinationId,
                    finalReceiverName,
                    finalReceiverPhone,
                    finalAddress,
                    location,
                    shippingOpt
                };

                totalOrderAmount += shippingFee;
            }

            const newOrder = await order.create(
                {
                    orderNumber: `ORD-${nanoid(10).toUpperCase()}`,
                    customerId: customerId,
                    totalAmount: totalOrderAmount,
                    paymentStatus: "UNPAID",
                },
                { transaction: t }
            );

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
                    { transaction: t }
                );

                for (const i of items) {
                    let voucherCode = null;
                    if (i.itemType === "package") {
                        voucherCode = nanoid(8).toUpperCase();
                    }

                    const newTrxItem = await transactionItem.create(
                        {
                            transactionId: newTransaction.id,
                            ...i,
                            voucherCode: voucherCode,
                        },
                        { transaction: t }
                    );

                    if (voucherCode) {
                        await customerVoucher.create(
                            {
                                customerId: customerId,
                                packageId: i.itemId,
                                transactionItemId: newTrxItem.id,
                                voucherCode: voucherCode,
                                status: "NOT_ACTIVE",
                            },
                            { transaction: t }
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
                            originCityId: calcInfo.location ? (calcInfo.location.districtId || calcInfo.location.cityId || 0) : 0,
                            destinationCityId: calcInfo.destinationId,
                            totalWeight: items.reduce((sum, i) => sum + (i.totalWeight || 0), 0),
                            courierCode: calcInfo.shippingOpt.courierCode,
                            courierService: calcInfo.shippingOpt.courierService,
                            shippingCost: calcInfo.shippingFee,
                        },
                        { transaction: t }
                    );
                }
            }

            // Create Native Xendit Payment
            const customer = await masterCustomer.findByPk(customerId);
            if (!paymentMethod) {
                await t.rollback();
                return { status: false, message: "Payment method is required" };
            }
            const xenditPayment = await this._createXenditPayment(newOrder.orderNumber, totalOrderAmount, customer, paymentMethod);

            await orderPayment.create(
                {
                    orderId: newOrder.id,
                    paymentMethod: paymentMethod,
                    amount: totalOrderAmount,
                    paymentStatus: "PENDING",
                    referenceNumber: xenditPayment.id,
                    gatewayResponse: xenditPayment.rawPayload,
                    checkoutUrl: xenditPayment.checkoutUrl || xenditPayment.invoiceUrl,
                    instructions: Array.isArray(xenditPayment.instructions) ? xenditPayment.instructions.join("\n") : xenditPayment.instructions,
                },
                { transaction: t }
            );

            await t.commit();

            // Schedule auto-expiry after 10 minutes if unpaid
            schedulePaymentTimeout(newOrder.id, newOrder.orderNumber, this._expireOrder.bind(this));

            return {
                status: true,
                message: "Direct checkout successful",
                data: {
                    ...newOrder.toJSON(),
                    paymentDetails: xenditPayment
                }
            };
        } catch (error) {
            await t.rollback();
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
                { where: { orderId }, transaction: t }
            );

            // Deactivate any vouchers that were pending payment
            const trxItems = await transactionItem.findAll({
                where: {
                    transactionId: orderData.transactions.map(trx => trx.id),
                    voucherCode: { [Op.ne]: null },
                },
            });
            if (trxItems.length > 0) {
                await customerVoucher.update(
                    { status: "EXPIRED" },
                    { where: { voucherCode: trxItems.map(item => item.voucherCode), status: "NOT_ACTIVE" } }
                );
            }

            await t.commit();

            // Notify frontend via WebSocket
            socketInstance.emitPaymentUpdate(orderNumber, "EXPIRED", { orderId });
            console.log(`[PaymentTimeout] Order ${orderNumber} expired (unpaid after 10 minutes)`);
        } catch (err) {
            await t.rollback();
            console.error(`[PaymentTimeout] Failed to expire order ${orderNumber}:`, err.message);
        }
    },

    async getTransactionStatus(orderId, customerId) {
        try {
            const orderData = await order.findOne({
                where: { id: orderId, customerId },
                include: [
                    {
                        model: transaction,
                        as: "transactions",
                        include: [
                            { model: transactionItem, as: "items" },
                            { model: transactionShipping, as: "shipping" },
                            { model: masterLocation, as: "location", attributes: ["name", "address"] },
                        ],
                    },
                    { model: orderPayment, as: "payments" },
                ],
            });

            if (!orderData) {
                return { status: false, message: "Order not found" };
            }

            const plain = orderData.get({ plain: true });

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
                    if (gr.account_number) paymentDetail.accountNumber = gr.account_number;
                    if (gr.bank_code) paymentDetail.bankCode = gr.bank_code;
                    if (gr.qr_string) paymentDetail.qrString = gr.qr_string;

                    if (gr.actions) {
                        const webLink = gr.actions.find(a => a.url_type.includes("WEB"));
                        if (webLink) paymentDetail.checkoutUrl = webLink.url;
                    }
                    if (gr.invoice_url) paymentDetail.checkoutUrl = gr.invoice_url;

                    // Get user-friendly instructions
                    let pType = "EWALLET";
                    if (latestPayment.paymentMethod.includes("VA")) pType = "VIRTUAL_ACCOUNT";
                    else if (latestPayment.paymentMethod.includes("QR")) pType = "QR_CODE";
                    else if (gr.invoice_url) pType = "INVOICE";

                    paymentDetail.instructions = this._getPaymentInstructions(pType, latestPayment.paymentMethod, gr);
                }
            }

            const resultArr = {
                orderId: plain.id,
                orderNumber: plain.orderNumber,
                totalAmount: plain.totalAmount,
                paymentStatus: plain.paymentStatus,
                paymentDetail,
                transactions: plain.transactions.map(t => ({
                    transactionId: t.id,
                    transactionNumber: t.transactionNumber,
                    locationName: t.location?.name,
                    orderStatus: t.orderStatus,
                    items: t.items.map(i => ({
                        itemName: i.itemName,
                        quantity: i.quantity,
                        totalPrice: i.totalPrice
                    }))
                })),
                createdAt: plain.createdAt
            };

            return { status: true, message: "Status found", data: resultArr };
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
                await orderData.update({ paymentStatus: "CANCELLED" }, { transaction: t });
                for (const trx of orderData.transactions) {
                    await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
                }
            } else if (orderData.paymentStatus === "PAID") {
                // After payment callback, orderStatus becomes "PAID", not "CREATED"
                // Can only cancel if all transactions are still PAID (not yet in processing stages like SHIPPED, DELIVERED, etc.)
                const canCancel = orderData.transactions.every((trx) => trx.orderStatus === "PAID");
                if (!canCancel) {
                    throw new Error("Order cannot be cancelled as some items are being processed");
                }
                await orderData.update({ paymentStatus: "REFUND_REQUESTED" }, { transaction: t });
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
        console.log("Xendit Callback RAW Payload:", JSON.stringify(payload, null, 2));
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

            // Detect Payload Type
            if (payload.event && (payload.event.startsWith("payment_request.") || payload.event.startsWith("payment."))) {
                // Payment Request Callback (V2)
                _external_id = payload.data.reference_id;
                _status = payload.data.status === "SUCCEEDED" ? "PAID" : payload.data.status;
                const pm = payload.data.payment_method;
                _payment_channel = pm ? (pm.ewallet ? pm.ewallet.channel_code : (pm.virtual_account ? pm.virtual_account.bank_code : pm.type)) : null;
            } else if (payload.event && payload.event.startsWith("ewallet.")) {
                // E-Wallet Charge Callback (Legacy/V1)
                _external_id = payload.data.reference_id;
                _status = payload.data.status === "SUCCEEDED" ? "PAID" : "FAILED";
                _payment_channel = payload.data.channel_code;
            } else if (payload.event === "qr_code.payment") {
                // QRIS Callback
                _external_id = payload.data.external_id;
                _status = payload.data.status === "COMPLETED" ? "PAID" : "FAILED";
                _payment_channel = "QRIS";
            } else if (payload.payment_id && payload.callback_virtual_account_id) {
                // Fixed Virtual Account Payment Callback
                _external_id = payload.external_id;
                _status = "PAID"; // Receiving this callback implies payment received
                _payment_channel = payload.bank_code;
            } else {
                // Fallback / Standard Invoice / Retail Outlet Callback
                _external_id = payload.external_id || payload.reference_id || payload.id;
                _status = payload.status;
                _payment_channel = payload.payment_channel || payload.payment_method;
            }

            console.log(`Xendit Callback Processed: ID=${_external_id}, Status=${_status}, Channel=${_payment_channel}`);

            if (!_external_id) {
                throw new Error("Missing reference/external ID in callback");
            }

            if (_status === "PAID" || _status === "COMPLETED" || _status === "SETTLED" || _status === "SUCCEEDED") {
                const orderData = await order.findOne({
                    where: { orderNumber: _external_id },
                    include: [{ model: transaction, as: "transactions" }],
                });

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

                    // Update payment record with detailed info
                    await orderPayment.update(
                        {
                            paymentStatus: "SUCCESS",
                            gatewayResponse: payload,
                            paymentMethod: _payment_channel || orderData.paymentMethod
                        },
                        { where: { orderId: orderData.id }, transaction: t }
                    );

                    // Notify frontend via WebSocket
                    socketInstance.emitPaymentUpdate(orderData.orderNumber, "PAID", {
                        orderId: orderData.id,
                        paymentChannel: _payment_channel,
                    });

                    // Activate vouchers linked to this order's transactions
                    const transactionIds = orderData.transactions.map(trx => trx.id);
                    if (transactionIds.length > 0) {
                        const trxItems = await transactionItem.findAll({
                            where: { transactionId: transactionIds, voucherCode: { [Op.ne]: null } },
                        });
                        if (trxItems.length > 0) {
                            const voucherCodes = trxItems.map(item => item.voucherCode);
                            await customerVoucher.update(
                                { status: "ACTIVE" },
                                { where: { voucherCode: voucherCodes, status: "NOT_ACTIVE" } }
                            );
                        }
                    }
                }
            } else if (_status === "EXPIRED" || _status === "FAILED") {
                const orderData = await order.findOne({
                    where: { orderNumber: _external_id },
                    include: [{ model: transaction, as: "transactions" }],
                });

                if (orderData && orderData.paymentStatus !== "PAID") {
                    await orderData.update({ paymentStatus: _status }, { transaction: t });
                    for (const trx of orderData.transactions) {
                        await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
                    }

                    await orderPayment.update(
                        { paymentStatus: "FAILED", gatewayResponse: payload },
                        { where: { orderId: orderData.id }, transaction: t }
                    );

                    // Notify frontend via WebSocket
                    socketInstance.emitPaymentUpdate(orderData.orderNumber, _status, {
                        orderId: orderData.id,
                    });
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
            // 1. Get Admin's Location
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
                throw new Error("Admin not assigned to any location");
            }

            const trx = await transaction.findOne({
                where: { id: transactionId },
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { paymentStatus: "PAID" }
                    },
                    {
                        model: transactionShipping,
                        as: "shipping"
                    }
                ]
            });

            if (!trx) {
                throw new Error("Transaction not found or order not paid");
            }

            // 2. Security Check: Admin location must match transaction location
            if (trx.locationId !== userLocation.locationId) {
                throw new Error("Unauthorized: You are not assigned to this outlet");
            }

            // Can only ship items that are PAID
            if (trx.orderStatus !== "PAID") {
                throw new Error(`Cannot ship transaction with status ${trx.orderStatus}`);
            }

            await trx.update({ orderStatus: "SHIPPED" }, { transaction: t });

            if (trx.shipping) {
                await trx.shipping.update({
                    shippingStatus: "SHIPPED",
                    trackingNumber: trackingNumber || trx.shipping.trackingNumber
                }, { transaction: t });
            }

            await t.commit();
            return { status: true, message: "Transaction marked as shipped" };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
        }
    },


    async updateTransactionToDelivered(transactionId, adminId) {
        const t = await sequelize.transaction();
        try {
            // 1. Get Admin's Location
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
                throw new Error("Admin not assigned to any location");
            }

            const trx = await transaction.findOne({
                where: { id: transactionId },
                include: [
                    {
                        model: transactionShipping,
                        as: "shipping"
                    }
                ]
            });

            if (!trx) {
                throw new Error("Transaction not found");
            }

            // 2. Security Check: Admin location must match transaction location
            if (trx.locationId !== userLocation.locationId) {
                throw new Error("Unauthorized: You are not assigned to this outlet");
            }

            // Can only mark as delivered if currently SHIPPED or PAID
            if (!["PAID", "SHIPPED"].includes(trx.orderStatus)) {
                throw new Error(`Cannot deliver transaction with status ${trx.orderStatus}`);
            }

            await trx.update({ orderStatus: "DELIVERED" }, { transaction: t });

            if (trx.shipping) {
                await trx.shipping.update({ shippingStatus: "DELIVERED" }, { transaction: t });
            }

            await t.commit();
            return { status: true, message: "Transaction marked as delivered" };
        } catch (error) {
            await t.rollback();
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
                        where: { customerId: customerId, paymentStatus: "PAID" }
                    }
                ]
            });

            if (!trx) {
                throw new Error("Transaction not found or you don't have access");
            }

            // Can only complete if already delivered
            if (trx.orderStatus !== "DELIVERED") {
                throw new Error(`Cannot complete transaction with status ${trx.orderStatus}. Must be DELIVERED first.`);
            }

            await trx.update({ orderStatus: "COMPLETED" }, { transaction: t });

            await t.commit();
            return { status: true, message: "Transaction completed successfully" };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
        }
    },

    async getMyVouchers(customerId) {
        try {
            const vouchers = await customerVoucher.findAll({
                where: { customerId, status: "ACTIVE" },
                include: [
                    {
                        model: masterPackage,
                        as: "package",
                        include: [
                            {
                                model: masterLocation,
                                as: "location",
                                attributes: ["id", "name", "address"],
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
                                        attributes: ["id", "name", "description", "price", "duration"],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });

            const result = vouchers.map((v) => {
                const plain = v.get({ plain: true });
                const imageLocation = plain.package?.location?.images?.[0]?.imageUrl || null;

                // Cleanup internal objects if preferred, or just add the field
                return {
                    ...plain,
                    imageLocation,
                };
            });

            return {
                status: true,
                message: "Vouchers fetched successfully",
                data: result,
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async claimVoucher(voucherCode, adminId) {
        const t = await sequelize.transaction();
        try {
            // 1. Get Admin's Location
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
                throw new Error("Admin not assigned to any location");
            }

            // 2. Find Voucher
            const voucher = await customerVoucher.findOne({
                where: { voucherCode },
                include: [
                    {
                        model: masterPackage,
                        as: "package",
                    },
                ],
            });

            if (!voucher) {
                throw new Error("Voucher not found");
            }

            if (voucher.status !== "ACTIVE") {
                throw new Error(`Voucher is already ${voucher.status}`);
            }

            // 3. Security Check: Admin location must match package location
            if (voucher.package.locationId !== userLocation.locationId) {
                throw new Error("Voucher cannot be claimed at this location");
            }

            // 4. Update Status
            await voucher.update({ status: "CLAIMED" }, { transaction: t });

            await t.commit();
            return {
                status: true,
                message: "Voucher claimed successfully",
                data: voucher,
            };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
        }
    },

    async checkVoucher(voucherCode, adminId) {
        try {
            // 1. Get Admin's Location
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
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
                                as: "location",
                                attributes: ["id", "name", "address"],
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
                                        attributes: ["id", "name", "description", "price", "duration"],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: masterCustomer,
                        as: "customer",
                        attributes: ["id", "name", "username", "email"],
                    }
                ],
            });

            if (!voucher) {
                throw new Error("Voucher not found");
            }

            const plainVoucher = voucher.get({ plain: true });
            const imageLocation = plainVoucher.package?.location?.images?.[0]?.imageUrl || null;

            if (plainVoucher.status !== "ACTIVE") {
                return {
                    status: false,
                    message: `Voucher is already ${plainVoucher.status}`,
                    data: { ...plainVoucher, imageLocation }
                };
            }

            // 3. Security Check: Admin location must match package location
            if (plainVoucher.package.locationId !== userLocation.locationId) {
                throw new Error("Voucher cannot be claimed at this location");
            }

            return {
                status: true,
                message: "Voucher is valid and claimable",
                data: {
                    ...plainVoucher,
                    imageLocation,
                },
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },


    async addPaymentMethod(data) {
        try {
            if (Array.isArray(data)) {
                await masterPaymentMethod.bulkCreate(data, {
                    updateOnDuplicate: ["name", "type", "isActive", "logoUrl"]
                });
            } else {
                await masterPaymentMethod.create(data);
            }
            return { status: true, message: "Payment method(s) added successfully" };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getOutletTransactions(adminId, { page = 1, pageSize = 10, search = "" }) {
        try {
            // 1. Get Admin's Location
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
                throw new Error("Admin not assigned to any location");
            }

            const limit = parseInt(pageSize);
            const offset = (page - 1) * limit;
            const whereClause = {
                locationId: userLocation.locationId,
            };

            if (search) {
                whereClause[Op.or] = [
                    { transactionNumber: { [Op.like]: `%${search}%` } },
                    { '$order.customer.name$': { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows } = await transaction.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: order,
                        as: "order",
                        required: !!search, // Order must exist and be joined for name search
                        include: [
                            {
                                model: masterCustomer,
                                as: "customer",
                                attributes: ["id", "name"],
                                required: !!search, // Customer must exist and be joined for name search
                            },
                            {
                                model: orderPayment,
                                as: "payments",
                                attributes: ["paymentMethod", "paymentStatus", "amount"],
                            }
                        ],
                    },
                    {
                        model: transactionItem,
                        as: "items",
                        attributes: ["itemName", "quantity", "totalPrice"],
                    }
                ],
                limit: limit,
                offset: offset,
                order: [["createdAt", "DESC"]],
                distinct: true,
                subQuery: false, // Avoid separate subquery for IDs to handle nested filters
            });

            return {
                status: true,
                message: "Transactions fetched successfully",
                data: rows,
                totalCount: count
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getCustomerTransactionHistory(customerId, { page = 1, pageSize = 10 }) {
        try {
            const limit = parseInt(pageSize);
            const offset = (page - 1) * limit;

            const { count, rows } = await transaction.findAndCountAll({
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { customerId },
                        include: [
                            {
                                model: orderPayment,
                                as: "payments",
                                attributes: ["paymentMethod", "paymentStatus", "amount"],
                            }
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
                                include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name"],
                            }
                        ]
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "name"],
                    }
                ],
                limit: limit,
                offset: offset,
                order: [["createdAt", "DESC"]],
                distinct: true,
                subQuery: false,
            });

            return {
                status: true,
                message: "Transaction history fetched successfully",
                data: rows,
                totalCount: count
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
                        model: orderPayment,
                        as: "payments",
                        attributes: ["paymentMethod", "paymentStatus", "amount", "checkoutUrl"],
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
                                        include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                                    },
                                    {
                                        model: masterPackage,
                                        as: "package",
                                        attributes: ["id", "name"],
                                    }
                                ]
                            },
                            {
                                model: masterLocation,
                                as: "location",
                                attributes: ["id", "name"]
                            }
                        ]
                    }
                ],
                limit: limit,
                offset: offset,
                order: [["createdAt", "DESC"]],
                distinct: true,
            });

            const processedRows = rows.map(o => {
                const plainOrder = o.get({ plain: true });
                return {
                    id: plainOrder.id,
                    orderNumber: plainOrder.orderNumber,
                    totalAmount: plainOrder.totalAmount,
                    paymentStatus: plainOrder.paymentStatus,
                    createdAt: plainOrder.createdAt,
                    payments: plainOrder.payments,
                    transactions: (plainOrder.transactions || []).map(trx => ({
                        id: trx.id,
                        transactionNumber: trx.transactionNumber,
                        orderStatus: trx.orderStatus,
                        locationName: trx.location?.name || null,
                        grandTotal: trx.grandTotal,
                        items: (trx.items || []).map(item => ({
                            itemName: item.itemName,
                            itemType: item.itemType,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            imageUrl: item.product?.images?.[0]?.imageUrl || null
                        }))
                    }))
                };
            });

            return {
                status: true,
                message: "Order history fetched successfully",
                data: processedRows,
                totalCount: count
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getCustomerPurchasedProducts(customerId, { page = 1, pageSize = 10 }) {
        try {
            const limit = parseInt(pageSize);
            const offset = (page - 1) * limit;

            const { count, rows } = await transaction.findAndCountAll({
                where: { orderStatus: "PAID" },
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { customerId },
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "name"],
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
                                        limit: 1
                                    }
                                ]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name", "price"],
                            }
                        ]
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
                    if (item.product && item.product.images && item.product.images.length > 0) {
                        imageUrl = item.product.images[0].imageUrl;
                    }

                    return {
                        title: item.itemName,
                        imageUrl: imageUrl,
                        productId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    };
                });

                return {
                    orderId: plainTrx.orderId,
                    transactionId: plainTrx.id,
                    status: plainTrx.orderStatus,
                    purchasedAt: plainTrx.updatedAt,
                    locationId: plainTrx.locationId,
                    locationName: plainTrx.location?.name,
                    items: items
                };
            });

            return {
                status: true,
                message: "Purchased products fetched successfully",
                data: processedRows,
                totalCount: count
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getCustomerCompletedTransactions(customerId, { page = 1, pageSize = 10 }) {
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
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "name"],
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
                                        limit: 1
                                    }
                                ]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name", "price"],
                            }
                        ]
                    },
                ],
                limit: limit,
                offset: offset,
                order: [["updatedAt", "DESC"]],
                distinct: true,
                subQuery: false,
            });

            const processedRows = await Promise.all(rows.map(async (trx) => {
                const plainTrx = trx.get({ plain: true });

                const items = await Promise.all(plainTrx.items.map(async (item) => {
                    const entityType = item.itemType === "PRODUCT" ? "PRODUCT" : "PACKAGE";
                    const entityId = item.itemId;

                    // Fetch user rating for this item
                    const itemRating = await Rating.findOne({
                        where: {
                            customerId,
                            entityType,
                            entityId
                        }
                    });

                    let imageUrl = null;
                    if (item.product && item.product.images && item.product.images.length > 0) {
                        imageUrl = item.product.images[0].imageUrl;
                    }

                    return {
                        title: item.itemName,
                        imageUrl: imageUrl,
                        productId: item.itemId,
                        rating: itemRating ? itemRating.rating : 0,
                        isRating: !!itemRating,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    };
                }));

                return {
                    orderId: plainTrx.orderId,
                    transactionId: plainTrx.id,
                    status: plainTrx.orderStatus,
                    completedAt: plainTrx.updatedAt,
                    locationId: plainTrx.locationId,
                    locationName: plainTrx.location?.name,
                    items: items
                };
            }));

            return {
                status: true,
                message: "Completed transactions fetched successfully",
                data: processedRows,
                totalCount: count
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
                                        include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                                    },
                                    {
                                        model: masterPackage,
                                        as: "package",
                                        attributes: ["id", "name"],
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: orderPayment,
                        as: "payments",
                        attributes: ["id", "paymentMethod", "paymentStatus", "amount", "checkoutUrl"],
                        limit: 1,
                    }
                ],
                limit: limit,
                offset: offset,
                order: [["createdAt", "DESC"]],
                distinct: true,
            });

            const processedRows = rows.map((o) => {
                const plainOrder = o.get({ plain: true });
                const latestPayment = plainOrder.payments?.[0] || null;

                const items = (plainOrder.transactions || []).flatMap(trx =>
                    (trx.items || []).map(item => {
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
                    })
                );

                return {
                    orderId: plainOrder.id,
                    orderNumber: plainOrder.orderNumber,
                    transactionId: plainOrder.transactions?.[0]?.id || null,
                    paymentStatus: plainOrder.paymentStatus,
                    totalAmount: plainOrder.totalAmount,
                    createdAt: plainOrder.createdAt,
                    paymentMethod: latestPayment?.paymentMethod || null,
                    checkoutUrl: latestPayment?.checkoutUrl || null,
                    items,
                };
            });

            return {
                status: true,
                message: "Unpaid orders fetched successfully",
                data: processedRows,
                totalCount: count
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getCustomerShippingTransactions(customerId, { page = 1, pageSize = 10 }) {
        try {
            const limit = parseInt(pageSize);
            const offset = (page - 1) * limit;

            // Image 4 "Dalam Pengiriman"
            const { count, rows } = await transaction.findAndCountAll({
                where: { orderStatus: "SHIPPED" },
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { customerId },
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
                                include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name"],
                            }
                        ]
                    }
                ],
                limit: limit,
                offset: offset,
                order: [["updatedAt", "DESC"]],
                distinct: true,
                subQuery: false,
            });

            return {
                status: true,
                message: "Shipping transactions fetched successfully",
                data: rows,
                totalCount: count
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
                                include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name", "price"],
                            }
                        ]
                    }
                ],
            });

            if (!trx) {
                throw new Error("Transaction not found");
            }

            // Security: Owner OR Admin of the outlet
            const isAdmin = await relationshipUserLocation.findOne({
                where: { userId: userId, locationId: trx.locationId, isactive: true }
            });

            if (trx.order.customerId !== userId && !isAdmin) {
                throw new Error("Unauthorized: You don't have access to this tracking detail");
            }

            // Timeline logic as seen in Image 5
            const timeline = [
                {
                    title: "Pesanan Dibuat",
                    description: "Kami telah menerima pesanan Anda",
                    time: trx.createdAt,
                    completed: true
                }
            ];

            // Paid
            if (trx.order.paymentStatus === "PAID" || ["SHIPPED", "DELIVERED", "COMPLETED"].includes(trx.orderStatus)) {
                timeline.push({
                    title: "Pembayaran Dikonfirmasi",
                    description: "Pembayaran telah berhasil dikonfirmasi",
                    time: trx.order.updatedAt,
                    completed: true
                });
            } else {
                timeline.push({
                    title: "Pembayaran Dikonfirmasi",
                    description: "Pembayaran belum dikonfirmasi",
                    time: null,
                    completed: false
                });
            }

            // Processed (Status PAID usually means it's being packed/prepared)
            if (["PAID", "SHIPPED", "DELIVERED", "COMPLETED"].includes(trx.orderStatus)) {
                timeline.push({
                    title: "Pesanan Diproses",
                    description: "Produk skincare sedang disiapkan oleh apoteker kami",
                    time: trx.updatedAt,
                    completed: true
                });
            } else {
                timeline.push({
                    title: "Pesanan Diproses",
                    description: "Akan segera diproses",
                    time: null,
                    completed: false
                });
            }

            // Ready to Ship
            timeline.push({
                title: "Siap Dikirim",
                description: "Pesanan sudah dikemas dan menunggu kurir",
                time: trx.orderStatus === "SHIPPED" || ["DELIVERED", "COMPLETED"].includes(trx.orderStatus) ? trx.updatedAt : null,
                completed: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(trx.orderStatus)
            });

            // In Shipping
            timeline.push({
                title: "Dalam Pengiriman",
                description: "Pesanan sedang dalam perjalanan ke lokasi Anda",
                time: trx.orderStatus === "SHIPPED" ? trx.updatedAt : null,
                completed: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(trx.orderStatus)
            });

            let trackingRealtime = null;
            if (trx.shipping?.trackingNumber) {
                try {
                    trackingRealtime = await rajaongkirService.trackWaybill(
                        trx.shipping.trackingNumber,
                        trx.shipping.courierCode
                    );
                } catch (e) {
                    console.error("Realtime Tracking Error:", e.message);
                }
            }

            return {
                status: true,
                message: "Order tracking detail fetched successfully",
                data: {
                    transaction: trx,
                    timeline,
                    trackingRealtime
                }
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
                                include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                            },
                            {
                                model: masterPackage,
                                as: "package",
                                attributes: ["id", "name", "price"],
                            }
                        ]
                    }
                ],
            });

            if (!trx) {
                throw new Error("Transaction not found");
            }

            // Security: Owner OR Admin of the outlet
            const isAdmin = await relationshipUserLocation.findOne({
                where: { userId: userId, locationId: trx.locationId, isactive: true }
            });

            if (trx.order.customerId !== userId && !isAdmin) {
                throw new Error("Unauthorized: You don't have access to this transaction detail");
            }

            return {
                status: true,
                message: "Transaction detail fetched successfully",
                data: trx
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async getOrderDetail(orderId, customerId) {
        try {
            const orderData = await order.findOne({
                where: { id: orderId, customerId },
                include: [
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
                                        include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"], limit: 1 }]
                                    },
                                    {
                                        model: masterPackage,
                                        as: "package",
                                        attributes: ["id", "name", "price"],
                                    }
                                ]
                            },
                            {
                                model: transactionShipping,
                                as: "shipping",
                            },
                            {
                                model: masterLocation,
                                as: "location",
                                attributes: ["id", "name", "address"],
                            }
                        ]
                    }
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
                createdAt: plainOrder.createdAt,
                payments: (plainOrder.payments || []).map(p => ({
                    paymentMethod: p.paymentMethod,
                    paymentStatus: p.paymentStatus,
                    amount: p.amount,
                    checkoutUrl: p.checkoutUrl,
                    instructions: p.instructions ? p.instructions.split("\n") : []
                })),
                transactions: (plainOrder.transactions || []).map(trx => ({
                    id: trx.id,
                    transactionNumber: trx.transactionNumber,
                    orderStatus: trx.orderStatus,
                    locationName: trx.location?.name || null,
                    locationAddress: trx.location?.address || null,
                    grandTotal: trx.grandTotal,
                    items: (trx.items || []).map(item => ({
                        itemName: item.itemName,
                        itemType: item.itemType,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        imageUrl: item.product?.images?.[0]?.imageUrl || null
                    })),
                    shipping: trx.shipping ? {
                        courierName: trx.shipping.courierName,
                        trackingNumber: trx.shipping.trackingNumber,
                        shippingAddress: trx.shipping.shippingAddress
                    } : null
                }))
            };

            return {
                status: true,
                message: "Order detail fetched successfully",
                data: processedData
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
                    { model: orderPayment, as: "payments" },
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
                remainingSeconds,
                instructions: latestPayment.instructions ? latestPayment.instructions.split("\n") : [],
                checkoutUrl: latestPayment.checkoutUrl,
            };

            // Extract specific IDs based on payment method
            if (gr.account_number) paymentDetail.accountNumber = gr.account_number;
            if (gr.bank_code) paymentDetail.bankCode = gr.bank_code;
            if (gr.qr_string) paymentDetail.qrString = gr.qr_string;

            return {
                status: true,
                message: "Payment detail fetched successfully",
                data: paymentDetail
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async exportTransactions(adminId, { startDate, endDate, format = 'excel' }) {
        try {
            const userLocation = await relationshipUserLocation.findOne({
                where: { userId: adminId, isactive: true },
            });

            if (!userLocation) {
                throw new Error("Admin not assigned to any location");
            }

            const whereClause = {
                locationId: userLocation.locationId,
            };

            if (startDate && endDate) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            const transactions = await transaction.findAll({
                where: whereClause,
                include: [
                    {
                        model: order,
                        as: "order",
                        include: [
                            {
                                model: masterCustomer,
                                as: "customer",
                                attributes: ["name"],
                            },
                        ],
                    },
                    {
                        model: transactionItem,
                        as: "items",
                        attributes: ["itemName", "quantity", "totalPrice"],
                    }
                ],
                order: [["createdAt", "DESC"]],
            });

            if (format === 'excel') {
                return await this._generateExcel(transactions);
            } else if (format === 'pdf') {
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
            const worksheet = workbook.addWorksheet('Transactions');

            worksheet.columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'Transaction Number', key: 'transactionNumber', width: 25 },
                { header: 'Customer Name', key: 'customerName', width: 25 },
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Items', key: 'items', width: 40 },
                { header: 'Grand Total', key: 'grandTotal', width: 15 },
                { header: 'Status', key: 'orderStatus', width: 15 },
            ];

            transactions.forEach((trx, index) => {
                const items = (trx.items || []).map(i => `${i.itemName} (x${i.quantity})`).join(', ');
                worksheet.addRow({
                    no: index + 1,
                    transactionNumber: trx.transactionNumber,
                    customerName: trx.order?.customer?.name || 'N/A',
                    date: trx.createdAt ? trx.createdAt.toISOString().split('T')[0] : 'N/A',
                    items: items,
                    grandTotal: trx.grandTotal,
                    orderStatus: trx.orderStatus,
                });
            });

            worksheet.getRow(1).font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            return { status: true, data: buffer, filename: `transactions_${Date.now()}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },

    async _generatePDF(transactions) {
        try {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 30, size: 'A4' });
                let buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    let pdfData = Buffer.concat(buffers);
                    resolve({ status: true, data: pdfData, filename: `transactions_${Date.now()}.pdf`, contentType: 'application/pdf' });
                });

                doc.fontSize(20).text('Transaction Report', { align: 'center' });
                doc.moveDown();

                const tableTop = 100;
                const colX = [30, 50, 180, 320, 420, 500];
                const headers = ['No', 'Trx Number', 'Customer', 'Date', 'Total', 'Status'];

                doc.fontSize(10).font('Helvetica-Bold');
                headers.forEach((h, i) => doc.text(h, colX[i], tableTop));

                doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

                let currentY = tableTop + 25;
                doc.font('Helvetica');

                transactions.forEach((trx, index) => {
                    if (currentY > 750) {
                        doc.addPage();
                        currentY = 50;
                    }

                    doc.text(index + 1, colX[0], currentY);
                    doc.text(trx.transactionNumber, colX[1], currentY);
                    doc.text(trx.order?.customer?.name || 'N/A', colX[2], currentY, { width: 130 });
                    doc.text(trx.createdAt ? trx.createdAt.toISOString().split('T')[0] : 'N/A', colX[3], currentY);
                    doc.text(trx.grandTotal ? trx.grandTotal.toLocaleString() : '0', colX[4], currentY);
                    doc.text(trx.orderStatus || 'N/A', colX[5], currentY);

                    currentY += 20;
                });

                doc.end();
            });
        } catch (error) {
            return { status: false, message: error.message };
        }
    },
};

