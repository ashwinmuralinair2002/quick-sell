import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Address from '../models/Address.js';

// GET ALL ADDRESSES FOR LOGGED-IN USER
export const getAddresses = async (
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

        // Fetch addresses belonging to the user, sorted default first, then newest
        const addresses = await Address.find({ user: req.userId })
            .sort({ isDefault: -1, createdAt: -1 });

        res.status(200).json({
            addresses
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

// ADD ADDRESS
export const addAddress = async (
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

        const {
            fullName,
            phone,
            addressLine,
            landmark,
            city,
            state,
            pincode,
            isDefault
        } = req.body;

        // Check required fields
        if (
            !fullName ||
            !phone ||
            !addressLine ||
            !city ||
            !state ||
            !pincode
        ) {
            res.status(400).json({
                message: 'fullName, phone, addressLine, city, state, and pincode are required'
            });
            return;
        }

        // Check how many addresses the user already has
        const existingAddressCount = await Address.countDocuments({ user: req.userId });

        // If it's the user's first address, automatically make it default
        let shouldBeDefault = false;
        if (existingAddressCount === 0) {
            shouldBeDefault = true;
        } else if (isDefault === true) {
            shouldBeDefault = true;
        }

        // If this address is default, unset isDefault on user's other addresses
        if (shouldBeDefault && existingAddressCount > 0) {
            await Address.updateMany(
                { user: req.userId },
                { isDefault: false }
            );
        }

        // Create new address
        const newAddress = await Address.create({
            user: req.userId,
            fullName: fullName.trim(),
            phone: phone.trim(),
            addressLine: addressLine.trim(),
            landmark: landmark ? landmark.trim() : '',
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            isDefault: shouldBeDefault
        });

        res.status(201).json({
            message: 'Address added successfully',
            address: newAddress
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(400).json({
            message: errorMessage
        });
    }
};

// UPDATE ADDRESS
export const updateAddress = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Validate MongoDB ObjectId
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                message: 'Invalid address ID'
            });
            return;
        }

        // Find address
        const address = await Address.findById(id);

        if (!address) {
            res.status(404).json({
                message: 'Address not found'
            });
            return;
        }

        // Check ownership: ensure authenticated user owns this address
        if (address.user.toString() !== req.userId) {
            res.status(403).json({
                message: 'You are not authorized to update this address'
            });
            return;
        }

        const {
            fullName,
            phone,
            addressLine,
            landmark,
            city,
            state,
            pincode,
            isDefault
        } = req.body;

        // If marked as default, unset default on other addresses
        if (isDefault === true) {
            await Address.updateMany(
                { user: req.userId, _id: { $ne: address._id } },
                { isDefault: false }
            );
            address.isDefault = true;
        } else if (isDefault === false && address.isDefault) {
            // If user unsets default, keep it if it's their only address
            const totalCount = await Address.countDocuments({ user: req.userId });
            if (totalCount > 1) {
                address.isDefault = false;
            }
        }

        // Update fields if provided
        if (fullName !== undefined) address.fullName = fullName.trim();
        if (phone !== undefined) address.phone = phone.trim();
        if (addressLine !== undefined) address.addressLine = addressLine.trim();
        if (landmark !== undefined) address.landmark = landmark.trim();
        if (city !== undefined) address.city = city.trim();
        if (state !== undefined) address.state = state.trim();
        if (pincode !== undefined) address.pincode = pincode.trim();

        await address.save();

        res.status(200).json({
            message: 'Address updated successfully',
            address
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        res.status(400).json({
            message: errorMessage
        });
    }
};

// DELETE ADDRESS
export const deleteAddress = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Validate MongoDB ObjectId
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                message: 'Invalid address ID'
            });
            return;
        }

        // Find address
        const address = await Address.findById(id);

        if (!address) {
            res.status(404).json({
                message: 'Address not found'
            });
            return;
        }

        // Check ownership
        if (address.user.toString() !== req.userId) {
            res.status(403).json({
                message: 'You are not authorized to delete this address'
            });
            return;
        }

        const wasDefault = address.isDefault;

        // Delete address
        await Address.findByIdAndDelete(id);

        // If the deleted address was default, set another existing address as default
        if (wasDefault) {
            const nextAddress = await Address.findOne({ user: req.userId }).sort({ createdAt: -1 });
            if (nextAddress) {
                nextAddress.isDefault = true;
                await nextAddress.save();
            }
        }

        res.status(200).json({
            message: 'Address deleted successfully'
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

// SET DEFAULT ADDRESS
export const setDefaultAddress = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        // Check authenticated user
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Validate MongoDB ObjectId
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                message: 'Invalid address ID'
            });
            return;
        }

        // Find address
        const address = await Address.findById(id);

        if (!address) {
            res.status(404).json({
                message: 'Address not found'
            });
            return;
        }

        // Check ownership
        if (address.user.toString() !== req.userId) {
            res.status(403).json({
                message: 'You are not authorized to update this address'
            });
            return;
        }

        // Unset default on all other addresses belonging to user
        await Address.updateMany(
            { user: req.userId },
            { isDefault: false }
        );

        // Set this address as default
        address.isDefault = true;
        await address.save();

        res.status(200).json({
            message: 'Default address updated successfully',
            address
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
