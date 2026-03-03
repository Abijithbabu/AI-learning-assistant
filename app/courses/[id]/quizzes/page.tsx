import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList, Clock, Trophy, Plus, ArrowLeft } from "lucide-react";

export default async function QuizzesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile to check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id || "")
    .single();

  // Fetch quizzes for this course
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      description,
      time_limit,
      passing_score,
      is_published,
      created_at
    `,
    )
    .eq("course_id", id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Get question counts for each quiz
  const quizzesWithCounts = await Promise.all(
    (quizzes || []).map(async (quiz) => {
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", quiz.id);

      // Get user's attempts for this quiz
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, score, completed_at, status")
        .eq("quiz_id", quiz.id)
        .eq("student_id", user?.id || "")
        .order("score", { ascending: false });

      const completedAttempts =
        attempts?.filter((a) => a.status === "completed") || [];
      const bestScore =
        completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a) => a.score || 0))
          : null;

      return {
        ...quiz,
        questionCount: count || 0,
        attemptCount: attempts?.length || 0,
        bestScore,
      };
    }),
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quizzes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Test your knowledge and track your progress
          </p>
        </div>

        <Link
          href={`/courses/${id}`}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Link>
      </div>

      <div className="grid gap-4">
        {quizzesWithCounts && quizzesWithCounts.length > 0 ? (
          quizzesWithCounts.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {quiz.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {quiz.description ||
                      "Test your knowledge of the course material"}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      {quiz.questionCount} questions
                    </span>
                    {quiz.time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {quiz.time_limit} min
                      </span>
                    )}
                    {quiz.bestScore !== null && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Trophy className="w-4 h-4" />
                        Best: {quiz.bestScore}%
                      </span>
                    )}
                    {quiz.attemptCount > 0 && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {quiz.attemptCount} attempt
                        {quiz.attemptCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/courses/${id}/quizzes/${quiz.id}`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  {quiz.attemptCount > 0 ? "Retake" : "Start Quiz"}
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No quizzes available yet
            </p>
            {profile?.role === "admin" && (
              <p className="text-sm text-gray-400">
                Generate a quiz from the course page
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
