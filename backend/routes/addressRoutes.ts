import express from 'express';
import {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../controllers/addressController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All address routes are protected by authMiddleware
router.get('/', authMiddleware, getAddresses);
router.post('/', authMiddleware, addAddress);
router.put('/:id', authMiddleware, updateAddress);
router.delete('/:id', authMiddleware, deleteAddress);
router.patch('/:id/default', authMiddleware, setDefaultAddress);

export default router;
