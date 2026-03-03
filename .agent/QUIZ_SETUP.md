# Quiz System - Setup Instructions

## ✅ Components Created

The following files have been successfully created:

### Core Logic

1. **lib/ai/quiz-generator.ts** - AI quiz generation using GPT-4o
2. **app/api/courses/[id]/generate-quiz/route.ts** - API endpoint for quiz generation

### Database

3. **supabase/quiz_schema.sql** - Complete database schema

### Frontend Pages

4. **app/courses/[id]/quizzes/page.tsx** - Quiz list page
5. **app/courses/[id]/quizzes/[quizId]/page.tsx** - Individual quiz page
6. **app/courses/[id]/quizzes/[quizId]/quiz-interface.tsx** - Interactive quiz component
7. **app/courses/[id]/quizzes/[quizId]/actions.ts** - Quiz submission logic
8. **app/courses/[id]/generate-quiz-button.tsx** - Admin quiz generation button

### Integration

9. Updated **app/courses/[id]/page.tsx** with quiz navigation and generation button

---

## 🚀 Next Steps - Run This SQL

**IMPORTANT: You MUST run this SQL in Supabase before testing the quiz system!**

###How to Run the SQL:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to SQL Editor** (left sidebar)
3. **Copy content** from `supabase/quiz_schema.sql`
4. **Paste and Run** in the SQL Editor

The SQL will create:

- ✅ `quizzes` table
- ✅ `questions` table
- ✅ `answer_options` table
- ✅ `quiz_attempts` table
- ✅ `student_answers` table
- ✅ All necessary indices
- ✅ Row Level Security (RLS) policies

---

## 📝 How to Use the Quiz System

### For Admins:

1. **Navigate to a course** (e.g., `/courses/[id]`)
2. **Click "Generate Quiz"** button (green button with sparkles icon)
3. Wait for AI to generate 10 MCQ questions from course materials
4. Quiz will be automatically published and available to students

### For Students:

1. **Navigate to a course** (e.g., `/courses/[ id]`)
2. **Click "Take Quiz"** button
3. Select from available quizzes
4. **Take the quiz**:
   - Answer questions (select one option per question)
   - Use navigation to move between questions
   - View progress bar at the top
   - Submit when all questions answered
5. **View results** with score, correct/incorrect count, and time taken
6. Can retake quizzes multiple times

---

## 🎨 Features Implemented

### Quiz Generation:

- ✅ AI-powered question generation from course materials
- ✅ 4 options per question (A, B, C, D)
- ✅ Balanced difficulty levels (easy, medium, hard)
- ✅ Explanations for correct answers
- ✅ Automatic validation and database storage

### Quiz Taking:

- ✅ Clean, modern interface with dark mode
- ✅ Real-time timer
- ✅ Progress tracking
- ✅ Question navigation grid
- ✅ Confirmation dialog before submission
- ✅ Unanswered question warnings

### Results & Analytics:

- ✅ Percentage score
- ✅ Pass/fail status (70% passing score)
- ✅ Correct vs incorrect count
- ✅ Time spent tracking
- ✅ Multiple attempt support
- ✅ Best score tracking
- ✅ Retry functionality

### Security:

- ✅ Row Level Security (RLS) policies
- ✅ Admin-only quiz generation
- ✅ Students can only view their own attempts
- ✅ Published quizzes only visible to students

---

## 🧪 Testing Plan

### 1. Database Setup

```bash
# Verify tables created
# Run in Supabase SQL Editor:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('quizzes', 'questions', 'answer_options', 'quiz_attempts', 'student_answers');
```

### 2. Generate Quiz

- Login as admin
- Navigate to any course with materials
- Click "Generate Quiz"
- Check browser console for logs
- Verify quiz appears in `/courses/[id]/quizzes`

### 3. Take Quiz

- Login as student (or admin)
- Navigate to quiz list
- Start a quiz
- Answer questions
- Submit and view results

### 4. Check Database

```sql
-- View generated quizzes
SELECT * FROM quizzes;

-- View questions
SELECT q.*, COUNT(ao.id) as option_count
FROM questions q
LEFT JOIN answer_options ao ON ao.question_id = q.id
GROUP BY q.id;

-- View student attempts
SELECT * FROM quiz_attempts ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### "Quiz not found"

- Ensure database schema is created
- Check if quiz is published (`is_published = true`)

### "No quizzes available"

- Admin needs to generate quiz first
- Check if course has materials uploaded

### "Failed to generate quiz"

- Verify course has embedded materials
- Check OpenAI API key is set
- Look at browser console and terminal logs
- Ensure sufficient content (>100 chars)

### RLS Permission Errors

- Verify SQL schema was run completely
- Check user role in `users` table
- Ensure RLS policies are enabled

---

## 📊 Database Schema Summary

```
courses (existing)
  └─ quizzes
       ├─ id (uuid, PK)
       ├─ course_id (FK → courses)
       ├─ title
       ├─ description
       ├─ passing_score (default 70)
       ├─ time_limit (nullable)
       └─ is_published (boolean)

quizzes
  └─ questions
       ├─ id (uuid, PK)
       ├─ quiz_id (FK → quizzes)
       ├─ question_text
       ├─ question_type ('multiple_choice')
       ├─ points (default 1)
       ├─ order_index
       └─ explanation

questions
  └─ answer_options
       ├─ id (uuid, PK)
       ├─ question_id (FK → questions)
       ├─ option_text
       ├─ is_correct (boolean)
       └─ order_index

quizzes
  └─ quiz_attempts
       ├─ id (uuid, PK)
       ├─ quiz_id (FK → quizzes)
       ├─ student_id (FK → auth.users)
       ├─ score (percentage)
       ├─ total_points_earned/possible
       ├─ started_at/completed_at
       ├─ time_spent (seconds)
       └─ status ('in_progress'|'completed'|'abandoned')

quiz_attempts
  └─ student_answers
       ├─ id (uuid, PK)
       ├─ attempt_id (FK → quiz_attempts)
       ├─ question_id (FK → questions)
       ├─ selected_option_id (FK → answer_options)
       ├─ is_correct (boolean)
       └─ points_earned
```

---

## 🎯 What's Working Now

After running the SQL:

- ✅ Admin can generate quizzes from any course
- ✅ Students can view and take quizzes
- ✅ Real-time score calculation
- ✅ Multiple attempts with best score tracking
- ✅ Beautiful, responsive UI with dark mode
- ✅ Secure with proper RLS policies

---

## 🔮 Future Enhancements (Optional)

1. **Review Mode**: Show correct answers after completion
2. **Analytics Dashboard**: Track class performance
3. **Question Bank**: Reuse questions across quizzes
4. **Timed Quizzes**: Enforce strict time limits
5. **Certificates**: Generate completion certificates
6. **Leaderboards**: Compare student scores
7. **Question Types**: True/False, Fill-in-blank, Matching

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check terminal logs for API errors
3. Verify Supabase SQL was run successfully
4. Ensure OpenAI API key is valid
5. Check that course has materials with embeddings

Happy quizzing! 🎓✨
