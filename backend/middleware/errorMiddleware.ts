import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';
import multer from 'multer';

// 404 NOT FOUND HANDLER
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};

// CENTRALIZED ERROR HANDLING MIDDLEWARE (4 parameters signature)
export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';

    // 1. Custom Application Error (Operational)
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // 2. Mongoose / MongoDB CastError (Invalid ObjectId)
    else if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }
    // 3. Mongoose Validation Error
    else if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        const messages = Object.values(err.errors).map((e) => e.message);
        message = messages.join(', ') || 'Validation error';
    }
    // 4. MongoDB Duplicate Key Error (E11000)
    else if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000) {
        statusCode = 409;
        const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern;
        const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }
    // 5. JWT Errors
    else if (typeof err === 'object' && err !== null && 'name' in err) {
        const errorName = (err as { name: unknown }).name;
        if (errorName === 'JsonWebTokenError') {
            statusCode = 401;
            message = 'Invalid or expired access token';
        } else if (errorName === 'TokenExpiredError') {
            statusCode = 401;
            message = 'Access token has expired';
        }
    }

    // 6. Multer File Upload Errors
    if (err instanceof multer.MulterError) {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size too large. Maximum size is 5MB.';
        } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Too many files uploaded or unexpected file field.';
        } else {
            message = err.message;
        }
    }

    // 7. General HTTP / Express / custom errors with a status/statusCode property
    if (statusCode === 500 && typeof err === 'object' && err !== null) {
        const potentialStatus = (err as { statusCode?: unknown; status?: unknown }).statusCode ||
                                (err as { statusCode?: unknown; status?: unknown }).status;
        if (typeof potentialStatus === 'number' && potentialStatus >= 400 && potentialStatus < 600) {
            statusCode = potentialStatus;
            if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
                message = (err as { message: string }).message;
            }
        }
    }

    // Fallback: If status is still 500, log error details safely on server
    if (statusCode === 500) {
        console.error('Unhandled Server Error:', err);
        // In non-production, you might expose message for debugging, but prevent leaking stack / DB internals in prod
        if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
            message = err.message || 'Internal server error';
        } else {
            message = 'Internal server error. Please try again later.';
        }
    }

    res.status(statusCode).json({
        message
    });
};

export default errorHandler;
