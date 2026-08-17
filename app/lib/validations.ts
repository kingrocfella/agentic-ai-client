import { z } from "zod";

// Auth validation schemas
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(255, "Username is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password is too long"),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password is too long"),
});

// Chat validation schemas.
// The 4000-character ceiling mirrors the agent API's own bound on
// AgentChatRequest.query — a longer prompt is rejected upstream anyway, so
// reject it here rather than spending a request on it.
export const chatQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(4000, "Query is too long"),
});

// API response validation schemas
export const loginResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    access_token: z.string().min(1, "Access token is required"),
    token_type: z.string().min(1, "Token type is required"),
  }),
});

export const registerResponseSchema = z.object({
  message: z.string().optional(),
  data: z.null(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.never()),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChatQueryInput = z.infer<typeof chatQuerySchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
