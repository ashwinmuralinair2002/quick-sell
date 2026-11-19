import express from 'express';
import {
    checkout,
    getMyOrders,
    getMySales,
    getOrderById
} from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All order routes are protected by authMiddleware
router.post('/checkout', authMiddleware, checkout);
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/my-sales', authMiddleware, getMySales);

// Registered after specific path routes to prevent route collision
router.get('/:id', authMiddleware, getOrderById);

export default router;
