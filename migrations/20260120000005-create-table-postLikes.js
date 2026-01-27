"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS postLikes (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        postId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        userId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_like (postId, userId),
        KEY idx_postLikes_postId (postId),
        CONSTRAINT fk_postLikes_post FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_postLikes_user FOREIGN KEY (userId) REFERENCES masterCustomer(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("postLikes");
  },
};
