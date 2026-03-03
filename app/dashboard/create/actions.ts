"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processMaterial } from "@/lib/ai/processor";

export async function createCourse(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Create Course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      creator_id: user.id,
    })
    .select()
    .single();

  if (courseError) {
    throw new Error("Failed to create course");
  }

  // 2. Handle File Uploads
  const files = formData.getAll("materials") as File[];

  if (files && files.length > 0) {
    const uploads = files.map(async (file) => {
      if (file.size === 0) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${course.id}/${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        return;
      }

      // Get Public URL (or signed URL if private)
      // Assuming 'materials' bucket is public for now or we use signed urls
      // Ideally use signed urls for security, but for prototype public is easier.
      // Let's assume we store the path and generate signed url on read, or just generic url.
      const filePath = fileName;

      // Record in DB
      let type = "text";
      if (["pdf"].includes(fileExt?.toLowerCase() || "")) type = "pdf";
      if (["docx", "doc"].includes(fileExt?.toLowerCase() || "")) type = "docx";
      if (["mp4", "mov", "avi"].includes(fileExt?.toLowerCase() || ""))
        type = "video";

      const { data: material } = await supabase
        .from("materials")
        .insert({
          course_id: course.id,
          type,
          url: filePath,
          filename: file.name,
          status: "pending", // Trigger AI processing
        })
        .select()
        .single();

      if (material) {
        // Trigger AI processing in background
        after(async () => {
          await processMaterial(material.id);
        });
      }
    });

    await Promise.all(uploads);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard`);
}
