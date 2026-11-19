
import type { Request, Response } from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { createHash } from 'node:crypto';

// JWT PAYLOAD TYPE
interface TokenPayload extends JwtPayload {
    userId: string;
}

// REGISTER USER
export const registerUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, email, password } = req.body as {
            name?: string;
            email?: string;
            password?: string;
        };

        // Check required fields
        if (!name || !email || !password) {
            res.status(400).json({
                message: 'All fields are required'
            });
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            res.status(409).json({
                message: 'Email already registered'
            });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error: unknown) {
        console.error('Registration Error:', error);

        res.status(500).json({
            message: 'Registration failed'
        });
    }
};


// LOGIN USER
export const loginUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { email, password } = req.body as {
            email?: string;
            password?: string;
        };

        // Check required fields
        if (!email || !password) {
            res.status(400).json({
                message: 'Email and password are required'
            });
            return;
        }

        // Check JWT secret
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets are missing');
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            res.status(401).json({
                message: 'Invalid email or password'
            });
            return;
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            res.status(401).json({
                message: 'Invalid email or password'
            });
            return;
        }

        const userId = user._id.toString();

        // Generate access token
        const accessToken = jwt.sign(
            { userId },
            accessSecret,
            { expiresIn: '1d' }
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            { userId },
            refreshSecret,
            { expiresIn: '7d' }
        );

        // Hash refresh token
        const refreshTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // Store refresh token hash
        user.refreshTokenHash = refreshTokenHash;
        await user.save();

        // Send refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/auth'
        });

        // Send response
        res.status(200).json({
            message: 'Login successful',
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error: unknown) {
        console.error('Login Error:', error);

        res.status(500).json({
            message: 'Login failed'
        });
    }
};


// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken || typeof refreshToken !== 'string') {
            res.status(401).json({
                message: 'Refresh token missing'
            });
            return;
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        const accessSecret = process.env.JWT_ACCESS_SECRET;

        if (!refreshSecret || !accessSecret) {
            throw new Error('JWT secrets are missing');
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken,
            refreshSecret
        );

        if (
            typeof decoded === 'string' ||
            typeof decoded.userId !== 'string'
        ) {
            res.status(401).json({
                message: 'Invalid refresh token'
            });
            return;
        }

        const tokenPayload = decoded as TokenPayload;

        // Find user
        const user = await User.findById(tokenPayload.userId);

        if (!user || !user.refreshTokenHash) {
            res.status(401).json({
                message: 'Invalid refresh token'
            });
            return;
        }

        // Compare stored hash
        const refreshTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        if (user.refreshTokenHash !== refreshTokenHash) {
            res.status(401).json({
                message: 'Invalid refresh token'
            });
            return;
        }

        const userId = user._id.toString();

        // Generate new access token
        const accessToken = jwt.sign(
            { userId },
            accessSecret,
            { expiresIn: '1d' }
        );

        // Rotate refresh token
        const newRefreshToken = jwt.sign(
            { userId },
            refreshSecret,
            { expiresIn: '7d' }
        );

        user.refreshTokenHash = createHash('sha256')
            .update(newRefreshToken)
            .digest('hex');

        await user.save();

        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/auth'
        });

        res.status(200).json({
            message: 'Token refreshed successfully',
            accessToken
        });

    } catch (error: unknown) {
        res.status(401).json({
            message: 'Invalid or expired refresh token'
        });
    }
};


// LOGOUT USER
export const logoutUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken && typeof refreshToken === 'string') {
            try {
                const refreshSecret = process.env.JWT_REFRESH_SECRET;

                if (refreshSecret) {
                    const decoded = jwt.verify(
                        refreshToken,
                        refreshSecret
                    );

                    if (
                        typeof decoded !== 'string' &&
                        typeof decoded.userId === 'string'
                    ) {
                        const user = await User.findById(decoded.userId);

                        if (user) {
                            user.refreshTokenHash = null;
                            await user.save();
                        }
                    }
                }
            } catch (error: unknown) {
                // Invalid or expired refresh token
            }
        }

        // Clear refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth'
        });

        res.status(200).json({
            message: 'Logout successful'
        });

    } catch (error: unknown) {
        console.error('Logout Error:', error);

        res.status(500).json({
            message: 'Logout failed'
        });
    }
};
