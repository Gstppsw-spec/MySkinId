const { flashSale, flashSaleItem, masterProduct, masterPackage, masterLocation } = require('../models');
const { nanoid } = require('nanoid');

async function seed() {
    try {
        console.log('🌱 Seeding Flash Sale V4 (Quota System)...');

        // 0. Clear existing data
        console.log('🧹 Clearing old flash sale data...');
        await flashSaleItem.destroy({ where: {}, truncate: false });
        await flashSale.destroy({ where: {}, truncate: false });

        // 1. Get some outlets
        const locations = await masterLocation.findAll({ limit: 2, attributes: ['id', 'name'] });
        if (locations.length < 2) throw new Error('Need at least 2 locations in DB');

        const [loc1, loc2] = locations;

        // 2. Get some products & packages
        const products = await masterProduct.findAll({ limit: 4 });
        const packages = await masterPackage.findAll({ limit: 2 });

        // 3. Create Flash Sale Events (Now without maxItemPerOutlet)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const dayAfter = new Date(now);
        dayAfter.setDate(now.getDate() + 2);
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);

        // a. ACTIVE Flash Sale
        const fsActive = await flashSale.create({
            title: 'Ramadan Flash Sale (Active)',
            startDate: yesterday,
            endDate: tomorrow,
            status: 'ACTIVE'
        });

        // b. UPCOMING Flash Sale
        const fsUpcoming = await flashSale.create({
            title: 'Gajian Sale (Upcoming)',
            startDate: tomorrow,
            endDate: dayAfter,
            status: 'UPCOMING'
        });

        // 4. Register Items to ACTIVE Flash Sale (V4 uses 'quota')
        const itemsToRegister = [];

        // Outlet 1 registers 3 products
        for (let i = 0; i < 3; i++) {
            if (products[i]) {
                itemsToRegister.push({
                    flashSaleId: fsActive.id,
                    locationId: loc1.id,
                    itemType: 'PRODUCT',
                    productId: products[i].id,
                    flashPrice: 50000 + (i * 10000),
                    quota: 50,
                    sold: 0
                });
            }
        }

        // Outlet 2 registers 1 package
        if (packages[0]) {
            itemsToRegister.push({
                flashSaleId: fsActive.id,
                locationId: loc2.id,
                itemType: 'PACKAGE',
                packageId: packages[0].id,
                flashPrice: 150000,
                quota: 20,
                sold: 0
            });
        }

        await flashSaleItem.bulkCreate(itemsToRegister);

        console.log(`✅ Flash Sale V4 Seeding Success!`);
        console.log(`🔥 Event ACTIVE: ${fsActive.title} (ID: ${fsActive.id})`);
        console.log(`📦 Registered ${itemsToRegister.length} items to active event.`);

    } catch (error) {
        console.error('❌ Error Seeding:', error);
    } finally {
        process.exit();
    }
}

seed();
