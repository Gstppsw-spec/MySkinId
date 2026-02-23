const { customerAddress, masterCustomer } = require("../models");
const response = require("../helpers/response");

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
                cityId,
                districtId,
                postalCode,
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

            const newAddress = await customerAddress.create({
                customerId,
                label,
                receiverName,
                receiverPhone,
                address,
                province,
                city,
                district,
                cityId,
                districtId,
                postalCode,
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
