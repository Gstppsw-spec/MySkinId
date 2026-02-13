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
    sequelize,
} = require("../models");
const { nanoid } = require("nanoid");
const axios = require("axios");

module.exports = {
    async _createXenditInvoice(orderNumber, amount, customerEmail) {
        try {
            const secretKey = process.env.XENDIT_SECRET_KEY;
            const authHeader = Buffer.from(secretKey + ":").toString("base64");

            // Set expiry to 10 minutes (600 seconds)
            const response = await axios.post(
                "https://api.xendit.co/v2/invoices",
                {
                    external_id: orderNumber,
                    amount: amount,
                    payer_email: customerEmail || "customer@myskinid.com",
                    description: `Payment for Order ${orderNumber}`,
                    invoice_duration: 600, // 10 minutes in seconds
                    currency: "IDR"
                },
                {
                    headers: {
                        Authorization: `Basic ${authHeader}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error("Xendit Invoice Error:", error.response ? error.response.data : error.message);
            throw new Error("Failed to create Xendit Invoice");
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

                itemsByLocation[locationId].push({
                    itemType: type,
                    itemId: actualItem.id,
                    itemName: actualItem.name,
                    quantity: item.qty,
                    unitPrice: unitPrice,
                    discountAmount: discountAmount * item.qty,
                    totalPrice: totalPrice,
                    isShippingRequired: type === "product",
                    locationId: locationId,
                });

                totalOrderAmount += totalPrice;
            }

            if (shippingOptions && Array.isArray(shippingOptions)) {
                for (const opt of shippingOptions) {
                    totalOrderAmount += parseFloat(opt.shippingCost || 0);
                }
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
                const shippingOpt = shippingOptions ? shippingOptions.find((opt) => opt.locationId === locationId) : null;

                const subTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
                const shippingFee = shippingOpt ? parseFloat(shippingOpt.shippingCost) : 0;
                const grandTotal = subTotal + shippingFee;

                const newTransaction = await transaction.create(
                    {
                        orderId: newOrder.id,
                        transactionNumber: `TRX-${nanoid(10).toUpperCase()}`,
                        locationId: locationId,
                        subTotal: subTotal,
                        shippingFee: shippingFee,
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
                                status: "ACTIVE",
                            },
                            { transaction: t }
                        );
                    }
                }

                if (shippingOpt) {
                    await transactionShipping.create(
                        {
                            transactionId: newTransaction.id,
                            receiverName: shippingOpt.receiverName,
                            receiverPhone: shippingOpt.receiverPhone,
                            address: shippingOpt.address,
                            originCityId: shippingOpt.originCityId || 0,
                            destinationCityId: shippingOpt.destinationCityId,
                            totalWeight: shippingOpt.totalWeight || 1000,
                            courierCode: shippingOpt.courierCode,
                            courierService: shippingOpt.courierService,
                            shippingCost: shippingFee,
                        },
                        { transaction: t }
                    );
                }
            }

            // 6. Create Xendit Invoice
            const customer = await masterCustomer.findByPk(customerId);
            const xenditInvoice = await this._createXenditInvoice(newOrder.orderNumber, totalOrderAmount, customer ? customer.email : null);

            // 7. Create Payment Record with Xendit data
            await orderPayment.create(
                {
                    orderId: newOrder.id,
                    paymentMethod: paymentMethod,
                    amount: totalOrderAmount,
                    paymentStatus: "PENDING",
                    referenceNumber: xenditInvoice.id,
                    gatewayResponse: xenditInvoice,
                },
                { transaction: t }
            );

            await customerCart.destroy({
                where: { customerId, isSelected: true },
                transaction: t,
            });

            await t.commit();
            return {
                status: true,
                message: "Checkout successful",
                data: {
                    ...newOrder.toJSON(),
                    paymentUrl: xenditInvoice.invoice_url
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

                itemsByLocation[locationId].push({
                    itemType: item.type,
                    itemId: actualItem.id,
                    itemName: actualItem.name,
                    quantity: item.qty,
                    unitPrice: unitPrice,
                    discountAmount: discountAmount * item.qty,
                    totalPrice: totalPrice,
                    isShippingRequired: item.type === "product",
                    locationId: locationId,
                });

                totalOrderAmount += totalPrice;
            }

            if (shippingOptions && Array.isArray(shippingOptions)) {
                for (const opt of shippingOptions) {
                    totalOrderAmount += parseFloat(opt.shippingCost || 0);
                }
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
                const shippingOpt = shippingOptions ? shippingOptions.find((opt) => opt.locationId === locationId) : null;

                const subTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
                const shippingFee = shippingOpt ? parseFloat(shippingOpt.shippingCost) : 0;
                const grandTotal = subTotal + shippingFee;

                const newTransaction = await transaction.create(
                    {
                        orderId: newOrder.id,
                        transactionNumber: `TRX-${nanoid(10).toUpperCase()}`,
                        locationId: locationId,
                        subTotal: subTotal,
                        shippingFee: shippingFee,
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
                                status: "ACTIVE",
                            },
                            { transaction: t }
                        );
                    }
                }

                if (shippingOpt) {
                    await transactionShipping.create(
                        {
                            transactionId: newTransaction.id,
                            receiverName: shippingOpt.receiverName,
                            receiverPhone: shippingOpt.receiverPhone,
                            address: shippingOpt.address,
                            originCityId: shippingOpt.originCityId || 0,
                            destinationCityId: shippingOpt.destinationCityId,
                            totalWeight: shippingOpt.totalWeight || 1000,
                            courierCode: shippingOpt.courierCode,
                            courierService: shippingOpt.courierService,
                            shippingCost: shippingFee,
                        },
                        { transaction: t }
                    );
                }
            }

            // Create Xendit Invoice
            const customer = await masterCustomer.findByPk(customerId);
            const xenditInvoice = await this._createXenditInvoice(newOrder.orderNumber, totalOrderAmount, customer ? customer.email : null);

            await orderPayment.create(
                {
                    orderId: newOrder.id,
                    paymentMethod: paymentMethod,
                    amount: totalOrderAmount,
                    paymentStatus: "PENDING",
                    referenceNumber: xenditInvoice.id,
                    gatewayResponse: xenditInvoice,
                },
                { transaction: t }
            );

            await t.commit();
            return {
                status: true,
                message: "Direct checkout successful",
                data: {
                    ...newOrder.toJSON(),
                    paymentUrl: xenditInvoice.invoice_url
                }
            };
        } catch (error) {
            await t.rollback();
            return { status: false, message: error.message };
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
                const canCancel = orderData.transactions.every((trx) => trx.orderStatus === "CREATED");
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

            const { external_id, status, paid_at, payment_method, payment_channel } = payload;

            if (status === "PAID") {
                const orderData = await order.findOne({
                    where: { orderNumber: external_id },
                    include: [{ model: transaction, as: "transactions" }],
                });

                if (!orderData) {
                    throw new Error(`Order ${external_id} not found`);
                }

                if (orderData.paymentStatus !== "PAID") {
                    await orderData.update({ paymentStatus: "PAID" }, { transaction: t });

                    // Update all transactions in this order to PAID
                    for (const trx of orderData.transactions) {
                        await trx.update({ orderStatus: "PAID" }, { transaction: t });
                    }

                    // Update payment record with detailed info
                    await orderPayment.update(
                        {
                            paymentStatus: "SUCCESS",
                            paymentDate: paid_at ? new Date(paid_at) : new Date(),
                            paymentMethod: `${payment_method} (${payment_channel})`,
                            gatewayResponse: payload // Save the full rich payload for audit
                        },
                        { where: { orderId: orderData.id }, transaction: t }
                    );
                }
            } else if (status === "EXPIRED") {
                const orderData = await order.findOne({
                    where: { orderNumber: external_id },
                    include: [{ model: transaction, as: "transactions" }],
                });

                if (orderData && orderData.paymentStatus === "UNPAID") {
                    await orderData.update({ paymentStatus: "EXPIRED" }, { transaction: t });
                    for (const trx of orderData.transactions) {
                        await trx.update({ orderStatus: "CANCELLED" }, { transaction: t });
                    }
                    await orderPayment.update(
                        { paymentStatus: "FAILED" },
                        { where: { orderId: orderData.id }, transaction: t }
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
};
