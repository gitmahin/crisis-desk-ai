import { baseConfig } from "@/config";
import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

/**
 * Establishes a connection to the MongoDB cluster using Mongoose.
 *
 * This function implements an idempotent connection strategy: if a connection
 * is already established, it returns early to avoid redundant network overhead.
 *
 * @returns {Promise<void>} Resolves when the connection is established.
 *
 * @throws {Error} If the connection fails, the process will log the error
 * and terminate with an exit code of 1.
 *
 * @remarks
 * This function utilizes the `MONGO_URI` from the base configuration.
 * In a production environment, ensure this URI is injected via safe
 * environment variables or AWS SSM.
 */
export async function mongoConnect(): Promise<void> {
  if (connection.isConnected) {
    console.error("Database already connected");
    return;
  }

  try {
    const db = await mongoose.connect(baseConfig.MONGO_URI || "");
    connection.isConnected = db.connections[0]?.readyState;
    console.error("Mongodb connected successfully");
  } catch (error) {
    console.error("Mongodb connection failed. 😪");
    console.error(error);
    process.exit(1);
  }
}
