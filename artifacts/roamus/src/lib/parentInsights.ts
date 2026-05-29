export interface ParentInsight {
  text: string;
  category: 'memory' | 'engagement' | 'connection' | 'learning';
  emoji: string;
}

export const PARENT_INSIGHTS: ParentInsight[] = [
  {
    text: "Quality over quantity — a few meaningful moments often stick better than dozens of rushed photos.",
    category: 'memory',
    emoji: '🧠'
  },
  {
    text: "Try asking your child to explain what they saw later. Teaching reinforces learning.",
    category: 'learning',
    emoji: '💭'
  },
  {
    text: "Before arriving, ask what they think they'll see. Predictions spark curiosity.",
    category: 'learning',
    emoji: '🔮'
  },
  {
    text: "Sometimes a quiet moment together creates the strongest memories.",
    category: 'connection',
    emoji: '🤫'
  },
  {
    text: "Let your child choose one thing to notice. Ownership builds engagement.",
    category: 'engagement',
    emoji: '👀'
  },
  {
    text: "Revisiting photos together later can bring back details you both forgot.",
    category: 'memory',
    emoji: '📸'
  },
  {
    text: "Naming feelings during travel ('This feels exciting!') helps kids process experiences.",
    category: 'connection',
    emoji: '❤️'
  },
  {
    text: "Kids connect with geography when it ties to something they already care about.",
    category: 'learning',
    emoji: '🌍'
  },
  {
    text: "Short 'what if' conversations often spark more curiosity than long explanations.",
    category: 'engagement',
    emoji: '🚗'
  },
  {
    text: "Your child's questions matter more than having all the answers.",
    category: 'connection',
    emoji: '🙋'
  }
];

export const COMPLETION_INSIGHTS: ParentInsight[] = [
  {
    text: "Reading this story together in a few weeks can help strengthen these memories.",
    category: 'memory',
    emoji: '📖'
  },
  {
    text: "Your family just created something special that only you share.",
    category: 'connection',
    emoji: '💝'
  },
  {
    text: "The moments you captured will help your kids remember details they might otherwise forget.",
    category: 'memory',
    emoji: '✨'
  },
  {
    text: "Taking time to reflect on a trip can make the memories last longer.",
    category: 'learning',
    emoji: '🌟'
  }
];

export function getRandomParentInsight(): ParentInsight {
  return PARENT_INSIGHTS[Math.floor(Math.random() * PARENT_INSIGHTS.length)];
}

export function getRandomCompletionInsight(): ParentInsight {
  return COMPLETION_INSIGHTS[Math.floor(Math.random() * COMPLETION_INSIGHTS.length)];
}

export function getCategoryColor(category: ParentInsight['category']): string {
  switch (category) {
    case 'memory': return 'text-purple-600 dark:text-purple-400';
    case 'engagement': return 'text-orange-600 dark:text-orange-400';
    case 'connection': return 'text-pink-600 dark:text-pink-400';
    case 'learning': return 'text-green-600 dark:text-green-400';
    default: return 'text-slate-600 dark:text-slate-400';
  }
}

export function getCategoryBg(category: ParentInsight['category']): string {
  switch (category) {
    case 'memory': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    case 'engagement': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    case 'connection': return 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800';
    case 'learning': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    default: return 'bg-slate-50 dark:bg-slate-900/20';
  }
}
