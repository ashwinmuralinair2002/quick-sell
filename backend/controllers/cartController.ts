import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// HELPER: Format cart items and calculate totals (Item count, Subtotal, 18% GST, Grand Total)
const calculateCartTotals = (populatedItems: any[]) => {
    let availableItemCount = 0;
    let subtotal = 0;

    const formattedItems = populatedItems
        .filter((item) => item !== null && typeof item === 'object')
        .map((product) => {
            const isAvailable = product.status === 'available';

            if (isAvailable && typeof product.price === 'number') {
                availableItemCount += 1;
                subtotal += product.price;
            }

            return {
                _id: product._id,
                title: product.title,
                description: product.description,
                price: product.price,
                category: product.category,
                subcategory: product.subcategory,
                images: product.images,
                seller: product.seller,
                status: product.status,
                isAvailable
            };
        });

    // 18% GST calculation rounded to 2 decimal places
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

    return {
        items: formattedItems,
        itemCount: availableItemCount,
        subtotal: Math.round(subtotal * 100) / 100,
        gstAmount,
        grandTotal
    };
};

// GET USER CART
export const getCart = async (
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

        // Find user cart and populate product details and seller name/email
        const cart = await Cart.findOne({ user: req.userId }).populate({
            path: 'items',
            populate: {
                path: 'seller',
                select: 'name email'
            }
        });

        // If no cart exists, return empty cart structure
        if (!cart) {
            res.status(200).json({
                items: [],
                itemCount: 0,
                subtotal: 0,
                gstAmount: 0,
                grandTotal: 0
            });
            return;
        }

        const cartData = calculateCartTotals(cart.items as any[]);

        res.status(200).json(cartData);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(500).json({
            message: errorMessage
        });
    }
};

// ADD PRODUCT TO CART
export const addToCart = async (
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

        const { productId } = req.body;

        // Validate productId
        if (typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                message: 'Invalid product ID'
            });
            return;
        }

        // Find product in database
        const product = await Product.findById(productId);

        if (!product) {
            res.status(404).json({
                message: 'Product not found'
            });
            return;
        }

        // Prevent users from adding their own listings
        if (product.seller.toString() === req.userId) {
            res.status(400).json({
                message: 'You cannot add your own product to the cart'
            });
            return;
        }

        // Prevent adding sold products
        if (product.status === 'sold') {
            res.status(400).json({
                message: 'Sold products cannot be added to the cart'
            });
            return;
        }

        // Find or create cart for user
        let cart = await Cart.findOne({ user: req.userId });

        if (!cart) {
            cart = new Cart({
                user: req.userId,
                items: []
            });
        }

        // Prevent duplicate items
        const isAlreadyInCart = cart.items.some(
            (item) => item.toString() === productId
        );

        if (isAlreadyInCart) {
            res.status(400).json({
                message: 'Product is already in your cart'
            });
            return;
        }

        // Add product reference to cart
        cart.items.push(new mongoose.Types.ObjectId(productId) as any);
        await cart.save();

        // Populate product and seller details to return updated cart
        await cart.populate({
            path: 'items',
            populate: {
                path: 'seller',
                select: 'name email'
            }
        });

        const cartData = calculateCartTotals(cart.items as any[]);

        res.status(200).json({
            message: 'Product added to cart successfully',
            ...cartData
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

// REMOVE PRODUCT FROM CART
export const removeFromCart = async (
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

        const { productId } = req.params;

        // Validate productId
        if (typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                message: 'Invalid product ID'
            });
            return;
        }

        // Find cart belonging to the user
        const cart = await Cart.findOne({ user: req.userId });

        if (!cart) {
            res.status(404).json({
                message: 'Cart not found'
            });
            return;
        }

        // Remove the product from the items array
        cart.items = cart.items.filter(
            (item) => item.toString() !== productId
        ) as any;

        await cart.save();

        // Populate items to calculate updated totals
        await cart.populate({
            path: 'items',
            populate: {
                path: 'seller',
                select: 'name email'
            }
        });

        const cartData = calculateCartTotals(cart.items as any[]);

        res.status(200).json({
            message: 'Product removed from cart successfully',
            ...cartData
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
