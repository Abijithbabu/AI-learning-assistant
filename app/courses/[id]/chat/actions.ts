"use server";

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { generateEmbedding } from "@/lib/ai/embedding";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Patterns that indicate a general lesson-level query rather than a specific factual question.
// For these, we don't gate on similarity score — we just grab the top chunks as context.
const GENERAL_QUERY_PATTERNS = [
  /\b(brief|briefing|overview|summarize|summarise|summary|recap)\b/i,
  /\b(explain|describe|tell me about|what is|what are|what does)\b.*(lesson|course|topic|module|chapter|content|material)/i,
  /\b(key\s*(concepts?|points?|ideas?|takeaways?|topics?))\b/i,
  /\b(what (did|do|should) (i|we|students?) (learn|know|understand|cover))\b/i,
  /\b(introduce|introduction|about this (lesson|course|topic|module))\b/i,
  /\b(main\s*(topic|idea|point|theme|concept)s?)\b/i,
  /\b(highlight|outline|gist|essence|core)\b/i,
];

function isGeneralLessonQuery(message: string): boolean {
  return GENERAL_QUERY_PATTERNS.some((pattern) => pattern.test(message));
}

export async function sendMessage(courseId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const isGeneral = isGeneralLessonQuery(message);

  // 1. Generate Query Embedding
  const embedding = await generateEmbedding(message);

  // 2. Search for relevant course chunks
  // For general queries: lower threshold + fetch more chunks to get broad context
  // For specific queries: normal threshold
  const { data: chunks, error } = await supabase.rpc(
    "match_embeddings_by_course",
    {
      query_embedding: embedding,
      filter_course_id: courseId,
      match_threshold: isGeneral ? 0.0 : 0.3, // For general queries, grab all chunks
      match_count: isGeneral ? 10 : 5,
    },
  );

  if (error) {
    console.error("Vector search error", error);
  }

  console.log(
    `[Chat] Query type: ${isGeneral ? "general" : "specific"} | Found ${chunks?.length || 0} chunks for: "${message}"`,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = chunks?.map((c: any) => c.content).join("\n\n") || "";
  const hasContext = context.trim().length > 0;

  // 3. Build appropriate system prompt based on query type
  let systemPrompt: string;

  if (isGeneral) {
    systemPrompt = `You are a helpful AI Tutor for a specific course.
The student is asking a general question about the lesson or course content.
Use the provided Context (which contains the full course material) to give a clear, structured, and student-friendly response.
Your response should:
- Be well-organized using headings or bullet points where appropriate
- Cover the key concepts present in the context
- Be encouraging and educational in tone
- Not make up information outside the context, but you can synthesize and explain the content naturally
If the context is empty, politely let the student know the course materials haven't been indexed yet.`;
  } else {
    systemPrompt = `You are a helpful AI Tutor for a specific course.
Answer the student's question based on the provided Context from the course materials.
Guidelines:
- If the answer is clearly in the context, answer it accurately and helpfully.
- If the answer is partially in the context, answer what you can and note the limitation.
- If the context has no relevant information at all, say: "I don't have specific information about that in this course's materials. Try rephrasing your question or asking your instructor."
- Do not make up facts. Keep answers concise, encouraging, and easy to understand.`;
  }

  try {
    const userContent = hasContext
      ? `Context:\n${context}\n\nQuestion: ${message}`
      : `Question: ${message}\n\n(Note: No course material context was found for this query.)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
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
