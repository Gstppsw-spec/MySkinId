const db = require('./src/models');
const transactionOrder = require('./src/services/transactionOrder');

async function verifyVoucherServices() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected');

        // 1. Find an active voucher with package items
        const voucher = await db.customerVoucher.findOne({
            where: { status: 'ACTIVE' },
            include: [{
                model: db.masterPackage,
                as: 'package',
                include: [{ model: db.masterPackageItems, as: 'items' }]
            }]
        });

        if (!voucher) {
            console.error('No active voucher found');
            process.exit(1);
        }

        console.log('Voucher Code:', voucher.voucherCode);

        // 2. Test getMyVouchers
        const myVouchersResult = await transactionOrder.getMyVouchers(voucher.customerId);
        const testVoucher = myVouchersResult.data.find(v => v.voucherCode === voucher.voucherCode);

        console.log('--- getMyVouchers Result ---');
        if (testVoucher && testVoucher.package.items && testVoucher.package.items.length > 0) {
            console.log('SUCCESS: Services found in getMyVouchers');
            console.log('Service Name:', testVoucher.package.items[0].service.name);
        } else {
            console.error('FAILURE: Services NOT found in getMyVouchers');
        }

        // 3. Find an admin for checkVoucher
        const userLocation = await db.relationshipUserLocation.findOne({
            where: { locationId: voucher.package.locationId, isactive: true }
        });

        if (userLocation) {
            const checkResult = await transactionOrder.checkVoucher(voucher.voucherCode, userLocation.userId);
            console.log('--- checkVoucher Result ---');
            if (checkResult.status && checkResult.data.package.items && checkResult.data.package.items.length > 0) {
                console.log('SUCCESS: Services found in checkVoucher');
            } else {
                console.error('FAILURE: Services NOT found in checkVoucher');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification Error:', error);
        process.exit(1);
    }
}

verifyVoucherServices();
