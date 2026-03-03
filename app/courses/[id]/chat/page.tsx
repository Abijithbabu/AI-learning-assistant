import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/data";
import ChatInterface from "./chat-interface";
import { redirect } from "next/navigation";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getUserProfile();
  const supabase = await createClient();

  if (!profile) redirect("/login");

  // Fetch Course details
  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", id)
    .single();

  if (!course) return <div>Course not found</div>;

  // Fetch Chat History
  const { data: history } = await supabase
    .from("chat_history")
    .select("*")
    .eq("course_id", id)
    .eq("student_id", profile.id)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedHistory = (history || []) as any;
  return (
    <ChatInterface
      courseId={id}
      initialMessages={typedHistory}
      courseTitle={course.title}
    />
  );
}
