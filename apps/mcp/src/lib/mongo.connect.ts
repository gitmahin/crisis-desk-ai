import { baseConfig } from "@/config";
import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

export async function mongoConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log("Database already connected");
    return;
  }

  try {
    const db = await mongoose.connect(baseConfig.MONGO_URI || "");
    connection.isConnected = db.connections[0]?.readyState;
    console.log("Mongodb connected successfully");
  } catch (error) {
    console.log("Mongodb connection failed");
    process.exit(1);
  }
}
