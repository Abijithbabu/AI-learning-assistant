-- ============================================================
-- Migration: Allow Students to Create Private Courses
-- Apply this in Supabase SQL Editor on an existing database.
-- ============================================================

-- 1. Add is_public column to courses table
--    Existing courses (created by admins) default to true (public)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- 2. Update courses RLS policies
DROP POLICY IF EXISTS "Courses are viewable by everyone." ON courses;
DROP POLICY IF EXISTS "Courses viewable by creator or if public" ON courses;
CREATE POLICY "Courses viewable by creator or if public" ON courses
  FOR SELECT USING (
    is_public = true OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can insert courses." ON courses;
DROP POLICY IF EXISTS "Authenticated users can insert courses." ON courses;
CREATE POLICY "Authenticated users can insert courses." ON courses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update their courses." ON courses;
DROP POLICY IF EXISTS "Creators can update their courses." ON courses;
CREATE POLICY "Creators can update their courses." ON courses
  FOR UPDATE USING (creator_id = auth.uid());

-- 3. Update modules INSERT RLS — any course creator can add modules
DROP POLICY IF EXISTS "Admins can insert modules" ON modules;
DROP POLICY IF EXISTS "Course creators can insert modules" ON modules;
CREATE POLICY "Course creators can insert modules" ON modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = modules.course_id AND creator_id = auth.uid()
    )
  );

-- 4. Update lessons INSERT RLS — any course creator can add lessons
DROP POLICY IF EXISTS "Admins can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Course creators can insert lessons" ON lessons;
CREATE POLICY "Course creators can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.creator_id = auth.uid()
    )
  );

-- 5. Update materials INSERT RLS — any course creator can upload materials
DROP POLICY IF EXISTS "Admins can insert materials" ON materials;
DROP POLICY IF EXISTS "Course creators can insert materials" ON materials;
CREATE POLICY "Course creators can insert materials" ON materials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = materials.course_id AND creator_id = auth.uid()
    )
  );
