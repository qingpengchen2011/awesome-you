import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/drizzle";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }