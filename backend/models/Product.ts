import mongoose from 'mongoose';

// PRODUCT CATEGORIES AND SUBCATEGORIES
export const PRODUCT_CATEGORIES = {
    Mobiles: [
        'Smartphones',
        'Tablets',
        'Feature Phones'
    ],

    Wearables: [
        'Smartwatches',
        'Fitness Bands',
        'Smart Rings'
    ],

    Audio: [
        'Headphones',
        'Earbuds',
        'Speakers',
        'Microphones'
    ],

    Computers: [
        'Laptops',
        'Desktops',
        'Monitors',
        'PC Components'
    ],

    Accessories: [
        'Keyboards',
        'Mice',
        'Chargers & Cables',
        'Storage Devices',
        'Adapters & Hubs'
    ],

    Cameras: [
        'DSLR Cameras',
        'Mirrorless Cameras',
        'Action Cameras',
        'Camera Lenses'
    ]
} as const;

// IMAGE SCHEMA (FOR URL AND PUBLIC ID)
const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    public_id: {
        type: String,
        required: true
    }
}, { _id: false });

// PRODUCT SCHEMA
const productSchema = new mongoose.Schema({

    // Product title
    title: {
        type: String,
        required: true,
        trim: true
    },

    // Product description
    description: {
        type: String,
        required: true,
        trim: true
    },

    // Product price
    price: {
        type: Number,
        required: true,
        min: 1
    },

    // Main category
    category: {
        type: String,
        required: true,
        enum: Object.keys(PRODUCT_CATEGORIES)
    },

    // Subcategory
    subcategory: {
        type: String,
        required: true,
        validate: {
            validator: function (this: { category: string }, value: string) {
                const subcategories =
                    PRODUCT_CATEGORIES[
                        this.category as keyof typeof PRODUCT_CATEGORIES
                    ];

                return subcategories?.includes(
                    value as never
                ) ?? false;
            },
            message: 'Invalid subcategory for the selected category'
        }
    },

    // Product images with Cloudinary url and public_id
    images: {
        type: [imageSchema],
        required: true,
        validate: {
            validator: (images: { url: string; public_id: string }[]) => images.length >= 2,
            message: 'At least two product images are required'
        }
    },

    // Seller reference
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Product availability
    status: {
        type: String,
        enum: ['available', 'sold'],
        default: 'available'
    }

}, {
    timestamps: true
});

// CREATE PRODUCT MODEL
const Product = mongoose.model('Product', productSchema);

export default Product;
