"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS postMedia (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        postId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        mediaUrl VARCHAR(255) NOT NULL,
        mediaType ENUM('image','video') NOT NULL,
        orderIndex INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_postMedia_postId (postId),
        CONSTRAINT fk_postMedia_post FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("postMedia");
  },
};
