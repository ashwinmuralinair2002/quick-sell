import express from 'express';
import {
    getCart,
    addToCart,
    removeFromCart
} from '../controllers/cartController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require authentication
router.get('/', authMiddleware, getCart);
router.post('/items', authMiddleware, addToCart);
router.delete('/items/:productId', authMiddleware, removeFromCart);

export default router;
