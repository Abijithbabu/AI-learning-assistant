import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/data";
import { getLessonContent } from "@/lib/ai/lesson-generator";
import Link from "next/link";
import { ArrowLeft, ChevronRight, MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown"; // Need to install this, or just render as simple text for now if not available.
// Actually, I'll assume simple rendering or use a basic markdown parser since I can't guarantee react-markdown is installed.
// Wait, I can install it. For now, I will display raw text or very basic parsing to be safe, or just text.
// Let's stick to text for the MVP to avoid dependency hell, or use simple pre-wrap.

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile) redirect("/login");

  // Get Lesson Content (This triggers AI generation if missing)
  const content = await getLessonContent(lessonId);

  // Get Lesson Details for Navigation
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, modules(*)")
    .eq("id", lessonId)
    .single();

  if (!lesson) return <div>Lesson not found</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-auto md:h-screen overflow-y-auto hidden md:block">
        <div className="p-6">
          <Link
            href={`/courses/${id}`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Link>
          <h2 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs mb-4">
            Course Content
          </h2>
          {/* We could list all modules/lessons here but for simplicity just back link */}
          <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-medium text-purple-900 dark:text-purple-100 text-sm">
              Current Lesson
            </h3>
            <p className="text-purple-700 dark:text-purple-300 text-xs mt-1">
              {lesson.title}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
          <Link href={`/courses/${id}`} className="mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold">{lesson.title}</span>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            {lesson.title}
          </h1>

          <div className="prose dark:prose-invert prose-purple max-w-none">
            {/* Using whitespace-pre-wrap to preserve formatting if no markdown renderer */}
            <div className="prose dark:prose-invert prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-4" {...props} />
                  ),
                }}
              >
                {content || ""}
              </ReactMarkdown>
            </div>
          </div>

          {/* Floating Chat Button */}
          <Link
            href={`/courses/${id}/chat`}
            className="fixed bottom-8 right-8 bg-black dark:bg-white text-white dark:text-black rounded-full p-4 shadow-xl hover:scale-105 transition-transform flex items-center gap-2 z-50 font-medium"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden md:inline">Ask AI Tutor</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
