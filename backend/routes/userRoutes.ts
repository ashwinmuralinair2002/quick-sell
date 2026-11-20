import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    verifyCurrentPassword,
    changePassword
} from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All user profile routes require authentication
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);
router.post('/verify-password', authMiddleware, verifyCurrentPassword);
router.put('/change-password', authMiddleware, changePassword);

export default router;
