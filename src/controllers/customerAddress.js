const { customerAddress, masterCustomer, masterSubDistrict } = require("../models");
const response = require("../helpers/response");
const biteshipService = require("../services/biteship.service");

module.exports = {
    // 1. Get all addresses for a customer
    async getAll(req, res) {
        try {
            const customerId = req.user.id;
            const addresses = await customerAddress.findAll({
                where: { customerId },
                order: [
                    ['isPrimary', 'DESC'], // Primary address first
                    ['createdAt', 'DESC']
                ]
            });
            return response.success(res, "Addresses fetched successfully", addresses);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // 2. Get specific address by ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const customerId = req.user.id;

            const address = await customerAddress.findOne({
                where: { id, customerId }
            });

            if (!address) {
                return response.notFound(res, "Address not found");
            }

            return response.success(res, "Address fetched successfully", address);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // 3. Create a new address
    async create(req, res) {
        try {
            const customerId = req.user.id;
            const {
                label,
                receiverName,
                receiverPhone,
                address,
                province,
                city,
                district,
                subDistrict,
                cityId,
                districtId,
                postalCode,
                biteshipAreaId,
                latitude,
                longitude,
                isPrimary
            } = req.body;

            // if this is the first address, or explicitly requested as primary, make it primary
            // and unset others if needed
            let makePrimary = isPrimary || false;
            const existingCount = await customerAddress.count({ where: { customerId } });
            if (existingCount === 0) {
                makePrimary = true;
            }

            if (makePrimary) {
                await customerAddress.update({ isPrimary: false }, { where: { customerId } });
            }

            // 1. Resolve Biteship area ID logic
            let resolvedAreaId = biteshipAreaId || null;
            let finalPostalCode = postalCode;

            if (!resolvedAreaId) {
                // If postalCode is missing but we have subDistrict and districtId, 
                // try to find the local zipCode for better disambiguation
                if (!finalPostalCode && subDistrict && districtId) {
                    const localSubDist = await masterSubDistrict.findOne({
                        where: { name: subDistrict, districtId: districtId }
                    });
                    if (localSubDist && localSubDist.zipCode) {
                        finalPostalCode = localSubDist.zipCode;
                    }
                }

                // Try detailed lookup if subDistrict, district, and city are available
                if (subDistrict && district && city) {
                    const areaMatch = await biteshipService.getAreaByDetails(subDistrict, district, city, finalPostalCode);
                    if (areaMatch) {
                        resolvedAreaId = areaMatch.id;
                        finalPostalCode = finalPostalCode || areaMatch.postal_code;

                        // Back-fill local database with discovered zip code
                        if (subDistrict && districtId && areaMatch.postal_code) {
                            await masterSubDistrict.update(
                                { zipCode: String(areaMatch.postal_code) },
                                { where: { name: subDistrict, districtId, zipCode: null } }
                            ).catch(() => null); // Non-blocking
                        }
                    }
                }

                // Fallback to postal code search if still no ID
                if (!resolvedAreaId && finalPostalCode) {
                    resolvedAreaId = await biteshipService.resolveAreaId(finalPostalCode);
                }
            }

            const newAddress = await customerAddress.create({
                customerId,
                label,
                receiverName,
                receiverPhone,
                address,
                province,
                city,
                district,
                subDistrict,
                cityId,
                districtId,
                postalCode: finalPostalCode,
                latitude,
                longitude,
                biteshipAreaId: resolvedAreaId,
                isPrimary: makePrimary
            });

            return response.success(res, "Address created successfully", newAddress, 201);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // 4. Update an existing address
    async update(req, res) {
        try {
            const { id } = req.params;
            const customerId = req.user.id;
            const updateData = req.body;

            const addressToUpdate = await customerAddress.findOne({
                where: { id, customerId }
            });

            if (!addressToUpdate) {
                return response.notFound(res, "Address not found");
            }

            if (updateData.isPrimary === true && !addressToUpdate.isPrimary) {
                await customerAddress.update({ isPrimary: false }, { where: { customerId } });
            }

            // 1. Resolve Biteship area ID if updated
            const needsResolve = (updateData.subDistrict && updateData.subDistrict !== addressToUpdate.subDistrict) ||
                (updateData.postalCode && updateData.postalCode !== addressToUpdate.postalCode);

            if (needsResolve && !updateData.biteshipAreaId) {
                const subDist = updateData.subDistrict || addressToUpdate.subDistrict;
                const dist = updateData.district || addressToUpdate.district;
                const distId = updateData.districtId || addressToUpdate.districtId;
                const cty = updateData.city || addressToUpdate.city;
                let pCode = updateData.postalCode || addressToUpdate.postalCode;

                // Try to find zipCode if missing
                if (!pCode && subDist && distId) {
                    const localSubDist = await masterSubDistrict.findOne({
                        where: { name: subDist, districtId: distId }
                    });
                    if (localSubDist) pCode = localSubDist.zipCode;
                }

                if (subDist && dist && cty) {
                    const areaMatch = await biteshipService.getAreaByDetails(subDist, dist, cty, pCode);
                    if (areaMatch) {
                        updateData.biteshipAreaId = areaMatch.id;
                        updateData.postalCode = updateData.postalCode || areaMatch.postal_code;

                        // Back-fill local database
                        if (subDist && distId && areaMatch.postal_code) {
                            await masterSubDistrict.update(
                                { zipCode: String(areaMatch.postal_code) },
                                { where: { name: subDist, districtId: distId, zipCode: null } }
                            ).catch(() => null);
                        }
                    }
                }

                // Fallback to postal code
                if (!updateData.biteshipAreaId && pCode) {
                    updateData.biteshipAreaId = await biteshipService.resolveAreaId(pCode);
                }
            }

            await addressToUpdate.update(updateData);

            return response.success(res, "Address updated successfully", addressToUpdate);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // 5. Delete an address
    async delete(req, res) {
        try {
            const { id } = req.params;
            const customerId = req.user.id;

            const addressToDelete = await customerAddress.findOne({
                where: { id, customerId }
            });

            if (!addressToDelete) {
                return response.notFound(res, "Address not found");
            }

            await addressToDelete.destroy();

            // If we deleted the primary address, make the most recently created one primary if any exist
            if (addressToDelete.isPrimary) {
                const nextAddress = await customerAddress.findOne({
                    where: { customerId },
                    order: [['createdAt', 'DESC']]
                });

                if (nextAddress) {
                    await nextAddress.update({ isPrimary: true });
                }
            }

            return response.success(res, "Address deleted successfully");
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // 6. Set address as primary explicitly
    async setPrimary(req, res) {
        try {
            const { id } = req.params;
            const customerId = req.user.id;

            const address = await customerAddress.findOne({
                where: { id, customerId }
            });

            if (!address) {
                return response.notFound(res, "Address not found");
            }

            await customerAddress.update({ isPrimary: false }, { where: { customerId } });
            await address.update({ isPrimary: true });

            return response.success(res, "Primary address updated successfully", address);
        } catch (error) {
            return response.serverError(res, error);
        }
    }
};
