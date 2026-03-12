import { ArrowRight, Brain, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import React from "react";

const Navbar = () => {
  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="flex items-center justify-between px-4 py-6 md:px-10 sticky top-0 z-50 bg-opacity-50 backdrop-blur-md">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">AI Learning</span>
      </Link>
      <div className="flex items-center gap-6">
        <form action={signOut}>
          <button className="flex items-center w-full px-4 py-2 text-sm font-medium cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};

export default Navbar;
