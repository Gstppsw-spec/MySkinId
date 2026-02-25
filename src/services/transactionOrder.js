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
    sequelize,
} = require("../models");
const { nanoid } = require("nanoid");
const axios = require("axios");
const rajaongkirService = require("./rajaongkir.service");
const socketInstance = require("../socket/socketInstance");
const { schedulePaymentTimeout, cancelPaymentTimeout } = require("../utils/paymentTimeout");

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
                            ewallet: {
                                channel_code: paymentMethodCode.startsWith("ID_")
                                    ? paymentMethodCode
                                    : `ID_${paymentMethodCode}`,

                                channel_properties: {
                                    mobile_number: formattedPhone || "+6281234567890",
                                    success_redirect_url: process.env.FRONTEND_URL
                                        ? `${process.env.FRONTEND_URL}/payment/success`
                                        : "https://myskinid.com/payment/success",
                                    failure_redirect_url: process.env.FRONTEND_URL
                                        ? `${process.env.FRONTEND_URL}/payment/failure`
                                        : "https://myskinid.com/payment/failure"
                                }
                            }
                        },

                        callback_url: `${process.env.BACKEND_URL || "https://api.myskinid.com"
                            }/api/v2/transaction/order/callback/xendit`
                    },
                    {
                        headers: {
                            Authorization: `Basic ${authHeader}`
                        }
                    }
                );

                let checkoutUrl = null;
                if (response.data.actions) {
                    const desktopWeb = response.data.actions.find(a => a.url_type === "DESKTOP_WEB");
                    const mobileWeb = response.data.actions.find(a => a.url_type === "MOBILE_WEB");
                    const appDeeplink = response.data.actions.find(a => a.url_type === "DEEPLINK");
                    checkoutUrl = appDeeplink ? appDeeplink.url : (mobileWeb ? mobileWeb.url : (desktopWeb ? desktopWeb.url : null));
                }

                return {
                    paymentType: "EWALLET",
                    id: response.data.id,
                    referenceId: response.data.reference_id,
                    channelCode: response.data.channel_code,
                    chargeAmount: response.data.charge_amount,
                    checkoutUrl: checkoutUrl,
                    rawPayload: response.data
                };
            } else if (paymentType === "QR_CODE") {
                // QR Code (QRIS)
                const response = await axios.post(
                    "https://api.xendit.co/qr_codes",
                    {
                        external_id: orderNumber,
                        type: "DYNAMIC",
                        callback_url: `${process.env.BACKEND_URL || 'https://api.myskinid.com'}/api/v2/transaction/order/xendit-callback`,
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
                            destinationId: calcInfo.destinationId,
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
                        console.log(`RajaOngkir DEBUG (${shippingOpt.courierCode}): Origin=${location.cityId}, Dest=${destinationId}, Weight=${totalWeight}`);
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
                            destinationId: calcInfo.destinationId,
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

            return { status: true, message: "Status found", data: orderData };
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
            if (payload.event && payload.event.startsWith("ewallet.")) {
                // E-Wallet Charge Callback
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
                _external_id = payload.external_id;
                _status = payload.status;
                _payment_channel = payload.payment_channel;
            }

            if (!_external_id) {
                throw new Error("Missing reference/external ID in callback");
            }

            if (_status === "PAID" || _status === "COMPLETED" || _status === "SETTLED") {
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

    async updateTransactionToShipped(transactionId, merchantId) {
        const t = await sequelize.transaction();
        try {
            const trx = await transaction.findOne({
                where: { id: transactionId },
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { paymentStatus: "PAID" }
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "merchantId"]
                    }
                ]
            });

            if (!trx) {
                throw new Error("Transaction not found or order not paid");
            }

            // Verify merchant owns this location
            if (trx.location.merchantId !== merchantId) {
                throw new Error("Unauthorized: You don't own this transaction");
            }

            // Can only ship items that are PAID
            if (trx.orderStatus !== "PAID") {
                throw new Error(`Cannot ship transaction with status ${trx.orderStatus}`);
            }

            await trx.update({ orderStatus: "SHIPPED" }, { transaction: t });

            await t.commit();
            return { status: true, message: "Transaction marked as shipped" };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
        }
    },

    async updateTransactionToDelivered(transactionId, merchantId) {
        const t = await sequelize.transaction();
        try {
            const trx = await transaction.findOne({
                where: { id: transactionId },
                include: [
                    {
                        model: order,
                        as: "order",
                        where: { paymentStatus: "PAID" }
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "merchantId"]
                    }
                ]
            });

            if (!trx) {
                throw new Error("Transaction not found or order not paid");
            }

            // Verify merchant owns this location
            if (trx.location.merchantId !== merchantId) {
                throw new Error("Unauthorized: You don't own this transaction");
            }

            // Can only mark as delivered if already shipped
            if (trx.orderStatus !== "SHIPPED") {
                throw new Error(`Cannot deliver transaction with status ${trx.orderStatus}. Must be SHIPPED first.`);
            }

            await trx.update({ orderStatus: "DELIVERED" }, { transaction: t });

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

            return {
                status: true,
                message: "Vouchers fetched successfully",
                data: vouchers,
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

            if (voucher.status !== "ACTIVE") {
                return {
                    status: false,
                    message: `Voucher is already ${voucher.status}`,
                    data: voucher
                };
            }

            // 3. Security Check: Admin location must match package location
            if (voucher.package.locationId !== userLocation.locationId) {
                throw new Error("Voucher cannot be claimed at this location");
            }

            return {
                status: true,
                message: "Voucher is valid and claimable",
                data: voucher,
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

    async getCustomerTransactions(customerId, { page = 1, pageSize = 10 }) {
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
                    },
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "name", "address"],
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
                message: "Transactions fetched successfully",
                data: rows,
                totalCount: count
            };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },
};
