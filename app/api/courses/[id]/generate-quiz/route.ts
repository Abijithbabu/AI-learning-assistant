import { NextRequest, NextResponse } from "next/server";
import { generateQuizForCourse } from "@/lib/ai/quiz-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const numQuestions = body.numQuestions || 10;

    console.log(
      `[API] Generating quiz for course ${id} with ${numQuestions} questions`,
    );

    const quizId = await generateQuizForCourse(id, numQuestions);

    return NextResponse.json({
      success: true,
      quizId,
      message: "Quiz generated successfully",
    });
  } catch (error: unknown) {
    console.error("Quiz generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate quiz";
    const details = error instanceof Error ? error.toString() : String(error);
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}
