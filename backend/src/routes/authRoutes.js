const express = require("express");

const router = express.Router();

const {
  login
} = require("../controller/authController");

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login User
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login Successful
 *       401:
 *         description: Invalid Password
 *       400:
 *         description: User Not Found
 */

router.post(
  "/login",
  login
);

module.exports = router;