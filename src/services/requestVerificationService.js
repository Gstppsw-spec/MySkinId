const {
    requestVerification,
    masterLocation,
    masterCompany,
    masterProduct,
    masterService,
    masterPackage,
} = require("../models");

class RequestVerificationService {
    async create(data) {
        try {
            const { refferenceId, refferenceType, note } = data;

            const allowedTypes = ["location", "company", "product", "service", "package"];

            if (!allowedTypes.includes(refferenceType)) {
                return {
                    status: false,
                    message: "Reference type tidak valid",
                    data: null,
                };
            }

            if (refferenceType === "location") {
                const location = await masterLocation.findByPk(refferenceId);
                if (!location)
                    return {
                        status: false,
                        message: "Location tidak ditemukan",
                        data: null,
                    };
            } else if (refferenceType === "company") {
                const company = await masterCompany.findByPk(refferenceId);
                if (!company)
                    return {
                        status: false,
                        message: "Company tidak ditemukan",
                        data: null,
                    };
            } else if (refferenceType === "product") {
                const product = await masterProduct.findByPk(refferenceId);
                if (!product)
                    return {
                        status: false,
                        message: "Product tidak ditemukan",
                        data: null,
                    };
            } else if (refferenceType === "service") {
                const service = await masterService.findByPk(refferenceId);
                if (!service)
                    return {
                        status: false,
                        message: "Service tidak ditemukan",
                        data: null,
                    };
            } else if (refferenceType === "package") {
                const paket = await masterPackage.findByPk(refferenceId);
                if (!paket)
                    return {
                        status: false,
                        message: "Package tidak ditemukan",
                        data: null,
                    };
            }

            const checkRequest = await requestVerification.findOne({
                where: {
                    refferenceId,
                    refferenceType,
                    status: ["pending", "approved"],
                },
            });

            if (checkRequest)
                return {
                    status: false,
                    message: "Request sudah ada",
                    data: null,
                };

            const result = await requestVerification.create({
                refferenceId,
                refferenceType,
                note,
                status: "pending",
            });
            return { status: true, data: result };
        } catch (error) {
            return { status: false, message: error.message };
        }
    }

    async list(status) {
        try {
            const where = {};
            if (status) where.status = status;

            const requests = await requestVerification.findAll({
                where,
                order: [["createdAt", "DESC"]],
            });

            return {
                status: true,
                message: "List request verification",
                data: requests,
            };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }

    async detail(id) {
        try {
            const request = await requestVerification.findByPk(id);

            if (!request)
                return {
                    status: false,
                    message: "Belum ada request ditemukan",
                    data: null,
                };

            return { status: true, message: "Request ditemukan", data: request };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }

    async update(id, data) {
        try {
            const request = await requestVerification.findByPk(id);

            if (!request)
                return {
                    status: false,
                    message: "Belum ada request ditemukan",
                    data: null,
                };

            request.status = data.status != undefined ? data.status : request.status;
            request.note = data.note != undefined ? data.note : request.note;

            if (data.status === "approved") {
                if (request.refferenceType === "location") {
                    const location = await masterLocation.findByPk(request.refferenceId);
                    location.isVerified = true;
                    location.verifiedDate = new Date();
                    await location.save();
                } else if (request.refferenceType === "company") {
                    const company = await masterCompany.findByPk(request.refferenceId);
                    company.isVerified = true;
                    company.verifiedDate = new Date();
                    await company.save();
                } else if (request.refferenceType === "product") {
                    const product = await masterProduct.findByPk(request.refferenceId);
                    product.isVerified = true;
                    product.verifiedDate = new Date();
                    await product.save();
                } else if (request.refferenceType === "service") {
                    const service = await masterService.findByPk(request.refferenceId);
                    service.isVerified = true;
                    service.verifiedDate = new Date();
                    await service.save();
                } else if (request.refferenceType === "package") {
                    const paket = await masterPackage.findByPk(request.refferenceId);
                    paket.isVerified = true;
                    paket.verifiedDate = new Date();
                    await paket.save();
                } else {
                    return {
                        status: false,
                        message: "Refference type tidak valid",
                        data: null,
                    };
                }
            } else if (data.status === "rejected") {
                if (request.refferenceType === "location") {
                    const location = await masterLocation.findByPk(request.refferenceId);
                    location.isVerified = false;
                    location.verifiedDate = null;
                    await location.save();
                } else if (request.refferenceType === "company") {
                    const company = await masterCompany.findByPk(request.refferenceId);
                    company.isVerified = false;
                    company.verifiedDate = null;
                    await company.save();
                } else if (request.refferenceType === "product") {
                    const product = await masterProduct.findByPk(request.refferenceId);
                    product.isVerified = false;
                    product.verifiedDate = null;
                    await product.save();
                } else if (request.refferenceType === "service") {
                    const service = await masterService.findByPk(request.refferenceId);
                    service.isVerified = false;
                    service.verifiedDate = null;
                    await service.save();
                } else if (request.refferenceType === "package") {
                    const paket = await masterPackage.findByPk(request.refferenceId);
                    paket.isVerified = false;
                    paket.verifiedDate = null;
                    await paket.save();
                } else {
                    return {
                        status: false,
                        message: "Refference type tidak valid",
                        data: null,
                    };
                }
            }

            await request.save();
            return { status: true, message: "Request updated", data: request };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }
}

module.exports = new RequestVerificationService();