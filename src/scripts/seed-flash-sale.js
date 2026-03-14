/**
 * Seed script: Membuat data dummy flash sale
 * Jalankan: node src/scripts/seed-flash-sale.js
 */
const db = require("../models");

(async () => {
  try {
    // 1. Ambil location & product yang ada
    const locations = await db.masterLocation.findAll({
      attributes: ["id", "name"],
      limit: 2,
      raw: true,
    });

    if (locations.length === 0) {
      console.log("❌ Tidak ada location di database. Buat location dulu.");
      process.exit(1);
    }

    const products = await db.masterProduct.findAll({
      attributes: ["id", "name", "price", "locationId"],
      raw: true,
    });

    if (products.length === 0) {
      console.log("❌ Tidak ada product di database. Buat product dulu.");
      process.exit(1);
    }

    console.log(`📍 Locations: ${locations.map((l) => l.name).join(", ")}`);
    console.log(`📦 Products: ${products.length} items`);

    // 2. Hapus data dummy lama (jika ada)
    await db.flashSaleItem.destroy({ where: {} });
    await db.flashSale.destroy({ where: {} });
    console.log("🗑️  Data flash sale lama dihapus");

    const now = new Date();

    // 3. Flash Sale 1 — ACTIVE (sedang berlangsung, 24 jam)
    const fs1Start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 jam lalu
    const fs1End = new Date(now.getTime() + 22 * 60 * 60 * 1000); // 22 jam lagi

    const flashSale1 = await db.flashSale.create({
      locationId: locations[0].id,
      title: "Flash Sale Spesial Weekend",
      startDate: fs1Start,
      endDate: fs1End,
      status: "ACTIVE",
    });
    console.log(`✅ Flash Sale 1 (ACTIVE): ${flashSale1.title}`);

    // Ambil produk milik location pertama, atau fallback ke produk manapun
    const prodsLoc1 = products.filter((p) => p.locationId === locations[0].id);
    const itemsForFs1 = prodsLoc1.length > 0 ? prodsLoc1.slice(0, 3) : products.slice(0, 3);

    for (const prod of itemsForFs1) {
      const originalPrice = parseFloat(prod.price);
      const flashPrice = Math.round(originalPrice * 0.5); // diskon 50%
      await db.flashSaleItem.create({
        flashSaleId: flashSale1.id,
        productId: prod.id,
        flashPrice,
        stock: 50,
        sold: Math.floor(Math.random() * 20),
      });
      console.log(`   📦 ${prod.name}: Rp ${originalPrice} → Rp ${flashPrice}`);
    }

    // 4. Flash Sale 2 — UPCOMING (akan datang, besok)
    const fs2Start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // besok
    const fs2End = new Date(now.getTime() + 48 * 60 * 60 * 1000); // lusa

    const loc2 = locations.length > 1 ? locations[1] : locations[0];
    const flashSale2 = await db.flashSale.create({
      locationId: loc2.id,
      title: "Promo Gajian Akhir Bulan",
      startDate: fs2Start,
      endDate: fs2End,
      status: "UPCOMING",
    });
    console.log(`✅ Flash Sale 2 (UPCOMING): ${flashSale2.title}`);

    const prodsLoc2 = products.filter((p) => p.locationId === loc2.id);
    const itemsForFs2 = prodsLoc2.length > 0 ? prodsLoc2.slice(0, 2) : products.slice(0, 2);

    for (const prod of itemsForFs2) {
      const originalPrice = parseFloat(prod.price);
      const flashPrice = Math.round(originalPrice * 0.7); // diskon 30%
      await db.flashSaleItem.create({
        flashSaleId: flashSale2.id,
        productId: prod.id,
        flashPrice,
        stock: 30,
        sold: 0,
      });
      console.log(`   📦 ${prod.name}: Rp ${originalPrice} → Rp ${flashPrice}`);
    }

    // 5. Flash Sale 3 — ENDED (sudah berakhir)
    const fs3Start = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 hari lalu
    const fs3End = new Date(now.getTime() - 24 * 60 * 60 * 1000); // kemarin

    const flashSale3 = await db.flashSale.create({
      locationId: locations[0].id,
      title: "Diskon Hari Kemerdekaan",
      startDate: fs3Start,
      endDate: fs3End,
      status: "ENDED",
    });
    console.log(`✅ Flash Sale 3 (ENDED): ${flashSale3.title}`);

    const itemsForFs3 = products.slice(0, 2);
    for (const prod of itemsForFs3) {
      const originalPrice = parseFloat(prod.price);
      const flashPrice = Math.round(originalPrice * 0.6); // diskon 40%
      await db.flashSaleItem.create({
        flashSaleId: flashSale3.id,
        productId: prod.id,
        flashPrice,
        stock: 100,
        sold: 100, // habis terjual
      });
      console.log(`   📦 ${prod.name}: Rp ${originalPrice} → Rp ${flashPrice} (SOLD OUT)`);
    }

    console.log("\n🎉 Selesai! 3 flash sale dummy berhasil dibuat.");
    console.log("   - 1x ACTIVE  (sedang berlangsung)");
    console.log("   - 1x UPCOMING (akan datang)");
    console.log("   - 1x ENDED   (sudah berakhir)");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
