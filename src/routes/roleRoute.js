const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateJWT } = require("../middlewares/authMiddleware");

router.get('/v1', authenticateJWT, roleController.getRoleByUserId);
router.get('/', authenticateJWT, roleController.getAllRoles);
router.get('/:id', authenticateJWT, roleController.getRoleById);
router.post('/', authenticateJWT, roleController.createRole);
router.put('/:id', authenticateJWT, roleController.updateRole);
router.delete('/:id', authenticateJWT, roleController.deleteRole);

module.exports = router;    
