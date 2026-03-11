import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/data";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PlayCircle,
  Loader2,
  AlertTriangle,
  FileText,
  ClipboardList,
  MessageSquare,
  Lock,
} from "lucide-react";
import { redirect } from "next/navigation";
import GenerateQuizButton from "./generate-quiz-button";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select(
      `
      *,
      modules (
        *,
        lessons (*)
      ),
      materials (*)
    `,
    )
    .eq("id", id)
    .single();

  if (!course) {
    return <div>Course not found</div>;
  }
  console.log(course);
  // Handle Empty State / Processing State
  if (!course.modules || course.modules.length === 0) {
    const materials = course.materials || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasError = materials.some((m: any) => m.status === "error");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isProcessing = materials.some((m: any) =>
      ["pending", "processing"].includes(m.status),
    );

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Link
          href="/dashboard"
          className="absolute top-8 left-8 flex items-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="max-w-md w-full text-center space-y-6">
          {hasError ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-200 dark:border-red-800">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Generation Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                There was an error processing your materials. This is likely due
                to missing Database Permissions (RLS).
              </p>
              <div className="text-left bg-white dark:bg-black p-4 rounded border border-gray-200 dark:border-gray-800 text-xs font-mono overflow-auto max-h-40">
                <p className="font-bold mb-2">Try running this SQL fix:</p>
                <code className="text-blue-600 dark:text-blue-400">
                  supabase/fix_embeddings_rls.sql
                </code>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-purple-100 dark:border-purple-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <BrainIcon className="absolute inset-0 m-auto w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">
                Building Your Course...
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                AI is reading your files, extracting concepts, and structuring
                lessons. This may take a moment.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {materials.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
                  >
                    <span className="flex items-center gap-2 truncate max-w-[200px]">
                      <FileText className="w-3 h-3" /> {m.filename}
                    </span>
                    <span
                      className={`capitalize font-medium ${m.status === "processing" ? "text-purple-500" : "text-gray-400"}`}
                    >
                      {m.status}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                No Content Generated
              </h2>
              <p className="text-gray-500">
                We couldn&apos;t generate a course from the provided materials.
                They might be empty or unreadable.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sort modules and lessons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  course.modules.sort((a: any, b: any) => a.order - b.order);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  course.modules.forEach((mod: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mod.lessons.sort((a: any, b: any) => a.order - b.order);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {course.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-3xl">
            {course.description}
          </p>

          {/* Quick Actions */}
          <div className="flex items-center gap-4 mt-6">
            <Link
              href={`/courses/${id}/chat`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              AI Tutor Chat
            </Link>
            <Link
              href={`/courses/${id}/quizzes`}
              className="flex items-center gap-2 px-4 py-2 border-2 border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm font-medium"
            >
              <ClipboardList className="w-4 h-4" />
              Take Quiz
            </Link>
            {/* Show Generate Quiz button to admins and course creators */}
            {(profile?.role === "admin" ||
              course.creator_id === profile?.id) && (
              <GenerateQuizButton courseId={id} />
            )}
          </div>

          <div className="flex items-center gap-6 mt-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              {course.modules.length} Modules
            </div>
            {/* Private course indicator */}
            {!course.is_public && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                <Lock className="w-3.5 h-3.5" />
                Private Course — only visible to you
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid gap-8">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {course.modules.map((module: any) => (
            <div
              key={module.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {module.title}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {module.lessons.map((lesson: any) => (
                  <Link
                    key={lesson.id}
                    href={`/courses/${id}/learn/${lesson.id}`}
                    className="flex items-start p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="mr-4 mt-1">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                        <PlayCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {lesson.summary || "Start learning..."}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}
