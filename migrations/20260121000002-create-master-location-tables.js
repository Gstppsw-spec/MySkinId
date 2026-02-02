'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // masterProvince
        await queryInterface.createTable('masterProvince', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: true // User didn't specify not null, but usually names are required. Based on user prompt "name VARCHAR(100)", I'll stick to simple defaults but allow null true matches existing patterns if not specified? Wait, masterRole had allowNull: false for name. Let's assume allowNull: true based on minimal spec, OR safer to make it AllowNull: true unless strict. Actually, for master tables name usually is required. I'll make it allowNull: true to be safe with user's loose spec, or better yet match masterRole. masterRole has allowNull: false. User's SQL didn't specify NOT NULL. I will assume allowNull: true only because user didn't say otherwise, BUT standard practice is name is required. I'll stick to allowNull: true to be safe against errors if they want to insert partial data, but practically it should be false. Let's look at the user request again.
                // "name VARCHAR(100)" - standard SQL implies nullable unless NOT NULL is said.
                // However, I'll use allowNull: true to be consistent with "default" behavior if not specified.
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // masterCity
        await queryInterface.createTable('masterCity', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            provinceId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'masterProvince',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // masterDistrict
        await queryInterface.createTable('masterDistrict', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            cityId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'masterCity',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('masterDistrict');
        await queryInterface.dropTable('masterCity');
        await queryInterface.dropTable('masterProvince');
    }
};
