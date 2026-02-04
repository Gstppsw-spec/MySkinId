"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS postCommentLikes (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        commentId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        userId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_comment_like (commentId, userId),
        KEY idx_postCommentLikes_commentId (commentId),
        CONSTRAINT fk_postCommentLikes_comment FOREIGN KEY (commentId) REFERENCES postComments(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_postCommentLikes_user FOREIGN KEY (userId) REFERENCES masterCustomer(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("postCommentLikes");
    },
};
