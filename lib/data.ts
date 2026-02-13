import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export const getUserProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("getUserProfile: No auth user found");
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(
      "getUserProfile: Error fetching profile for user",
      user.id,
      error,
    );
    // Auto-recover: Create profile if it doesn't exist
    if (error.code === "PGRST116") {
      // PGRST116 is JSON object not found (single() failed)
      console.log("getUserProfile: Profile missing, creating one...");
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({ id: user.id, email: user.email!, role: "student" })
        .select()
        .single();

      if (!createError) {
        return newProfile;
      } else {
        console.error(
          "getUserProfile: Failed to auto-create profile",
          createError,
        );
      }
    }
  }

  return profile;
});
