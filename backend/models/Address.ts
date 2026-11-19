import mongoose from 'mongoose';

// ADDRESS SCHEMA
const addressSchema = new mongoose.Schema({
    // User reference
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Full name of the recipient
    fullName: {
        type: String,
        required: true,
        trim: true
    },

    // Contact phone number
    phone: {
        type: String,
        required: true,
        trim: true
    },

    // Address line (street address, house/flat number)
    addressLine: {
        type: String,
        required: true,
        trim: true
    },

    // Landmark (optional)
    landmark: {
        type: String,
        trim: true,
        default: ''
    },

    // City
    city: {
        type: String,
        required: true,
        trim: true
    },

    // State
    state: {
        type: String,
        required: true,
        trim: true
    },

    // Postal code (Pincode)
    pincode: {
        type: String,
        required: true,
        trim: true
    },

    // Default address flag
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// CREATE ADDRESS MODEL
const Address = mongoose.model('Address', addressSchema);

export default Address;
