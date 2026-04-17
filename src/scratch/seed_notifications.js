const { masterCompany, masterNotification, sequelize } = require('../models');

async function seed() {
  try {
    // 1. Ambil data real untuk referensi
    const { masterProduct, masterLocation, masterService, flashSale, masterNotification, sequelize } = require('../models');
    
    const product = await masterProduct.findOne();
    const location = await masterLocation.findOne();
    const service = await masterService.findOne();
    const sale = await flashSale.findOne();

    if (!location) {
      console.log('Error: Tidak ada data masterLocation. Buat minimal satu lokasi.');
      return;
    }

    const companyId = location.companyId;

    // Bersihkan data lama agar tidak duplikat
    await masterNotification.destroy({ where: { companyId } });

    console.log(`Menambahkan data real untuk Company ID: ${companyId}`);

    const notifications = [];

    if (product) {
      notifications.push({
        companyId,
        title: 'Produk Disetujui',
        body: `Produk '${product.name}' telah lolos verifikasi.`,
        category: 'Verification',
        type: 'VERIFICATION_APPROVED',
        referenceId: product.id,
        referenceType: 'product',
        isRead: false
      });
    }

    if (location) {
      notifications.push({
        companyId,
        title: 'Verifikasi Lokasi Diterima',
        body: `Lokasi '${location.name}' Anda sekarang sudah terverifikasi.`,
        category: 'Verification',
        type: 'VERIFICATION_APPROVED',
        referenceId: location.id,
        referenceType: 'location',
        isRead: false
      });
    }

    if (service) {
      notifications.push({
        companyId,
        title: 'Layanan Baru Terdaftar',
        body: `Layanan '${service.name}' berhasil diverifikasi.`,
        category: 'Verification',
        type: 'VERIFICATION_APPROVED',
        referenceId: service.id,
        referenceType: 'service',
        isRead: false
      });
    }

    if (sale) {
      notifications.push({
        companyId,
        title: 'Flash Sale: ' + sale.title,
        body: `Flash sale '${sale.title}' sedang berlangsung hari ini!`,
        category: 'Promotion',
        type: 'FLASH_SALE_DAILY',
        referenceId: sale.id,
        referenceType: 'flashSale',
        isRead: false
      });
    }

    if (notifications.length > 0) {
      await masterNotification.bulkCreate(notifications);
      console.log(`Berhasil menambahkan ${notifications.length} notifikasi yang terhubung ke data real.`);
    } else {
      console.log('Tidak ada data produk/layanan/sale untuk dikaitkan.');
    }
    
    await sequelize.close();
  } catch (err) {
    console.error('Seeding error:', err);
    // sequelize might not be defined if error happens early
  }
}

seed();
