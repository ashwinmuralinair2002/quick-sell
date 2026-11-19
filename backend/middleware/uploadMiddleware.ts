import multer from 'multer';

// Use memory storage to handle image buffers directly for Cloudinary upload
const storage = multer.memoryStorage();

// File filter to allow only image files
const fileFilter = (
    _req: any,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith('image/')) {
        callback(null, true);
    } else {
        callback(new Error('Only image files are allowed'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB per file
    }
});

export default upload;
