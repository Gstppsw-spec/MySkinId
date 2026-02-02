"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        followerId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        followingId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_follow (followerId, followingId),
        CONSTRAINT fk_followers_follower FOREIGN KEY (followerId) REFERENCES masterCustomer(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_followers_following FOREIGN KEY (followingId) REFERENCES masterCustomer(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("followers");
  },
};
