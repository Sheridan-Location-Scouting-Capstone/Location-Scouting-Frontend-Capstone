import { z } from 'zod';

export const SignUpSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
})

export type SignInInput = z.infer<typeof SignInSchema>;
