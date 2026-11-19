import mongoose from 'mongoose';

// ORDER ITEM SNAPSHOT SCHEMA
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false });

// SHIPPING ADDRESS SNAPSHOT SCHEMA
const shippingAddressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    addressLine: {
        type: String,
        required: true
    },
    landmark: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    }
}, { _id: false });

// ORDER SCHEMA
const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true
    },
    shippingAddress: {
        type: shippingAddressSchema,
        required: true
    },
    itemCount: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    gstRate: {
        type: Number,
        required: true,
        default: 0.18
    },
    gstAmount: {
        type: Number,
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'placed'
    }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
