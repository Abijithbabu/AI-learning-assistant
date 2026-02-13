import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { generateEmbedding } from "./embedding";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getLessonContent(lessonId: string) {
  const supabase = createAdminClient();

  // 1. Get Lesson Details
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, modules(course_id)")
    .eq("id", lessonId)
    .single();

  if (!lesson) return null;

  // If content already exists, return it
  if (lesson.content && lesson.content.length > 50) {
    return lesson.content;
  }

  // 2. RAG Generation
  // Search for relevant context using lesson title + summary
  const query = `${lesson.title}: ${lesson.summary}`;
  const embedding = await generateEmbedding(query);

  // Use the RPC for matching embeddings
  // We need to ensure 'match_embeddings' function exists in Supabase
  const { data: chunks, error } = await supabase.rpc("match_embeddings", {
    query_embedding: embedding,
    match_threshold: 0.3, // Lowered slightly for better recall
    match_count: 5,
  });

  if (error) {
    console.error("Error matching embeddings:", error);
  }

  let context = "";
  if (chunks && chunks.length > 0) {
    context = chunks.map((c: any) => c.content).join("\n\n");
  }

  // 3. Generate Content with OpenAI GPT-4o
  const systemPrompt = `
    You are an expert tutor. Write a comprehensive lesson for the topic provided.
    Use ONLY the provided Context to explain the concepts.
    If the context is insufficient, state that clearly but try to explain using general knowledge if explicitly allowed (but here we prefer context).
    Format the output in beautiful Markdown with clear headings, bullet points, and code blocks if applicable.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Lesson Title: ${lesson.title}\n\nContext:\n${context}`,
        },
      ],
    });

    const content = completion.choices[0].message.content || "";

    // 4. Save Content
    await supabase.from("lessons").update({ content }).eq("id", lessonId);

    return content;
  } catch (e) {
    console.error("Error generating lesson content:", e);
    return "Failed to generate lesson content. Please try again.";
  }
}

/*
  SQL needed for match_embeddings:
  
  create or replace function match_embeddings (
    query_embedding vector(1536),
    match_threshold float,
    match_count int
  )
  returns table (
    id uuid,
    content text,
    similarity float
  )
  language plpgsql
  as $$
  begin
    return query
    select
      embeddings.id,
      embeddings.content,
      1 - (embeddings.embedding <=> query_embedding) as similarity
    from embeddings
    where 1 - (embeddings.embedding <=> query_embedding) > match_threshold
    order by embeddings.embedding <=> query_embedding
    limit match_count;
  end;
  $$;
*/
