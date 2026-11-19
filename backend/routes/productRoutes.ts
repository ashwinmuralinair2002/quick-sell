import express from 'express';
import {
    createProduct,
    getAllProducts,
    getMyListings,
    getProductById,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);

// Protected routes (placed before /:id so "my-listings" is not parsed as an id)
router.get('/my-listings', authMiddleware, getMyListings);

// Public route for specific product
router.get('/:id', getProductById);

// Protected routes (require authentication)
router.post('/', authMiddleware, upload.array('images', 5), createProduct);
router.put('/:id', authMiddleware, upload.array('images', 5), updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

export default router;
