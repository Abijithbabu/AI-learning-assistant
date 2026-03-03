# MCQ Quiz Implementation Plan

## Overview

Implement a comprehensive quiz system to validate student performance for each course with AI-generated MCQs.

---

## Phase 1: Database Schema Setup

### 1.1 Create Quiz Tables

Create the following tables in Supabase:

```sql
-- Quiz table (one or more quizzes per course)
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text,
  passing_score integer default 70, -- percentage
  time_limit integer, -- minutes (null = no limit)
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Questions table
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  question_text text not null,
  question_type text default 'multiple_choice' check (question_type in ('multiple_choice', 'true_false')),
  points integer default 1,
  order_index integer not null,
  explanation text, -- shown after answering
  created_at timestamp with time zone default now()
);

-- Answer options table
create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade not null,
  option_text text not null,
  is_correct boolean default false,
  order_index integer not null,
  created_at timestamp with time zone default now()
);

-- Student quiz attempts table
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  score integer, -- percentage
  total_points_earned integer,
  total_points_possible integer,
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  time_spent integer, -- seconds
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamp with time zone default now()
);

-- Student answers table
create table student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quiz_attempts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  selected_option_id uuid references answer_options(id) on delete set null,
  is_correct boolean,
  points_earned integer default 0,
  answered_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_quizzes_course on quizzes(course_id);
create index idx_questions_quiz on questions(quiz_id);
create index idx_answer_options_question on answer_options(question_id);
create index idx_quiz_attempts_student on quiz_attempts(student_id);
create index idx_quiz_attempts_quiz on quiz_attempts(quiz_id);
create index idx_student_answers_attempt on student_answers(attempt_id);

-- RLS Policies
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table quiz_attempts enable row level security;
alter table student_answers enable row level security;

-- Students can view published quizzes
create policy "Students can view published quizzes"
  on quizzes for select
  using (is_published = true);

-- Students can view questions for published quizzes
create policy "Students can view questions"
  on questions for select
  using (
    exists (
      select 1 from quizzes
      where quizzes.id = questions.quiz_id
      and quizzes.is_published = true
    )
  );

-- Students can view answer options
create policy "Students can view answer options"
  on answer_options for select
  using (
    exists (
      select 1 from questions
      join quizzes on quizzes.id = questions.quiz_id
      where questions.id = answer_options.question_id
      and quizzes.is_published = true
    )
  );

-- Students can create and view their own attempts
create policy "Students can create quiz attempts"
  on quiz_attempts for insert
  with check (auth.uid() = student_id);

create policy "Students can view own attempts"
  on quiz_attempts for select
  using (auth.uid() = student_id);

create policy "Students can update own attempts"
  on quiz_attempts for update
  using (auth.uid() = student_id);

-- Students can create and view their own answers
create policy "Students can create answers"
  on student_answers for insert
  with check (
    exists (
      select 1 from quiz_attempts
      where quiz_attempts.id = student_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );

create policy "Students can view own answers"
  on student_answers for select
  using (
    exists (
      select 1 from quiz_attempts
      where quiz_attempts.id = student_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );
```

---

## Phase 2: AI Quiz Generation

### 2.1 Create Quiz Generator Function

**File**: `lib/ai/quiz-generator.ts`

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MCQOption {
  text: string;
  isCorrect: boolean;
}

interface MCQQuestion {
  question: string;
  options: MCQOption[];
  explanation: string;
  points: number;
}

interface QuizStructure {
  title: string;
  description: string;
  questions: MCQQuestion[];
}

