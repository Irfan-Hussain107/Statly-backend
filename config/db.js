const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("MongoDB is already connected.");
    return;
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGO_URI used:', process.env.MONGO_URI ? 'Exists' : 'MISSING!'); 
    
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is not defined.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully");

  } catch (error) {
    console.error("FATAL: MongoDB connection failed:", error.message);
  }
};

module.exports = connectDB;