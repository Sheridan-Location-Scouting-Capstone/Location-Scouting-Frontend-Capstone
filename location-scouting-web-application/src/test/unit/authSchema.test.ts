import { describe, expect, it } from 'vitest';
import { SignInSchema, SignUpSchema } from '@/schemas/authSchema';

describe('auth schemas', () => {
    it('accepts valid sign-up values', () => {
        const result = SignUpSchema.safeParse({
            name: 'Alex Scout',
            email: 'alex@example.com',
            password: 'supersecret123',
        });

        expect(result.success).toBe(true);
    });

    it('rejects missing or invalid sign-up values', () => {
        const result = SignUpSchema.safeParse({
            name: '',
            email: 'not-an-email',
            password: 'short',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path[0] === 'name')).toBe(true);
            expect(result.error.issues.some((issue) => issue.path[0] === 'email')).toBe(true);
            expect(result.error.issues.some((issue) => issue.path[0] === 'password')).toBe(true);
        }
    });

    it('accepts valid sign-in values', () => {
        const result = SignInSchema.safeParse({
            email: 'alex@example.com',
            password: 'supersecret123',
        });

        expect(result.success).toBe(true);
    });

    it('rejects missing sign-in values', () => {
        const result = SignInSchema.safeParse({
            email: '',
            password: '',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path[0] === 'email')).toBe(true);
            expect(result.error.issues.some((issue) => issue.path[0] === 'password')).toBe(true);
        }
    });
});