export async function generateQuizForCourse(
  courseId: string,
  numQuestions: number = 10,
): Promise<string> {
  const supabase = createAdminClient();

  // 1. Fetch course content from embeddings
  const { data: chunks, error } = await supabase
    .from("embeddings")
    .select("content, material_id")
    .in(
      "material_id",
      (
        await supabase.from("materials").select("id").eq("course_id", courseId)
      ).data?.map((m) => m.id) || [],
    )
    .order("chunk_index", { ascending: true });

  if (error || !chunks || chunks.length === 0) {
    throw new Error("No content found for course");
  }

  // Combine content (limit to reasonable size)
  const fullText = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 50000);

  console.log(
    `[Quiz Generator] Generating quiz for course ${courseId} with ${numQuestions} questions`,
  );

  // 2. Generate quiz with OpenAI
  const systemPrompt = `You are an expert educator creating a multiple-choice quiz.
  
Your task is to analyze the provided learning materials and create a comprehensive quiz with ${numQuestions} questions.

Requirements:
- Each question should have exactly 4 answer options
- Only ONE option should be correct
- Questions should cover key concepts from the material
- Include a brief explanation for each correct answer
- Vary difficulty levels (easy, medium, hard)
- Make distractors (wrong answers) plausible but clearly incorrect
- Questions should test understanding, not just memorization

Output a JSON object with this structure:
{
  "title": "Quiz Title",
  "description": "Brief description",
  "questions": [
    {
      "question": "Question text?",
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ],
      "explanation": "Why option B is correct...",
      "points": 1
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a quiz based on this content:\n\n${fullText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) throw new Error("No response from AI");

    const quizData: QuizStructure = JSON.parse(responseContent);

    // 3. Save quiz to database
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        course_id: courseId,
        title: quizData.title,
        description: quizData.description,
        is_published: false, // Admin needs to review and publish
      })
      .select()
      .single();

    if (quizError || !quiz) throw quizError;

    // 4. Save questions and answers
    for (const [index, q] of quizData.questions.entries()) {
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          quiz_id: quiz.id,
          question_text: q.question,
          question_type: "multiple_choice",
          points: q.points,
          order_index: index + 1,
          explanation: q.explanation,
        })
        .select()
        .single();

      if (questionError || !question) throw questionError;

      // Insert answer options
      const optionsToInsert = q.options.map((opt, optIndex) => ({
        question_id: question.id,
        option_text: opt.text,
        is_correct: opt.isCorrect,
        order_index: optIndex + 1,
      }));

      const { error: optionsError } = await supabase
        .from("answer_options")
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;
    }

    console.log(`Quiz ${quiz.id} generated successfully!`);
    return quiz.id;
  } catch (e) {
    console.error("Failed to generate quiz:", e);
    throw e;
  }
}
```

### 2.2 Create Quiz Generation API Route

**File**: `app/api/courses/[id]/generate-quiz/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateQuizForCourse } from "@/lib/ai/quiz-generator";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may want to add this check)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { numQuestions = 10 } = await request.json();
    const quizId = await generateQuizForCourse(params.id, numQuestions);

    return NextResponse.json({ success: true, quizId });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
```

---

## Phase 3: Frontend Components

### 3.1 Quiz List Page

**File**: `app/courses/[id]/quizzes/page.tsx`

