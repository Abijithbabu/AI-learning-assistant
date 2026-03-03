"use server";

import { createClient } from "@/lib/supabase/server";

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Answer[],
  timeSpent: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  console.log(
    `[Quiz Submit] User ${user.id} submitting quiz ${quizId} with ${answers.length} answers`,
  );

  // 1. Create quiz attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      student_id: user.id,
      status: "in_progress",
      time_spent: timeSpent,
    })
    .select()
    .single();

  if (attemptError || !attempt) {
    console.error("Failed to create attempt:", attemptError);
    throw attemptError;
  }

  // 2. Get all questions with correct answers
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(
      `
      id,
      points,
      answer_options(id, is_correct)
    `,
    )
    .eq("quiz_id", quizId);

  if (questionsError || !questions) {
    console.error("Failed to fetch questions:", questionsError);
    throw new Error("Questions not found");
  }

  let totalPointsEarned = 0;
  let totalPointsPossible = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  // 3. Save each answer and calculate score
  for (const answer of answers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const question = questions.find((q: any) => q.id === answer.questionId);
    if (!question) {
      console.warn(`Question ${answer.questionId} not found`);
      continue;
    }

    const selectedOption = question.answer_options.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (opt: any) => opt.id === answer.selectedOptionId,
    );

    const isCorrect = selectedOption?.is_correct || false;
    const pointsEarned = isCorrect ? question.points : 0;

    if (isCorrect) correctCount++;
    else incorrectCount++;

    totalPointsEarned += pointsEarned;
    totalPointsPossible += question.points;

    const { error: answerError } = await supabase
      .from("student_answers")
      .insert({
        attempt_id: attempt.id,
        question_id: answer.questionId,
        selected_option_id: answer.selectedOptionId,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });

    if (answerError) {
      console.error("Failed to save answer:", answerError);
    }
  }

  // 4. Calculate final score percentage
  const score =
    totalPointsPossible > 0
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
      : 0;

  console.log(
    `[Quiz Submit] Final score: ${score}% (${totalPointsEarned}/${totalPointsPossible} points)`,
  );

  // 5. Update attempt with final score
  const { error: updateError } = await supabase
    .from("quiz_attempts")
    .update({
      score,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      completed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", attempt.id);

  if (updateError) {
    console.error("Failed to update attempt:", updateError);
  }

  return {
    score,
    correctCount,
    incorrectCount,
    totalPointsEarned,
    totalPointsPossible,
  };
}
