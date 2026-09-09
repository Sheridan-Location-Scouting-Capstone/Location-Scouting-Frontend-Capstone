"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { signIn } from "@/lib/auth-client";
import { SignInSchema } from "@/schemas/authSchema";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const SIGN_IN_ERROR_FIELDS: Record<string, { field: FieldName; message: string }> = {
    INVALID_EMAIL: {
        field: "email",
        message: "Enter a valid email address",
    },
    USER_NOT_FOUND: {
        field: "email",
        message: "No account found for that email.",
    },
    INVALID_PASSWORD: {
        field: "password",
        message: "Incorrect password.",
    },
    PASSWORD_REQUIRED: {
        field: "password",
        message: "Password is required",
    },
};

export default function SignInPage() {
    const router = useRouter();
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFieldErrors({});
        setFormError(null);

        const formData = new FormData(e.currentTarget);
        const parsed = SignInSchema.safeParse({
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
        const res = await signIn.email(parsed.data);


        if (res.error) {
            setSubmitting(false);
            const mapped = res.error.code ? SIGN_IN_ERROR_FIELDS[res.error.code] : undefined;
            if (mapped) {
                setFieldErrors({ [mapped.field]: mapped.message });
            } else {
                setFormError(res.error.message || "Something went wrong. Please try again.");
            }
            return;
        }

        router.push("/locations");
        router.refresh();
    }

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate data-testid="signin-form">
            <Typography variant="h6" fontWeight={600} gutterBottom data-testid="signin-title">
                Welcome back
            </Typography>

            {formError && (
                <Alert severity="error" sx={{ mb: 2 }} data-testid="signin-form-error">
                    {formError}
                </Alert>
            )}

            <Stack spacing={2}>
                <TextField
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    fullWidth
                    error={Boolean(fieldErrors.email)}
                    helperText={fieldErrors.email}
                    slotProps={{ htmlInput: { 'data-testid': 'signin-email-input' } }}
                />
                <TextField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    fullWidth
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password}
                    slotProps={{ htmlInput: { 'data-testid': 'signin-password-input' } }}
                />
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    loading={submitting}
                    fullWidth
                    data-testid="signin-submit-button"
                >
                    Sign In
                </Button>
            </Stack>

            <Typography variant="body2" align="center" sx={{ mt: 3 }} data-testid="signin-signup-copy">
                Don&apos;t have an account? {" "}
                <Link href="/sign-up" data-testid="signin-signup-link">Sign up</Link>
            </Typography>
        </Box>
    );
}