"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { submitQuizAttempt } from "./actions";

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

interface QuizOption {
  id: string;
  option_text: string;
  order_index: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  explanation?: string;
  answer_options: QuizOption[];
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  time_limit?: number;
  passing_score: number;
  questions: QuizQuestion[];
}

interface QuizResults {
  score: number;
  correctCount: number;
  incorrectCount: number;
  totalPointsEarned: number;
  totalPointsPossible: number;
}

export default function QuizInterface({
  quiz,
  courseId,
}: {
  quiz: Quiz;
  courseId: string;
}) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    if (!showResults) {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showResults]);

  const handleSelectOption = (optionId: string) => {
    const newAnswers = answers.filter(
      (a) => a.questionId !== currentQuestion.id,
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
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAnswer = answers.find(
    (a) => a.questionId === currentQuestion.id,
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const unansweredCount = quiz.questions.length - answers.length;

  // Results view
  if (showResults && results) {
    const passed = results.score >= quiz.passing_score;

    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            {passed ? (
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
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {passed ? "Congratulations! You passed!" : "Keep studying!"}
            </p>
            {!passed && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Passing score: {quiz.passing_score}%
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Correct
              </p>
              <p className="text-2xl font-bold text-green-600">
                {results.correctCount}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Incorrect
              </p>
              <p className="text-2xl font-bold text-red-600">
                {results.incorrectCount}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Time
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {formatTime(timeElapsed)}
              </p>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-900 dark:text-purple-100">
              <strong>Score:</strong> {results.totalPointsEarned} out of{" "}
              {results.totalPointsPossible} points
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/courses/${courseId}/quizzes`)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Back to Quizzes
            </button>
            <button
              onClick={() => router.refresh()}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation dialog
  if (showConfirmDialog) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Submit Quiz?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to submit your answers?
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Answered:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {answers.length} / {quiz.questions.length}
              </span>
            </div>
            {unansweredCount > 0 && (
              <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                ⚠️ You have {unansweredCount} unanswered question
                {unansweredCount !== 1 ? "s" : ""}
              </div>
            )}
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600 dark:text-gray-400">
                Time taken:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(timeElapsed)}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Review Answers
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz taking view
  return (
    <div className="max-w-3xl mx-auto p-4">
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
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="font-mono text-gray-900 dark:text-white font-medium">
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {Math.round(
              ((currentQuestionIndex + 1) / quiz.questions.length) * 100,
            )}
            %
          </span>
        </div>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {currentQuestionIndex + 1}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex-1">
            {currentQuestion.question_text}
          </h2>
        </div>

        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {currentQuestion.answer_options.map((option: any, index: number) => {
            const isSelected = selectedAnswer?.selectedOptionId === option.id;
            const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all group ${
                  isSelected
                    ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "border-purple-600 bg-purple-600"
                        : "border-gray-300 dark:border-gray-600 group-hover:border-purple-400"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                      Option {optionLabel}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {option.option_text}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Navigator */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Jump to question:
        </p>
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {quiz.questions.map((_: any, index: number) => {
            const isAnswered = answers.some(
              (a) => a.questionId === quiz.questions[index].id,
            );
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all ${
                  isCurrent
                    ? "border-purple-600 bg-purple-600 text-white"
                    : isAnswered
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-500"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Previous
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {answers.length} of {quiz.questions.length} answered
          </p>
          {unansweredCount > 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {unansweredCount} remaining
            </p>
          )}
        </div>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            Finish Quiz
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
