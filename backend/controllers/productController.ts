import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product, { PRODUCT_CATEGORIES } from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';

// HELPER: Upload image buffer to Cloudinary
const uploadToCloudinary = (
    fileBuffer: Buffer,
    folder: string = 'quicksell/products'
): Promise<{ url: string; public_id: string }> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Cloudinary upload failed'));
                } else {
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id
                    });
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// HELPER: Delete image from Cloudinary
const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Failed to delete Cloudinary image: ${publicId}`, error);
    }
};

// CREATE PRODUCT
export const createProduct = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const {
            title,
            description,
            price,
            category,
            subcategory
        } = req.body;

        // Check required fields
        if (
            !title ||
            !description ||
            !price ||
            !category ||
            !subcategory
        ) {
            res.status(400).json({
                message: 'All product fields are required'
            });
            return;
        }

        // Check authenticated seller
        if (!req.userId) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Check uploaded files from Multer
        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || !Array.isArray(files) || files.length < 2) {
            res.status(400).json({
                message: 'At least two product images are required'
            });
            return;
        }

        // Upload images to Cloudinary
        const uploadedImages: { url: string; public_id: string }[] = [];

        for (const file of files) {
            const uploaded = await uploadToCloudinary(file.buffer);
            uploadedImages.push(uploaded);
        }

        // Create product with uploaded Cloudinary images
        const product = await Product.create({
            title,
            description,
            price,
            category,
            subcategory,
            images: uploadedImages,
            seller: req.userId
        });

        res.status(201).json({
            message: 'Product created successfully',
            product
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

// GET ALL PRODUCTS (SEARCH, FILTERING, SORTING, PAGINATION)
export const getAllProducts = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const {
            category,
            subcategory,
            search,
            minPrice,
            maxPrice,
            sort,
            page,
            limit
        } = req.query;

        // Base filter: only show available products
        const filter: {
            status: 'available';
            category?: string;
            subcategory?: string;
            $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
            price?: {
                $gte?: number;
                $lte?: number;
            };
        } = {
            status: 'available'
        };

        // Category filter
        if (typeof category === 'string' && category.trim() !== '') {
            filter.category = category.trim();
        }

        // Subcategory filter
        if (typeof subcategory === 'string' && subcategory.trim() !== '') {
            filter.subcategory = subcategory.trim();
        }

        // Search in title and description (case-insensitive regex)
        if (typeof search === 'string' && search.trim() !== '') {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex }
            ];
        }

        // Price filtering validation & logic
        let parsedMinPrice: number | undefined;
        let parsedMaxPrice: number | undefined;

        if (typeof minPrice === 'string' && minPrice.trim() !== '') {
            const minNum = Number(minPrice);
            if (Number.isNaN(minNum) || minNum < 0) {
                res.status(400).json({
                    message: 'minPrice must be a valid non-negative number'
                });
                return;
            }
            parsedMinPrice = minNum;
        }

        if (typeof maxPrice === 'string' && maxPrice.trim() !== '') {
            const maxNum = Number(maxPrice);
            if (Number.isNaN(maxNum) || maxNum < 0) {
                res.status(400).json({
                    message: 'maxPrice must be a valid non-negative number'
                });
                return;
            }
            parsedMaxPrice = maxNum;
        }

        if (
            parsedMinPrice !== undefined &&
            parsedMaxPrice !== undefined &&
            parsedMinPrice > parsedMaxPrice
        ) {
            res.status(400).json({
                message: 'Minimum price cannot exceed maximum price'
            });
            return;
        }

        if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
            filter.price = {};
            if (parsedMinPrice !== undefined) {
                filter.price.$gte = parsedMinPrice;
            }
            if (parsedMaxPrice !== undefined) {
                filter.price.$lte = parsedMaxPrice;
            }
        }

        // Sorting options: newest (default), oldest, price_asc, price_desc
        let sortOption: { [key: string]: mongoose.SortOrder } = { createdAt: -1 };

        if (typeof sort === 'string') {
            if (sort === 'oldest') {
                sortOption = { createdAt: 1 };
            } else if (sort === 'price_asc') {
                sortOption = { price: 1 };
            } else if (sort === 'price_desc') {
                sortOption = { price: -1 };
            } else if (sort === 'newest') {
                sortOption = { createdAt: -1 };
            }
        }

        // Pagination parameters
        let pageNumber = 1;
        let limitNumber = 12;

        if (typeof page === 'string') {
            const parsedPage = parseInt(page, 10);
            if (!Number.isNaN(parsedPage) && parsedPage > 0) {
                pageNumber = parsedPage;
            }
        }

        if (typeof limit === 'string') {
            const parsedLimit = parseInt(limit, 10);
            if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
                limitNumber = parsedLimit;
            }
        }

        const skipNumber = (pageNumber - 1) * limitNumber;

        // Total count of matching products
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);

        // Fetch paginated products and populate seller details (without password and refresh token hash)
        const products = await Product.find(filter)
            .populate('seller', 'name email')
            .sort(sortOption)
            .skip(skipNumber)
            .limit(limitNumber);

        res.status(200).json({
            products,
            currentPage: pageNumber,
            totalPages,
            totalProducts
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

// GET MY LISTINGS (AUTHENTICATED SELLER'S PRODUCTS)
export const getMyListings = async (
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

        // Retrieve products belonging to the authenticated user (both available and sold)
        const products = await Product.find({ seller: req.userId })
            .populate('seller', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            products
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

// GET PRODUCT BY ID
export const getProductById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                message: 'Invalid product ID'
            });
            return;
        }

        // Find product and populate seller details
        const product = await Product.findById(id).populate('seller', 'name email');

        if (!product) {
            res.status(404).json({
                message: 'Product not found'
            });
            return;
        }

        res.status(200).json({
            product
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

// UPDATE PRODUCT
export const updateProduct = async (
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
                message: 'Invalid product ID'
            });
            return;
        }

        // Find product
        const product = await Product.findById(id);

        if (!product) {
            res.status(404).json({
                message: 'Product not found'
            });
            return;
        }

        // Check ownership: ensure authenticated user is the seller
        if (product.seller.toString() !== req.userId) {
            res.status(403).json({
                message: 'You are not authorized to update this product'
            });
            return;
        }

        const {
            title,
            description,
            price,
            category,
            subcategory,
            status,
            existingImages: existingImagesRaw
        } = req.body;

        // Validate category and subcategory if provided
        const targetCategory = category || product.category;
        const targetSubcategory = subcategory || product.subcategory;

        if (category || subcategory) {
            const validSubcategories = PRODUCT_CATEGORIES[
                targetCategory as keyof typeof PRODUCT_CATEGORIES
            ];

            if (!validSubcategories || !validSubcategories.includes(targetSubcategory as never)) {
                res.status(400).json({
                    message: 'Invalid subcategory for the selected category'
                });
                return;
            }
        }

        // Handle existing images and new uploaded images
        const files = req.files as Express.Multer.File[] | undefined;
        const hasNewFiles = Boolean(files && Array.isArray(files) && files.length > 0);

        // Parse retained existing images if provided
        let retainedExistingUrls: string[] | null = null;
        if (existingImagesRaw !== undefined) {
            if (Array.isArray(existingImagesRaw)) {
                retainedExistingUrls = existingImagesRaw.filter((item): item is string => typeof item === 'string');
            } else if (typeof existingImagesRaw === 'string') {
                try {
                    const parsed = JSON.parse(existingImagesRaw);
                    if (Array.isArray(parsed)) {
                        retainedExistingUrls = parsed.filter((item): item is string => typeof item === 'string');
                    } else {
                        retainedExistingUrls = [existingImagesRaw];
                    }
                } catch {
                    retainedExistingUrls = [existingImagesRaw];
                }
            }
        }

        // Determine which existing images are retained vs removed
        const currentProductImages = Array.isArray(product.images) ? product.images : [];
        let retainedImages = currentProductImages;
        let imagesToRemove: Array<{ url: string; public_id: string }> = [];

        if (retainedExistingUrls !== null) {
            retainedImages = currentProductImages.filter((img) => {
                const url = typeof img === 'string' ? img : img?.url;
                return Boolean(url && retainedExistingUrls!.includes(url));
            });

            imagesToRemove = currentProductImages.filter((img) => {
                const url = typeof img === 'string' ? img : img?.url;
                return Boolean(!url || !retainedExistingUrls!.includes(url));
            }) as Array<{ url: string; public_id: string }>;
        }

        // Validate final total images count if an image update is being performed
        if (hasNewFiles || retainedExistingUrls !== null) {
            const finalImageCount = retainedImages.length + (files ? files.length : 0);
            if (finalImageCount < 2 || finalImageCount > 5) {
                res.status(400).json({
                    message: 'Total product images must be between 2 and 5'
                });
                return;
            }

            // Upload newly provided images to Cloudinary
            const uploadedNewImages: { url: string; public_id: string }[] = [];
            if (files && files.length > 0) {
                try {
                    for (const file of files) {
                        const uploaded = await uploadToCloudinary(file.buffer);
                        uploadedNewImages.push(uploaded);
                    }
                } catch (uploadError) {
                    // Safe cleanup: avoid orphaned newly uploaded assets if batch upload fails
                    for (const img of uploadedNewImages) {
                        if (img.public_id) {
                            await deleteFromCloudinary(img.public_id);
                        }
                    }
                    throw uploadError;
                }
            }

            // Update product images collection: retained existing images + newly uploaded images
            product.images = [...retainedImages, ...uploadedNewImages] as any;

            // Only delete removed assets from Cloudinary after successfully preparing update
            for (const oldImage of imagesToRemove) {
                if (oldImage && typeof oldImage === 'object' && 'public_id' in oldImage) {
                    await deleteFromCloudinary(oldImage.public_id);
                }
            }
        }

        // Update other fields if provided
        if (title !== undefined) product.title = title;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (category !== undefined) product.category = category;
        if (subcategory !== undefined) product.subcategory = subcategory;
        if (status !== undefined) product.status = status;

        // Save updated product
        await product.save();

        res.status(200).json({
            message: 'Product updated successfully',
            product
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

// DELETE PRODUCT
export const deleteProduct = async (
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
                message: 'Invalid product ID'
            });
            return;
        }

        // Find product
        const product = await Product.findById(id);

        if (!product) {
            res.status(404).json({
                message: 'Product not found'
            });
            return;
        }

        // Check ownership: ensure authenticated user is the seller
        if (product.seller.toString() !== req.userId) {
            res.status(403).json({
                message: 'You are not authorized to delete this product'
            });
            return;
        }

        // Delete associated images from Cloudinary
        for (const image of product.images) {
            if (image && typeof image === 'object' && 'public_id' in image) {
                await deleteFromCloudinary((image as { public_id: string }).public_id);
            }
        }

        // Delete product from database
        await Product.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Product deleted successfully'
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
