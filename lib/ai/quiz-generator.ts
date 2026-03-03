import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MCQOption {
  text: string;
  isCorrect: boolean;
}

interface MCQQuestion {
  question: string;
  options: MCQOption[];
  explanation: string;
  points: number;
}

interface QuizStructure {
  title: string;
  description: string;
  questions: MCQQuestion[];
}

export async function generateQuizForCourse(
  courseId: string,
  numQuestions: number = 10,
): Promise<string> {
  const supabase = createAdminClient();

  console.log(
    `[Quiz Generator] Starting quiz generation for course ${courseId} with ${numQuestions} questions`,
  );

  // 1. Fetch course content from embeddings
  const { data: materials } = await supabase
    .from("materials")
    .select("id")
    .eq("course_id", courseId);

  if (!materials || materials.length === 0) {
    throw new Error("No materials found for course");
  }

  const { data: chunks, error } = await supabase
    .from("embeddings")
    .select("content, material_id")
    .in(
      "material_id",
      materials.map((m) => m.id),
    )
    .order("chunk_index", { ascending: true });

  if (error || !chunks || chunks.length === 0) {
    console.error("No content found for course", courseId, error);
    throw new Error("No content found for course");
  }

  // Combine content (limit to reasonable size for API)
  const fullText = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 50000); // Limit to ~50k chars

  console.log(
    `[Quiz Generator] Retrieved ${chunks.length} chunks, total context: ${fullText.length} chars`,
  );

  if (fullText.length < 100) {
    throw new Error(
      "Insufficient content to generate quiz. Please add more course materials.",
    );
  }

  // 2. Generate quiz with OpenAI
  const systemPrompt = `You are an expert educator creating a multiple-choice quiz.

Your task is to analyze the provided learning materials and create a comprehensive quiz with ${numQuestions} questions.

REQUIREMENTS:
- Each question MUST have exactly 4 answer options (A, B, C, D)
- Only ONE option should be correct per question
- Questions should cover key concepts from the material in a balanced way
- Include a brief explanation (2-3 sentences) for why the correct answer is right
- Vary difficulty levels: ${Math.floor(numQuestions * 0.3)} easy, ${Math.floor(numQuestions * 0.5)} medium, ${Math.ceil(numQuestions * 0.2)} hard
- Make distractors (wrong answers) plausible but clearly incorrect to someone who studied
- Questions should test understanding and application, not just memorization
- Avoid trick questions or ambiguous wording
- Each question should be clear and concise

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "Course Quiz Title",
  "description": "Brief description of what this quiz covers",
  "questions": [
    {
      "question": "Clear, specific question text?",
      "options": [
        { "text": "Option A text", "isCorrect": false },
        { "text": "Option B text", "isCorrect": true },
        { "text": "Option C text", "isCorrect": false },
        { "text": "Option D text", "isCorrect": false }
      ],
      "explanation": "Clear explanation of why option B is correct and why it matters.",
      "points": 1
    }
  ]
}

IMPORTANT: Ensure the JSON is valid and follows the structure exactly.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a ${numQuestions}-question quiz based on this course content:\n\n${fullText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) throw new Error("No response from AI");

    console.log(`[Quiz Generator] Received response from OpenAI`);

    const quizData: QuizStructure = JSON.parse(responseContent);

    // Validate structure
    if (!quizData.questions || quizData.questions.length === 0) {
      throw new Error("Generated quiz has no questions");
    }

    console.log(
      `[Quiz Generator] Generated ${quizData.questions.length} questions`,
    );

    // 3. Save quiz to database
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        course_id: courseId,
        title: quizData.title,
        description: quizData.description,
        is_published: true, // Auto-publish for now
        passing_score: 70,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Failed to create quiz:", quizError);
      throw quizError;
    }

    console.log(`[Quiz Generator] Created quiz ${quiz.id}`);

    // 4. Save questions and answers
    for (const [index, q] of quizData.questions.entries()) {
      // Validate question has 4 options
      if (!q.options || q.options.length !== 4) {
        console.warn(
          `Question ${index + 1} doesn't have 4 options, skipping...`,
        );
        continue;
      }

      // Validate exactly one correct answer
      const correctCount = q.options.filter((opt) => opt.isCorrect).length;
      if (correctCount !== 1) {
        console.warn(
          `Question ${index + 1} has ${correctCount} correct answers (should be 1), skipping...`,
        );
        continue;
      }

      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          quiz_id: quiz.id,
          question_text: q.question,
          question_type: "multiple_choice",
          points: q.points || 1,
          order_index: index + 1,
          explanation: q.explanation,
        })
        .select()
        .single();

      if (questionError || !question) {
        console.error("Failed to create question:", questionError);
        continue;
      }

      // Insert answer options
      const optionsToInsert = q.options.map((opt, optIndex) => ({
        question_id: question.id,
        option_text: opt.text,
        is_correct: opt.isCorrect,
        order_index: optIndex + 1,
      }));

      const { error: optionsError } = await supabase
        .from("answer_options")
        .insert(optionsToInsert);

      if (optionsError) {
        console.error("Failed to create options:", optionsError);
      }
    }

    console.log(`[Quiz Generator] Quiz ${quiz.id} generated successfully!`);
    return quiz.id;
  } catch (e) {
    console.error("Failed to generate quiz with OpenAI:", e);
    throw e;
  }
}
