import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, MessageCircle, AlertTriangle, HelpCircle, Send, FileImage } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", 
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", 
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", 
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", 
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", 
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", 
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", 
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", 
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", 
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", 
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", 
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", 
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", 
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", 
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", 
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", 
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", 
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", 
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", 
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", 
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", 
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const FEEDBACK_TYPES = [
  { value: "technical", label: "Technical Issue / Bug", icon: "🐛" },
  { value: "suggestion", label: "Feature Suggestion", icon: "💡" },
  { value: "content", label: "Content Question", icon: "📚" },
  { value: "account", label: "Account Issue", icon: "👤" },
  { value: "other", label: "Other Feedback", icon: "💬" },
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB total
const MAX_FILES = 10;

interface FileWithPreview {
  file: File;
  preview?: string;
}

export default function Support() {
  const [, setLocation] = useLocation();
  
  const [preCheck1, setPreCheck1] = useState(false);
  const [preCheck2, setPreCheck2] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} files`);
      return;
    }
    
    const totalSize = [...files.map(f => f.file), ...selectedFiles].reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      toast.error("Total file size cannot exceed 100MB");
      return;
    }
    
    const newFiles: FileWithPreview[] = selectedFiles.map(file => {
      const fileWithPreview: FileWithPreview = { file };
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      return fileWithPreview;
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('feedbackType', feedbackType);
      formData.append('country', country);
      formData.append('email', email);
      formData.append('description', description);
      
      files.forEach((f, i) => {
        formData.append(`file${i}`, f.file);
      });
      
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success("Thank you! Your feedback has been submitted.");
      setFeedbackType("");
      setCountry("");
      setEmail("");
      setDescription("");
      setFiles([]);
      setPreCheck1(false);
      setPreCheck2(false);
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!preCheck1 || !preCheck2) {
      toast.error("Please confirm the pre-checks before submitting");
      return;
    }
    
    if (!feedbackType) {
      toast.error("Please select a feedback type");
      return;
    }
    
    if (!country) {
      toast.error("Please select your country");
      return;
    }
    
    if (!description.trim()) {
      toast.error("Please describe your feedback");
      return;
    }
    
    submitMutation.mutate();
  };

  const totalFileSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const fileSizeMB = (totalFileSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/50"
            data-testid="button-back-support"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💌</div>
            <h1 className="text-3xl md:text-4xl font-heading text-purple-800 dark:text-purple-300 mb-2">
              GeoQuest Support & Feedback
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Hello and thank you for playing GeoQuest! Your feedback helps us make the game better for explorers everywhere.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Before You Submit
              </h2>
              <p className="text-amber-700 dark:text-amber-400 mb-4">
                If you're experiencing a technical issue, please confirm the following:
              </p>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={preCheck1}
                    onCheckedChange={(checked) => setPreCheck1(checked === true)}
                    className="mt-1"
                    data-testid="checkbox-precheck1"
                  />
                  <span className="text-amber-800 dark:text-amber-300">
                    I have tried refreshing the page and clearing my browser cache/cookies
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={preCheck2}
                    onCheckedChange={(checked) => setPreCheck2(checked === true)}
                    className="mt-1"
                    data-testid="checkbox-precheck2"
                  />
                  <span className="text-amber-800 dark:text-amber-300">
                    I have tried using a different browser or device to see if the issue persists
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Common Questions (Please Read First!)
              </h2>
              
              <div className="space-y-4 text-sm">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">🌍 "Why can't I play Daily Quest again today?"</p>
                  <p className="text-blue-700 dark:text-blue-400">Daily Quest resets at midnight UTC. Each explorer can play once per day to keep it fair and exciting!</p>
                </div>
                
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">⭐ "My stars aren't showing up!"</p>
                  <p className="text-blue-700 dark:text-blue-400">Stars are saved per explorer. Make sure you're logged in with the correct explorer profile. If you were offline, stars will sync when you reconnect.</p>
                </div>
                
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">🎴 "How do I unlock more mini-games?"</p>
                  <p className="text-blue-700 dark:text-blue-400">Collect stickers by playing Daily Quest! Trade 5 stickers to unlock coloring sheets and play more games in the Treasure Vault.</p>
                </div>
                
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">👨‍👩‍👧‍👦 "Can multiple kids use the same account?"</p>
                  <p className="text-blue-700 dark:text-blue-400">Yes! You can create up to 5 explorer profiles (4 kids + 1 adult) under one parent account. Each explorer has their own progress!</p>
                </div>
                
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">📱 "The app isn't working offline"</p>
                  <p className="text-blue-700 dark:text-blue-400">Make sure you've installed the app from your browser (look for "Add to Home Screen"). Premium users get full offline access!</p>
                </div>
              </div>
              
              <p className="mt-4 text-blue-600 dark:text-blue-400 text-sm italic">
                If your question is answered above, you may not need to submit feedback!
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What type of feedback are you sharing? *
                </label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger className="w-full" data-testid="select-feedback-type">
                    <SelectValue placeholder="Select feedback type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What country are you contacting from? *
                </label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="w-full" data-testid="select-country">
                    <SelectValue placeholder="Select your country..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your email (optional, but recommended for account issues)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full"
                  data-testid="input-email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe your feedback *
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue or feedback in detail. Include what you expected to happen and what actually happened..."
                  className="w-full min-h-[150px]"
                  data-testid="textarea-description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileImage className="w-4 h-4 inline mr-1" />
                  Screenshots (optional - helps us understand the issue!)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Upload up to {MAX_FILES} files, max 100MB total. Images help us investigate faster!
                </p>
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Click to upload screenshots
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {files.length}/{MAX_FILES} files • {fileSizeMB}/100 MB used
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-files"
                />
                
                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.preview ? (
                          <img
                            src={f.preview}
                            alt={f.file.name}
                            className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            <FileImage className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-500 truncate mt-1">{f.file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-bold rounded-xl"
              data-testid="button-submit-feedback"
            >
              {submitMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              You can also reach us directly at{" "}
              <a href="mailto:support@geoquestgame.com" className="text-purple-600 dark:text-purple-400 hover:underline">
                support@geoquestgame.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
