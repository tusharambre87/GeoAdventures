import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

function generateQuestion() {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * 20) + 5;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 8) + 2;
      b = Math.floor(Math.random() * 8) + 2;
      answer = a * b;
      break;
  }

  const wrong1 = answer + Math.floor(Math.random() * 5) + 1;
  const wrong2 = Math.max(0, answer - Math.floor(Math.random() * 5) - 1);
  const options = [answer, wrong1, wrong2].sort(() => Math.random() - 0.5);

  return { text: `${a} ${op} ${b}`, answer, options };
}

interface MathLockModalProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MathLockModal({ open, onSuccess, onCancel }: MathLockModalProps) {
  const [question, setQuestion] = useState(generateQuestion);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [attempts, setAttempts] = useState(0);

  const refresh = useCallback(() => {
    setQuestion(generateQuestion());
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setAttempts(0);
    }
  }, [open, refresh]);

  const handleAnswer = (value: number) => {
    if (value === question.answer) {
      setFeedback("correct");
      setTimeout(() => onSuccess(), 400);
    } else {
      setFeedback("wrong");
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 3) {
        setTimeout(() => {
          onCancel();
        }, 800);
      } else {
        setTimeout(() => refresh(), 600);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xs rounded-2xl p-6 text-center" data-testid="math-lock-modal">
        <VisuallyHidden><DialogTitle>Parent Verification</DialogTitle></VisuallyHidden>

        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
          <Shield className="w-7 h-7 text-white" />
        </div>

        <p className="text-sm text-gray-600 mb-4">Solve to continue</p>

        <p className="text-3xl font-bold text-orange-800 mb-5" data-testid="text-math-question">
          {question.text} = ?
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {question.options.map((opt, i) => (
            <Button
              key={i}
              variant="outline"
              className={`text-lg font-bold py-5 rounded-xl transition-all ${
                feedback === "correct" && opt === question.answer
                  ? "bg-green-100 border-green-400 text-green-700"
                  : feedback === "wrong" && opt !== question.answer
                    ? "opacity-50"
                    : "hover:bg-orange-50 hover:border-orange-300"
              }`}
              onClick={() => !feedback && handleAnswer(opt)}
              disabled={!!feedback}
              data-testid={`button-math-option-${i}`}
            >
              {opt}
            </Button>
          ))}
        </div>

        {feedback === "wrong" && (
          <p className="text-sm text-red-500" data-testid="text-math-wrong">
            {attempts >= 3 ? "Too many attempts" : "Try again..."}
          </p>
        )}
        {feedback === "correct" && (
          <p className="text-sm text-green-600" data-testid="text-math-correct">✓ Verified</p>
        )}

        <button
          onClick={refresh}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
          data-testid="button-math-refresh"
        >
          <RefreshCw className="w-3 h-3" /> New question
        </button>
      </DialogContent>
    </Dialog>
  );
}
