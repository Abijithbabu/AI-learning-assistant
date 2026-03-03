"use server";

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { generateEmbedding } from "@/lib/ai/embedding";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function sendMessage(courseId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Generate Query Embedding
  const embedding = await generateEmbedding(message);

  // 2. Search Context (filtered by course)
  const { data: chunks, error } = await supabase.rpc(
    "match_embeddings_by_course",
    {
      query_embedding: embedding,
      filter_course_id: courseId,
      match_threshold: 0.3, // Lowered to allow more matches
      match_count: 5,
    },
  );

  if (error) {
    console.error("Vector search error", error);
  }

  console.log(
    `[Chat] Found ${chunks?.length || 0} chunks for question: "${message}"`,
  );
  if (chunks && chunks.length > 0) {
    console.log(`[Chat] Top match similarity: ${chunks[0].similarity}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = chunks?.map((c: any) => c.content).join("\n\n") || "";

  console.log(`[Chat] Context length: ${context.length} chars`);

  // 3. Generate Answer
  const systemPrompt = `You are an AI Tutor for a specific course.
  Answer the student's question based ONLY on the provided Context.
  If the answer is not in the context, say "I cannot answer this based on the course materials."
  Do not hallucinate.
  Keep your answer helpful, encouraging, and concise.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${message}`,
        },
      ],
    });

    const answer =
      completion.choices[0].message.content || "I couldn't generate an answer.";

    // 4. Save History
    await supabase.from("chat_history").insert([
      {
        course_id: courseId,
        student_id: user.id,
        role: "user",
        content: message,
      },
      {
        course_id: courseId,
        student_id: user.id,
        role: "assistant",
        content: answer,
      },
    ]);

    return answer;
  } catch (e) {
    console.error("Error generating answer:", e);
    return "I am sorry, I am unable to answer your question at the moment.";
  }
}
