import mongoose from 'mongoose';

// CART SCHEMA
const cartSchema = new mongoose.Schema({
    // User reference (unique: one cart per user)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // Array of product references (no quantity, each item appears once)
    items: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        }
    ]
}, {
    timestamps: true
});

// CREATE CART MODEL
const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
