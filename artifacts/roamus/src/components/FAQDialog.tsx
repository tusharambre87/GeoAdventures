import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FAQDialogProps {
  open: boolean;
  onClose: () => void;
}

const FAQ_DATA = [
  {
    id: "what-is",
    question: "What is GeoQuest: Guess and Go?",
    answer: "GeoQuest: Guess and Go is a fast, fun geography game where kids guess cities, countries, continents, and landmarks using simple clues. Each round takes less than a minute — perfect for quick learning bursts."
  },
  {
    id: "who-for",
    question: "Who is the game for?",
    answer: "Kids ages 4+, parents, educators, and anyone who loves quick, map-based brain challenges."
  },
  {
    id: "how-works",
    question: "How does the game work?",
    answer: "Kids follow a simple and engaging loop: Answer a clue (city, country, or continent), guess the correct location, complete missions, win stars, unlock fun explorer milestones, and gradually become a Master Explorer while discovering new cities around the world. Easy to play. Hard to put down!"
  },
  {
    id: "safe-kids",
    question: "Is GeoQuest safe for kids?",
    answer: "Absolutely! GeoQuest is built with kid-safety at its core: No ads, no tracking, no chat or social sharing without a parental gate, COPPA & GDPR-K compliant, and a simple, clean interface ideal for young learners."
  },
  {
    id: "need-account",
    question: "Does my child need an account to play?",
    answer: "Nope — you can open the app and start playing instantly. No signup, no friction. But if you do sign up, you unlock extras like: Progress tracking, earning stars over time, unlocking fun characters, saving your explorer streak, and getting daily quests straight to your inbox."
  },
  {
    id: "free",
    question: "Is the game free?",
    answer: "Yes! The core game is free to play. You can also pre-order the physical GeoQuest card game, which brings the same fun learning experience to your home."
  },
  {
    id: "what-learn",
    question: "What will my child learn?",
    answer: "GeoQuest is inspired by National Geographic learning frameworks and Harvard Project Zero research on 'learning through play'. Kids learn: Map shapes & location recognition, world cities and countries, landmarks & global culture, memory, reasoning, and visual thinking. When learning feels fun → kids remember more, stay curious longer, and build confidence naturally."
  },
  {
    id: "round-length",
    question: "How long is each round?",
    answer: "Most rounds take 30–60 seconds, making it perfect for: Car rides, waiting rooms, quick breaks, and classroom warm-ups."
  },
  {
    id: "age-adjust",
    question: "Does the game adjust to my child's age?",
    answer: "The main game does not auto-adjust by age, but: The core game includes easy to hard clues so kids can progress at their own pace, and our CrossWorld mode includes different levels for skill-building and challenge. The goal is simple: learn first, win second."
  },
  {
    id: "offline",
    question: "Can my child play offline?",
    answer: "Yes! The game works offline. New content downloads when you're online, but gameplay works anywhere."
  },
  {
    id: "adults",
    question: "Can adults play too?",
    answer: "Yes! Many parents play with their kids — and surprisingly, it's just as fun for grown-ups."
  },
  {
    id: "devices",
    question: "What devices does GeoQuest support?",
    answer: "GeoQuest works on any modern web browser on desktop, tablet, or mobile devices. The physical card game can be pre-ordered separately."
  },
  {
    id: "more-content",
    question: "Will there be more cities, countries, and characters?",
    answer: "Yes — we're constantly adding: New cities, new country sets, more animals, new missions, new difficulty levels, and expansion packs. GeoQuest grows with your little explorer."
  },
  {
    id: "report-bug",
    question: "How do I report a bug or request a feature?",
    answer: "Simple — email us anytime at support@geoquestgame.com. We love feedback from parents!"
  },
  {
    id: "physical-game",
    question: "Is GeoQuest connected to a physical game?",
    answer: "Yes — GeoQuest also has a physical card game, built to match the same learning style and fun clues from the app. Great for: Travel, family time, and classroom activities. Pre-orders are open now!"
  },
  {
    id: "board-game",
    question: "Is GeoQuest a board game?",
    answer: "Not a board game — it's a card game designed for fast play, portability, and simple rules."
  },
  {
    id: "reminders",
    question: "How can I get reminders and daily quests?",
    answer: "Just sign up inside the app and turn on email reminders. You'll get: Daily quests, streak reminders, new city packs, and physical game updates."
  }
];

export function FAQDialog({ open, onClose }: FAQDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 [&>button]:hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-3xl font-heading text-white flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-yellow-400" />
              F.A.Q.
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
              data-testid="button-close-faq"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ_DATA.map((faq) => (
              <AccordionItem 
                key={faq.id} 
                value={faq.id}
                className="border-b border-slate-700 last:border-b-0"
                data-testid={`faq-item-${faq.id}`}
              >
                <AccordionTrigger 
                  className="text-white text-left text-base font-semibold hover:text-yellow-400 hover:no-underline py-5 [&[data-state=open]]:text-yellow-400"
                  data-testid={`faq-trigger-${faq.id}`}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 text-sm leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <div className="mt-8 mb-4 text-center">
            <p className="text-slate-400 text-sm">
              Still have questions? Email us at{" "}
              <a 
                href="mailto:support@geoquestgame.com" 
                className="text-yellow-400 hover:underline"
              >
                support@geoquestgame.com
              </a>
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
