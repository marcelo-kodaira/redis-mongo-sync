import mongoose from "mongoose";

export const connectToMongoDB = async () => {
  try {
    await mongoose.connect("mongodb://mongo1:27017/sync", {});
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

export const myCollection = mongoose.connection.collection("myCollection");
