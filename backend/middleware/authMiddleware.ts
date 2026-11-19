
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// AUTHENTICATION MIDDLEWARE
const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        // Get authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                message: 'Access token required'
            });
            return;
        }

        // Extract token
        const token = authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({
                message: 'Invalid access token'
            });
            return;
        }

        const accessSecret = process.env.JWT_ACCESS_SECRET;

        if (!accessSecret) {
            res.status(500).json({
                message: 'Authentication configuration error'
            });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, accessSecret);

        if (
            typeof decoded === 'string' ||
            typeof decoded.userId !== 'string'
        ) {
            res.status(401).json({
                message: 'Invalid access token'
            });
            return;
        }

        // Attach user ID to request
        req.userId = decoded.userId;

        next();

    } catch (error: unknown) {
        res.status(401).json({
            message: 'Invalid or expired access token'
        });
    }
};

export default authMiddleware;
