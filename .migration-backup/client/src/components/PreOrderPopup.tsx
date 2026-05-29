import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useParentalGate } from "@/components/ParentalGate";

interface PreOrderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function PreOrderPopup({ isOpen, onClose, message }: PreOrderPopupProps) {
  const { requestAccess } = useParentalGate();

  const handlePreOrderClick = () => {
    requestAccess(() => {
      window.open("https://geoquestgame.com/", "_blank");
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-blue-600 to-indigo-700 border-4 border-yellow-400 rounded-[2rem] max-w-md text-center p-0 overflow-hidden shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Pre-Order GeoQuest Junior</DialogTitle>
        <div className="relative p-8">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-4 left-4 text-yellow-300 animate-pulse">✨</div>
            <div className="absolute bottom-10 right-10 text-yellow-300 animate-pulse delay-700">✨</div>
            <div className="absolute top-1/2 right-4 text-yellow-300 animate-pulse delay-300">✨</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm inline-block px-4 py-1 rounded-full text-yellow-300 font-bold text-sm mb-4 border border-yellow-400/30">
            LEVEL UP YOUR ADVENTURE!
          </div>

          <h2 className="text-4xl font-heading text-white mb-2 drop-shadow-lg">
            Enjoying the Game?
          </h2>
          
          <p className="text-blue-100 text-lg mb-6 leading-relaxed">
            {message || "You've played your free games! To keep exploring the world, grab the full edition now."}
          </p>

          <div className="bg-white rounded-2xl p-4 shadow-xl transform rotate-1 mb-6">
            <h3 className="font-heading text-2xl text-blue-900 mb-1">GeoQuest Junior</h3>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-3">Guess & Go Edition</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-gray-400 line-through text-xl font-bold">$21.99</span>
              <span className="text-green-600 text-4xl font-heading font-bold">$10.99</span>
            </div>
            <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full inline-block mt-2">
              🎉 50% OFF LIMITED TIME
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-xl py-6 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold rounded-xl shadow-lg border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all"
            onClick={handlePreOrderClick}
            data-testid="preorder-button"
          >
            Pre-Order Now! 🚀
          </Button>
          
          <button 
            onClick={onClose}
            className="mt-4 text-blue-200 hover:text-white text-sm font-medium underline decoration-blue-400/50 hover:decoration-white transition-colors"
            data-testid="preorder-later-button"
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
