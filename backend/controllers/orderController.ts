import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Address from '../models/Address.js';

// PLACE ORDER / CHECKOUT (WITH MONGODB TRANSACTION)
export const checkout = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Check authenticated user
    if (!req.userId) {
        res.status(401).json({
            message: 'Authentication required'
        });
        return;
    }

    const { addressId } = req.body;

    // Validate addressId
    if (typeof addressId !== 'string' || !mongoose.Types.ObjectId.isValid(addressId)) {
        res.status(400).json({
            message: 'Invalid address ID'
        });
        return;
    }

    // Retrieve address and verify ownership
    const address = await Address.findById(addressId);

    if (!address) {
        res.status(404).json({
            message: 'Address not found'
        });
        return;
    }

    if (address.user.toString() !== req.userId) {
        res.status(403).json({
            message: 'You are not authorized to use this address'
        });
        return;
    }

    // Retrieve user's cart
    const cart = await Cart.findOne({ user: req.userId });

    if (!cart || cart.items.length === 0) {
        res.status(400).json({
            message: 'Your cart is empty'
        });
        return;
    }

    // Retrieve current product information from MongoDB
    const productIds = cart.items;
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
        res.status(400).json({
            message: 'Some products in your cart could not be found'
        });
        return;
    }

    // Validate availability and ownership
    let subtotal = 0;
    const orderItems: Array<{
        product: mongoose.Types.ObjectId;
        title: string;
        price: number;
        image: string;
        seller: mongoose.Types.ObjectId;
    }> = [];

    for (const product of products) {
        // Prevent purchasing own listing
        if (product.seller.toString() === req.userId) {
            res.status(400).json({
                message: `You cannot purchase your own listing: "${product.title}"`
            });
            return;
        }

        // Verify product availability
        if (product.status !== 'available') {
            res.status(400).json({
                message: `Product "${product.title}" is no longer available`
            });
            return;
        }

        subtotal += product.price;

        // Extract primary image URL
        let imageUrl = '';
        if (Array.isArray(product.images) && product.images.length > 0) {
            const firstImage = product.images[0] as any;
            if (typeof firstImage === 'string') {
                imageUrl = firstImage;
            } else if (firstImage && typeof firstImage.url === 'string') {
                imageUrl = firstImage.url;
            }
        }

        orderItems.push({
            product: product._id as mongoose.Types.ObjectId,
            title: product.title,
            price: product.price,
            image: imageUrl,
            seller: product.seller as mongoose.Types.ObjectId
        });
    }

    // Calculate totals
    const itemCount = orderItems.length;
    const gstRate = 0.18;
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const gstAmount = Math.round(roundedSubtotal * gstRate * 100) / 100;
    const grandTotal = Math.round((roundedSubtotal + gstAmount) * 100) / 100;

    // Start MongoDB session and transaction
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Create order snapshot
        const newOrders = await Order.create([{
            buyer: req.userId,
            items: orderItems,
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phone,
                addressLine: address.addressLine,
                landmark: address.landmark || '',
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            itemCount,
            subtotal: roundedSubtotal,
            gstRate,
            gstAmount,
            grandTotal,
            status: 'placed'
        }], { session });

        const createdOrder = newOrders[0];

        // Mark purchased products as sold
        await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: { status: 'sold' } },
            { session }
        );

        // Clear user's cart
        cart.items = [] as any;
        await cart.save({ session });

        // Commit transaction
        await session.commitTransaction();

        res.status(201).json({
            message: 'Order placed successfully',
            order: createdOrder
        });

    } catch (error: unknown) {
        // Abort transaction on any error
        await session.abortTransaction();

        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(500).json({
            message: errorMessage
        });
    } finally {
        session.endSession();
    }
};

// GET MY ORDERS (FOR BUYER)
export const getMyOrders = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Retrieve orders where the user is the buyer
        const orders = await Order.find({ buyer: req.userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            orders
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(500).json({
            message: errorMessage
        });
    }
};

// GET ORDER BY ID
export const getOrderById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        // Validate order ID
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                message: 'Invalid order ID'
            });
            return;
        }

        // Retrieve order and populate buyer and seller details (safe fields only)
        const order = await Order.findById(id)
            .populate('buyer', 'name email')
            .populate('items.seller', 'name email');

        if (!order) {
            res.status(404).json({
                message: 'Order not found'
            });
            return;
        }

        // Check authorization: must be either the buyer or one of the sellers
        const isBuyer = order.buyer._id
            ? order.buyer._id.toString() === req.userId
            : order.buyer.toString() === req.userId;

        const isSeller = order.items.some((item) => {
            const sellerId = item.seller && (item.seller as any)._id
                ? (item.seller as any)._id.toString()
                : item.seller.toString();
            return sellerId === req.userId;
        });

        if (!isBuyer && !isSeller) {
            res.status(403).json({
                message: 'You are not authorized to view this order'
            });
            return;
        }

        res.status(200).json({
            order
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(500).json({
            message: errorMessage
        });
    }
};

// GET MY SALES / SOLD LISTINGS (FOR SELLER)
export const getMySales = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Retrieve orders containing items sold by this user
        const orders = await Order.find({ 'items.seller': req.userId })
            .populate('buyer', 'name email')
            .sort({ createdAt: -1 });

        // Filter and format response so seller sees their sold items and shipping address for fulfillment
        const sales = orders.map((order) => {
            const soldItems = order.items.filter((item) => {
                const sellerId = item.seller && (item.seller as any)._id
                    ? (item.seller as any)._id.toString()
                    : item.seller.toString();
                return sellerId === req.userId;
            });

            return {
                _id: order._id,
                orderDate: order.createdAt,
                status: order.status,
                buyer: order.buyer,
                shippingAddress: order.shippingAddress,
                items: soldItems
            };
        });

        res.status(200).json({
            sales
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(500).json({
            message: errorMessage
        });
    }
};
