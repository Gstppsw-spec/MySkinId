const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & Authorization
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register company admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: PT Maju Jaya
 *               email:
 *                 type: string
 *                 example: admin@majujaya.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Registrasi berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Registrasi berhasil
 *               data:
 *                 company:
 *                   id: 1
 *                   name: PT Maju Jaya
 *                 user:
 *                   id: 1
 *                   name: PT Maju Jaya
 *                   email: admin@majujaya.com
 *                   roleCode: COMPANY_ADMIN
 *       400:
 *         description: Email sudah terdaftar / Role tidak ditemukan
 *       500:
 *         description: Server error
 */
router.post("/register-company", authController.register);
router.post("/register-outlet", authController.registerAdminOutlet);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@majujaya.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login berhasil
 *               data:
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
 *                 user:
 *                   id: 1
 *                   name: PT Maju Jaya
 *                   email: admin@majujaya.com
 *                   phone: null
 *                   roleId: 1
 *                   roleCode: COMPANY_ADMIN
 *       401:
 *         description: Password salah / User tidak ditemukan
 *       500:
 *         description: Server error
 */
router.post("/login", authController.login);

module.exports = router;
