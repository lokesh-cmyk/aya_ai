// app/actions.ts
"use server";
import { neon } from "@neondatabase/serverless";

export async function getData() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = neon(url);
    const data = await sql`...`;
    return data;
}