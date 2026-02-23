const { masterPaymentMethod } = require('./src/models');

const mockData = {
    "available_banks": [
        { "bank_code": "PERMATA", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "MANDIRI", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "MUAMALAT", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "CIMB", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "SAHABAT_SAMPOERNA", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BNI", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BSI", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BCA", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BNC", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BJB", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" },
        { "bank_code": "BRI", "bank_branch": "Virtual Account", "account_holder_name": "MYSKINID" }
    ],
    "available_ewallets": [
        { "ewallet_type": "OVO" },
        { "ewallet_type": "SHOPEEPAY" },
        { "ewallet_type": "NEXCASH" },
        { "ewallet_type": "DANA" },
        { "ewallet_type": "ASTRAPAY" },
        { "ewallet_type": "LINKAJA" },
        { "ewallet_type": "JENIUSPAY" },
        { "ewallet_type": "GOPAY" }
    ],
    "available_qr_codes": [
        { "qr_code_type": "QRIS" }
    ],
    "available_paylaters": [
        { "paylater_type": "KREDIVO" },
        { "paylater_type": "AKULAKU" },
        { "paylater_type": "ATOME" }
    ],
    "available_direct_debits": [
        { "direct_debit_type": "DD_BRI" },
        { "direct_debit_type": "DD_MANDIRI" }
    ],
    "available_retail_outlets": [
        { "retail_outlet_name": "ALFAMART" },
        { "retail_outlet_name": "INDOMARET" }
    ]
};

async function seed() {
    try {
        const payload = [];

        // Parse VAs
        for (let bank of mockData.available_banks) {
            payload.push({
                code: bank.bank_code,
                name: `${bank.bank_code} Virtual Account`,
                type: "VIRTUAL_ACCOUNT",
                isActive: true
            });
        }

        // Parse EWALLET
        for (let e of mockData.available_ewallets) {
            payload.push({
                code: e.ewallet_type,
                name: `${e.ewallet_type}`,
                type: "EWALLET",
                isActive: true
            });
        }

        // Parse QR
        for (let qr of mockData.available_qr_codes) {
            payload.push({
                code: qr.qr_code_type,
                name: qr.qr_code_type,
                type: "QR_CODE",
                isActive: true
            });
        }

        // Parse Paylater
        for (let pl of mockData.available_paylaters) {
            payload.push({
                code: pl.paylater_type,
                name: pl.paylater_type,
                type: "PAYLATER",
                isActive: true
            });
        }

        // Parse DD
        for (let dd of mockData.available_direct_debits) {
            payload.push({
                code: dd.direct_debit_type,
                name: dd.direct_debit_type,
                type: "DIRECT_DEBIT",
                isActive: true
            });
        }

        // Parse RETAIL
        for (let r of mockData.available_retail_outlets) {
            payload.push({
                code: r.retail_outlet_name,
                name: r.retail_outlet_name,
                type: "RETAIL_OUTLET",
                isActive: true
            });
        }

        await masterPaymentMethod.bulkCreate(payload);
        console.log("Seeding complete!");

    } catch (err) {
        console.error("Seeding Failed:", err);
    }
}

seed();
