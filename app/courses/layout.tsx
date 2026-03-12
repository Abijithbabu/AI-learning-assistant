import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/data";
import { LogOut, BookOpen, PlusCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "../components/Navbar";

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 w-full overflow-y-scroll">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
