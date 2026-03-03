import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QuizInterface from "./quiz-interface";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch quiz with questions and options
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      description,
      time_limit,
      passing_score,
      questions(
        id,
        question_text,
        question_type,
        points,
        order_index,
        explanation,
        answer_options(
          id,
          option_text,
          order_index
        )
      )
    `,
    )
    .eq("id", quizId)
    .single();

  if (error || !quiz) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quiz Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The quiz you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
        <a
          href={`/courses/${id}/quizzes`}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-block"
        >
          Back to Quizzes
        </a>
      </div>
    );
  }

  // Sort questions and options by order_index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quiz.questions.forEach((q: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q.answer_options.sort((a: any, b: any) => a.order_index - b.order_index);
  });

  return <QuizInterface quiz={quiz} courseId={id} />;
}
