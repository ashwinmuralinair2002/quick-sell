import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

// GET USER PROFILE
export const getUserProfile = async (
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

        // Find user by ID (omit password and refreshTokenHash)
        const user = await User.findById(req.userId).select('-password -refreshTokenHash');

        if (!user) {
            res.status(404).json({
                message: 'User not found'
            });
            return;
        }

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
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

// UPDATE USER PROFILE
export const updateUserProfile = async (
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

        const { name } = req.body;

        // Validate name field
        if (!name || typeof name !== 'string' || name.trim() === '') {
            res.status(400).json({
                message: 'Name is required'
            });
            return;
        }

        // Find user
        const user = await User.findById(req.userId);

        if (!user) {
            res.status(404).json({
                message: 'User not found'
            });
            return;
        }

        // Only allow updating name
        user.name = name.trim();
        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
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

// VERIFY CURRENT PASSWORD
export const verifyCurrentPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        const { currentPassword } = req.body;

        if (!currentPassword || typeof currentPassword !== 'string') {
            res.status(400).json({
                message: 'Current password is required'
            });
            return;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            res.status(404).json({
                message: 'User not found'
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {
            res.status(400).json({
                message: 'Incorrect current password'
            });
            return;
        }

        res.status(200).json({
            message: 'Current password verified'
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

// CHANGE PASSWORD
export const changePassword = async (
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

        const { currentPassword, newPassword } = req.body;

        // Validate inputs
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                message: 'Current password and new password are required'
            });
            return;
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            res.status(400).json({
                message: 'New password must be at least 8 characters long'
            });
            return;
        }

        // Find user
        const user = await User.findById(req.userId);

        if (!user) {
            res.status(404).json({
                message: 'User not found'
            });
            return;
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {
            res.status(400).json({
                message: 'Incorrect current password'
            });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and invalidate refresh token hash
        user.password = hashedPassword;
        user.refreshTokenHash = null;
        await user.save();

        // Clear refresh token cookie if present
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth'
        });

        res.status(200).json({
            message: 'Password changed successfully'
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
