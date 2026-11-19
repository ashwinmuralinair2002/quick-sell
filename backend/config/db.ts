
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        console.error('MONGODB_URI is missing from environment variables');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected Successfully');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        console.log('MongoDB Connection Failed:', errorMessage);
        process.exit(1);
    }
};

export default connectDB;