```typescript
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList, Clock, Trophy } from "lucide-react";

export default async function QuizzesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(
      `
      *,
      questions(count),
      quiz_attempts(
        id,
        score,
        completed_at,
        status
      )
    `
    )
    .eq("course_id", params.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quizzes
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Test your knowledge and track your progress
        </p>
      </div>

      <div className="grid gap-4">
        {quizzes?.map((quiz) => {
          const attempts = quiz.quiz_attempts || [];
          const completedAttempts = attempts.filter(
            (a: any) => a.status === "completed"
          );
          const bestScore = completedAttempts.length
            ? Math.max(...completedAttempts.map((a: any) => a.score))
            : null;

          return (
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
                    {quiz.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      {quiz.questions[0]?.count || 0} questions
                    </span>
                    {quiz.time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {quiz.time_limit} min
                      </span>
                    )}
                    {bestScore !== null && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Trophy className="w-4 h-4" />
                        Best: {bestScore}%
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/courses/${params.id}/quizzes/${quiz.id}`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  {completedAttempts.length > 0 ? "Retake" : "Start Quiz"}
                </Link>
              </div>
            </div>
          );
        })}

        {!quizzes || quizzes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No quizzes available yet
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

### 3.2 Quiz Taking Page

**File**: `app/courses/[id]/quizzes/[quizId]/page.tsx`

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QuizInterface from "./quiz-interface";

export default async function QuizPage({
  params,
}: {
  params: { id: string; quizId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch quiz with questions and options
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      `
      *,
      questions(
        *,
        answer_options(*)
      )
    `
    )
    .eq("id", params.quizId)
    .single();

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  // Sort questions and options by order_index
  quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index);
  quiz.questions.forEach((q: any) => {
    q.answer_options.sort((a: any, b: any) => a.order_index - b.order_index);
  });

  return <QuizInterface quiz={quiz} courseId={params.id} />;
}
```

### 3.3 Quiz Interface Component

**File**: `app/courses/[id]/quizzes/[quizId]/quiz-interface.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { submitQuizAttempt } from "./actions";

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

export default function QuizInterface({
  quiz,
  courseId,
}: {
  quiz: any;
  courseId: string;
}) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectOption = (optionId: string) => {
    const newAnswers = answers.filter(
      (a) => a.questionId !== currentQuestion.id
    );
    newAnswers.push({
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
    });
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitQuizAttempt(quiz.id, answers, timeElapsed);
      setResults(result);
      setShowResults(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAnswer = answers.find(
    (a) => a.questionId === currentQuestion.id
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            {results.score >= quiz.passing_score ? (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {results.score}%
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {results.score >= quiz.passing_score ? "Passed!" : "Keep trying!"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Correct
              </p>
              <p className="text-2xl font-bold text-green-600">
                {results.correctCount}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Incorrect
              </p>
              <p className="text-2xl font-bold text-red-600">
                {results.incorrectCount}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatTime(timeElapsed)}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/courses/${courseId}/quizzes`)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Quizzes
            </button>
            <button
              onClick={() => router.refresh()}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {quiz.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="font-mono text-gray-900 dark:text-white">
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {currentQuestion.question_text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.answer_options.map((option: any) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswer?.selectedOptionId === option.id
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
              }`}
            >
              <span className="text-gray-900 dark:text-white">
                {option.option_text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {answers.length} of {quiz.questions.length} answered
        </div>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || answers.length !== quiz.questions.length}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
```

### 3.4 Quiz Submission Actions

**File**: `app/courses/[id]/quizzes/[quizId]/actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Answer[],
  timeSpent: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Create quiz attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      student_id: user.id,
      status: "in_progress",
      time_spent: timeSpent,
    })
    .select()
    .single();

  if (attemptError || !attempt) throw attemptError;

  // 2. Get all questions with correct answers
  const { data: questions } = await supabase
    .from("questions")
    .select(
      `
      id,
      points,
      answer_options(id, is_correct)
    `,
    )
    .eq("quiz_id", quizId);

  if (!questions) throw new Error("Questions not found");

  let totalPointsEarned = 0;
  let totalPointsPossible = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  // 3. Save each answer and calculate score
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;

    const selectedOption = question.answer_options.find(
      (opt: any) => opt.id === answer.selectedOptionId,
    );

    const isCorrect = selectedOption?.is_correct || false;
    const pointsEarned = isCorrect ? question.points : 0;

    if (isCorrect) correctCount++;
    else incorrectCount++;

    totalPointsEarned += pointsEarned;
    totalPointsPossible += question.points;

    await supabase.from("student_answers").insert({
      attempt_id: attempt.id,
      question_id: answer.questionId,
      selected_option_id: answer.selectedOptionId,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });
  }

  // 4. Calculate final score percentage
  const score =
    totalPointsPossible > 0
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
      : 0;

  // 5. Update attempt with final score
  await supabase
    .from("quiz_attempts")
    .update({
      score,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      completed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", attempt.id);

  return {
    score,
    correctCount,
    incorrectCount,
    totalPointsEarned,
    totalPointsPossible,
  };
}
```

---

## Phase 4: Admin Features

### 4.1 Generate Quiz Button in Course Page

Add a button for admins to generate quizzes:

```typescript
// In app/courses/[id]/page.tsx

{profile?.role === 'admin' && (
  <button
    onClick={async () => {
      const res = await fetch(`/api/courses/${courseId}/generate-quiz`, {
        method: 'POST',
        body: JSON.stringify({ numQuestions: 10 })
      });
      const data = await res.json();
      if (data.success) {
        alert('Quiz generated successfully!');
        router.refresh();
      }
    }}
    className="px-4 py-2 bg-green-600 text-white rounded-lg"
  >
    Generate Quiz
  </button>
)}
```

### 4.2 Quiz Management Page (Optional)

Create an admin page to review, edit, and publish quizzes.

---

## Phase 5: Navigation & Integration

### 5.1 Add Quizzes Tab to Course Page

Update your course navigation to include a "Quizzes" tab alongside "Chat" and "Materials".

### 5.2 Update Course Layout

Add quiz links to the course sidebar/navigation.

---

## Implementation Checklist

- [ ] **Phase 1**: Run database schema SQL in Supabase
- [ ] **Phase 2**: Create quiz generator functions and API routes
- [ ] **Phase 3**: Build frontend quiz components
- [ ] **Phase 4**: Add admin controls for quiz generation
- [ ] **Phase 5**: Integrate quizzes into course navigation
- [ ] **Testing**: Test quiz generation, taking, and scoring
- [ ] **Polish**: Add loading states, error handling, animations

---

## Future Enhancements

1. **Analytics Dashboard**: Track student performance across all quizzes
2. **Question Bank**: Reuse questions across multiple quizzes
3. **Adaptive Quizzes**: Adjust difficulty based on student performance
4. **Explanations**: Show detailed explanations after quiz completion
5. **Review Mode**: Let students review their answers
6. **Certificate Generation**: Issue certificates for passing scores
7. **Timed Quizzes**: Add strict time limits with auto-submission
8. **Question Types**: Add true/false, fill-in-the-blank, matching

---

## Summary

This implementation provides:

- ✅ AI-generated MCQ quizzes from course materials
- ✅ Student quiz-taking interface with real-time tracking
- ✅ Automatic scoring and performance analytics
- ✅ Multiple attempts with best score tracking
- ✅ Admin controls for quiz generation and management
- ✅ Clean, modern UI with dark mode support
