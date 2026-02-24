const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\1964\\Documents\\Project\\MySkinId\\MySkinId\\src\\services\\transactionOrder.js';
let content = fs.readFileSync(filePath, 'utf8');

const getCustomerTransactionsMethod = `
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
`;

// Find the last "}," and insert before the final "};"
const lastBraceIndex = content.lastIndexOf('};');
if (lastBraceIndex !== -1) {
    const newContent = content.slice(0, lastBraceIndex) + getCustomerTransactionsMethod + content.slice(lastBraceIndex);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully added getCustomerTransactions method to transactionOrder.js');
} else {
    console.error('Could not find the end of the module export.');
}
