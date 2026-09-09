"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { signUp } from "@/lib/auth-client";
import { SignUpSchema } from "@/schemas/authSchema";

type FieldName = "name" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

/**
 * Error codes better-auth returns from POST /sign-up/email.
 * Source: better-auth BASE_ERROR_CODES — the sign-up route throws
 * APIError.from("UNPROCESSABLE_ENTITY", USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL)
 * when the email is taken, so the client sees `code` plus status 422.
 */
const SIGN_UP_ERROR_FIELDS: Record<string, { field: FieldName; message: string }> = {
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
        field: "email",
        message: "An account with this email already exists.",
    },
    USER_ALREADY_EXISTS: {
        field: "email",
        message: "An account with this email already exists.",
    },
    INVALID_EMAIL: {
        field: "email",
        message: "Enter a valid email address",
    },
    PASSWORD_TOO_SHORT: {
        field: "password",
        message: "Password must be at least 8 characters",
    },
    PASSWORD_TOO_LONG: {
        field: "password",
        message: "Password is too long",
    },
};

export default function SignUpPage() {
    const router = useRouter();
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFieldErrors({});
        setFormError(null);

        const formData = new FormData(e.currentTarget);
        const parsed = SignUpSchema.safeParse({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (!parsed.success) {
            const errors: FieldErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path[0] as FieldName | undefined;
                if (field && !errors[field]) errors[field] = issue.message;
            }
            setFieldErrors(errors);
            return;
        }

        setSubmitting(true);
        // better-auth returns errors on `res.error` instead of throwing.
        const res = await signUp.email(parsed.data);
        setSubmitting(false);

        if (res.error) {
            const mapped = res.error.code ? SIGN_UP_ERROR_FIELDS[res.error.code] : undefined;
            if (mapped) {
                setFieldErrors({ [mapped.field]: mapped.message });
            } else {
                setFormError(res.error.message || "Something went wrong. Please try again.");
            }
            return;
        }

        router.push("/");
        router.refresh();
    }

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                Create your account
            </Typography>

            {formError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {formError}
                </Alert>
            )}

            <Stack spacing={2}>
                <TextField
                    name="name"
                    label="Full Name"
                    autoComplete="name"
                    fullWidth
                    error={Boolean(fieldErrors.name)}
                    helperText={fieldErrors.name}
                />
                <TextField
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    fullWidth
                    error={Boolean(fieldErrors.email)}
                    helperText={fieldErrors.email}
                />
                <TextField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    fullWidth
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password ?? "At least 8 characters"}
                />
                <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
                    {submitting ? "Creating account..." : "Sign Up"}
                </Button>
            </Stack>

            <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                Already have an account?{" "}
                <Link href="/sign-in">Sign in</Link>
            </Typography>
        </Box>
    );
}
