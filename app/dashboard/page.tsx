import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/data'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const profile = await getUserProfile()
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Overview
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.email}
          </p>
        </div>
        {profile?.role === 'admin' && (
          <Link
            href="/dashboard/create"
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Link>
        )}
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-xl overflow-hidden"
            >
              <div className="h-32 bg-gray-100 dark:bg-gray-700 relative">
                <div className="absolute inset-0 bg-linear-to-tr from-purple-500/20 to-blue-500/20 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {course.description || 'No description provided.'}
                </p>
                <div className="mt-4 flex items-center text-xs text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {course.modules?.length || 0} Modules
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No courses yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Get started by creating your first course.
          </p>
          {profile?.role === 'admin' && (
            <Link
              href="/dashboard/create"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Course
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
