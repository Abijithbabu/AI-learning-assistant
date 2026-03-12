import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/data";
import { LogOut, BookOpen, PlusCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "../components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  const profile = await getUserProfile();

  if (!profile) {
    // Check if we are authenticated but missing profile (DB issue)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-red-200 dark:border-red-900">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Database Setup Required
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You are signed in, but your user profile wasn&apos;t found. This
              usually means the <b>Database Schema</b> hasn&apos;t been applied
              yet.
            </p>
            <div className="bg-gray-100 dark:bg-gray-950 p-4 rounded-lg text-sm font-mono overflow-auto mb-6">
              <p className="text-gray-500 mb-2">
                Run this in Supabase SQL Editor:
              </p>
              <code className="text-blue-600 dark:text-blue-400">
                supabase/setup_complete.sql
              </code>
            </div>
            <form action={signOut}>
              <button className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium">
                Sign Out & Try Again
              </button>
            </form>
          </div>
        </div>
      );
    }

    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Learning
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
            {profile.role === "admin" ? "Admin Portal" : "Student Portal"}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 mr-3 text-gray-500" />
            Dashboard
          </Link>

          <Link
            href="/dashboard/create"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-3 text-gray-500" />
            Create Course
          </Link>

          <Link
            href="/courses"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <BookOpen className="w-5 h-5 mr-3 text-gray-500" />
            My Courses
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form action={signOut}>
            <button className="flex items-center w-full px-4 py-2 text-sm font-medium cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-y-scroll">
        <Navbar />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
