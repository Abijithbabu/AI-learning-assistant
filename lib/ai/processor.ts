import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromPDF, extractTextFromDOCX, cleanText } from "./extract";
import { splitTextIntoChunks } from "./chunking";
import { generateEmbedding } from "./embedding";
import { generateCourseFromMaterials } from "./generator";

export async function processMaterial(materialId: string) {
  const supabase = createAdminClient();

  // 1. Fetch material metadata
  const { data: material, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", materialId)
    .single();

  if (error || !material) {
    console.error("ProcessMaterial: Material not found", materialId);
    return;
  }

  // Update status to processing
  await supabase
    .from("materials")
    .update({ status: "processing" })
    .eq("id", materialId);

  try {
    console.log(
      `[Processor] Starting process for material: ${material.filename} (${materialId})`,
    );

    // 2. Download file
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("materials")
      .download(material.url);

    if (downloadError) {
      console.error("[Processor] Download failed:", downloadError);
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    if (!fileBlob) {
      console.error("[Processor] File blob is null");
      throw new Error("File blob is null");
    }

    console.log(`[Processor] File downloaded, size: ${fileBlob.size} bytes`);

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    let text = "";

    // 3. Extract text
    if (material.type === "pdf") {
      text = await extractTextFromPDF(buffer);
    } else if (material.type === "docx") {
      text = await extractTextFromDOCX(buffer);
    } else if (material.type === "text") {
      text = buffer.toString("utf-8");
    } else {
      // TODO: Video transcription
      console.log("Video processing not implemented yet");
      return;
    }

    text = cleanText(text);

    // Save extracted text url
    const textFileName = `${material.course_id}/${material.id}_extracted.txt`;
    const { error: uploadTextError } = await supabase.storage
      .from("materials")
      .upload(textFileName, text, { upsert: true, contentType: "text/plain" });

    if (!uploadTextError) {
      await supabase
        .from("materials")
        .update({ extracted_text_url: textFileName })
        .eq("id", materialId);
    } else {
      console.error("Failed to upload extracted text", uploadTextError);
    }

    // 4. Chunking
    const chunks = splitTextIntoChunks(text);
    console.log(`Generated ${chunks.length} chunks for ${material.filename}`);

    // 5. Generate Embeddings & Store
    const embeddingPromises = chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk);
      return {
        material_id: material.id,
        content: chunk,
        embedding,
        chunk_index: index,
      };
    });

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < embeddingPromises.length; i += BATCH_SIZE) {
      const batch = embeddingPromises.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch);

      const { error: insertError } = await supabase
        .from("embeddings")
        .insert(results);
      if (insertError) {
        console.error("Error saving embeddings batch", insertError);
        throw insertError;
      }
    }

    // 6. Update status to ready
    await supabase
      .from("materials")
      .update({ status: "ready" })
      .eq("id", materialId);

    console.log(`Material ${materialId} processed successfully`);

    // 7. Check if Course Generation is needed
    await checkAndGenerateCourse(material.course_id);
  } catch (err) {
    console.error("Error processing material:", err);
    await supabase
      .from("materials")
      .update({ status: "error" })
      .eq("id", materialId);
  }
}

async function checkAndGenerateCourse(courseId: string) {
  const supabase = createAdminClient();

  // Check if any materials are still pending/processing
  const { count } = await supabase
    .from("materials")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId)
    .in("status", ["pending", "processing"]);

  if (count === 0) {
    console.log(
      `All materials ready for course ${courseId}. Triggering generation...`,
    );
    await generateCourseFromMaterials(courseId);
  }
}
