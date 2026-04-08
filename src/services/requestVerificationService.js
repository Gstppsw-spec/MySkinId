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
                },
            });

            if (checkRequest) {
                if (checkRequest.status === "rejected") {
                    // Update existing rejected request to pending
                    checkRequest.status = "pending";
                    checkRequest.note = note || checkRequest.note;
                    await checkRequest.save();
                    return {
                        status: true,
                        message: "Request updated to pending",
                        data: checkRequest,
                    };
                }

                return {
                    status: false,
                    message: "Request sudah ada",
                    data: null,
                };
            }

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

    async list(status, type, pagination = {}, name = null) {
        try {
            const { limit, offset } = pagination;
            const allowedType = ["location", "company", "product", "service", "package"];
            const { Op } = require("sequelize");

            const where = {};
            if (status) where.status = status;

            let include = [];
            const nameFilter = name ? { name: { [Op.like]: `%${name}%` } } : null;

            if (type && allowedType.includes(type)) {
                where.refferenceType = type;
                const modelInclude = {
                    location: { model: masterLocation, as: "location" },
                    company: { model: masterCompany, as: "company" },
                    product: { model: masterProduct, as: "product" },
                    service: { model: masterService, as: "service" },
                    package: { model: masterPackage, as: "package" }
                }[type];

                if (nameFilter) {
                    modelInclude.where = nameFilter;
                    modelInclude.required = true;
                }
                include.push(modelInclude);
            } else if (type && !allowedType.includes(type)) {
                return {
                    status: false,
                    message: "Type tidak valid",
                    data: null,
                };
            } else {
                // If no type filter, include all.
                // If name filter is present, it's harder to filter across different polymorphic relations in one query with Sequelize's findAndCountAll and required includes.
                // For simplicity, we'll apply the filter to each and if name is provided, we'll use an OR logic if possible, or just filter each include.
                // Actually, a common way is to use subqueries or a more manual approach.
                // But let's try to add the where to each include and see if anything matches.

                include = [
                    { model: masterLocation, as: "location", ...(nameFilter && { where: nameFilter, required: false }) },
                    { model: masterCompany, as: "company", ...(nameFilter && { where: nameFilter, required: false }) },
                    { model: masterProduct, as: "product", ...(nameFilter && { where: nameFilter, required: false }) },
                    { model: masterService, as: "service", ...(nameFilter && { where: nameFilter, required: false }) },
                    { model: masterPackage, as: "package", ...(nameFilter && { where: nameFilter, required: false }) },
                ];

                if (nameFilter) {
                    where[Op.or] = [
                        { "$location.name$": { [Op.like]: `%${name}%` } },
                        { "$company.name$": { [Op.like]: `%${name}%` } },
                        { "$product.name$": { [Op.like]: `%${name}%` } },
                        { "$service.name$": { [Op.like]: `%${name}%` } },
                        { "$package.name$": { [Op.like]: `%${name}%` } },
                    ];
                }
            }

            const { count: totalCount, rows: requests } = await requestVerification.findAndCountAll({
                where,
                include,
                order: [["createdAt", "DESC"]],
                subQuery: false,
                distinct: true,
            });

            // Filter out requests where the associated entity is null (soft-deleted)
            const filteredRequests = requests.filter((req) => {
                const entity = req.company || req.location || req.product || req.service || req.package;
                return entity !== null && entity !== undefined;
            });

            // If we are using pagination, the count might be slightly off due to JS filtering
            // but for a small number of deletions it's usually acceptable.
            // For a perfect count, we would need a more complex SQL query with Op.or on each association existence.
            
            return {
                status: true,
                message: "List request verification",
                data: filteredRequests.slice(0, limit || filteredRequests.length),
                totalCount: filteredRequests.length,
            };
        } catch (error) {
            console.error("List Request Verification Error:", error);
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