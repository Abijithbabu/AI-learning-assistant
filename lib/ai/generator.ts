import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCourseFromMaterials(courseId: string) {
  const supabase = createAdminClient();

  // 1. Fetch all text content from the course materials
  // querying embeddings table because it contains the chunked text
  const { data: chunks, error } = await supabase
    .from("embeddings")
    .select("content, material_id")
    .in(
      "material_id",
      (
        await supabase.from("materials").select("id").eq("course_id", courseId)
      ).data?.map((m) => m.id) || [],
    )
    .order("chunk_index", { ascending: true });

  if (error || !chunks || chunks.length === 0) {
    console.error("No content found for course", courseId);
    return;
  }

  // Combine text (truncate if too large, though 128k tokens is a lot)
  // detailed logic would involve summarization steps if > 128k
  const fullText = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 100000); // Safety cap for context

  console.log(
    `[Generator] Generating course ${courseId} with context length: ${fullText.length} chars`,
  );

  if (fullText.length < 50) {
    console.warn(
      "[Generator] Warning: Very little context found. Generation might be poor.",
    );
  }

  // 2. Generate Structure with OpenAI GPT-4o
  const systemPrompt = `
    You are an expert Instructional Designer and AI Tutor.
    Your task is to analyze the provided learning materials and structure a comprehensive course.
    
    Output a JSON object with the following structure:
    {
      "courseTitle": "String",
      "courseDescription": "String",
      "modules": [
        {
          "title": "Module Title",
          "lessons": [
            {
              "title": "Lesson Title",
              "summary": "Brief summary of what this lesson covers"
            }
          ]
        }
      ]
    }
    
    Ensure the course flows logically from basic to advanced concepts found in the text.
    Create only as many modules and lessons as the content supports.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the course content:\n\n${fullText}` },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) throw new Error("No response from AI");

    const structure = JSON.parse(responseContent);

    // 3. Save to DB

    // Update Course Title/Desc
    await supabase
      .from("courses")
      .update({
        title: structure.courseTitle,
        description: structure.courseDescription,
      })
      .eq("id", courseId);

    // Insert Modules & Lessons
    for (const [mIndex, mod] of structure.modules.entries()) {
      const { data: moduleData } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title: mod.title,
          order: mIndex + 1,
        })
        .select()
        .single();

      if (moduleData) {
        const lessonsToInsert = mod.lessons.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (lesson: any, lIndex: number) => ({
            module_id: moduleData.id,
            title: lesson.title,
            summary: lesson.summary,
            order: lIndex + 1,
            // We will generate full content later, or on demand
            content: "",
          }),
        );

        await supabase.from("lessons").insert(lessonsToInsert);
      }
    }

    console.log(`Course ${courseId} generated successfully!`);
  } catch (e) {
    console.error("Failed to generate course with OpenAI", e);
    throw e;
  }
}
