"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error:", error);
    const message =
      error.message === "Invalid login credentials"
        ? "Invalid email or password. Please try again."
        : encodeURIComponent(error.message);
    redirect(`/login?error=${message}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error("Signup error:", error);
    const message =
      error.message === "User already registered"
        ? "An account with this email already exists. Try logging in instead."
        : encodeURIComponent(error.message);
    redirect(`/login?error=${message}`);
  }

  revalidatePath("/", "layout");
  redirect(
    "/login?message=Account created! Check your email to confirm your account before logging in.",
  );
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();

  // Priority:
  // 1. NEXT_PUBLIC_BASE_URL — explicitly set in Vercel env vars (most reliable)
  // 2. x-forwarded-host + x-forwarded-proto — set by Vercel's load balancer
  // 3. Localhost fallback for local dev
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto") || "https";
  const origin =
    siteUrl ||
    (forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : "http://localhost:3000");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    console.error("Google OAuth error:", error);
    redirect(
      "/login?error=Could not sign in with Google. Please try again later.",
    );
  }

  redirect(data.url);
}
