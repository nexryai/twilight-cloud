import { MongoClient } from "mongodb";

export const client = new MongoClient(process.env.DATABASE_URL ?? "mongodb://localhost:27017/database");
export const db = client.db();
