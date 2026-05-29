const INAPPROPRIATE_WORDS = [
  'fuck', 'shit', 'ass', 'damn', 'hell', 'bitch', 'bastard', 'crap',
  'dick', 'cock', 'pussy', 'penis', 'vagina', 'boob', 'tit', 'anus',
  'slut', 'whore', 'hoe', 'nigger', 'nigga', 'fag', 'faggot', 'retard',
  'cunt', 'twat', 'prick', 'wanker', 'bollocks', 'arsehole', 'asshole',
  'motherfucker', 'fucker', 'bullshit', 'horseshit', 'dumbass', 'jackass',
  'dipshit', 'shithead', 'dickhead', 'pissed', 'piss', 'cum', 'jizz',
  'dildo', 'vibrator', 'porn', 'xxx', 'nude', 'naked',
  'kill', 'murder', 'rape', 'molest', 'abuse', 'racist', 'nazi', 'hitler',
  'terrorist', 'bomb', 'cocaine', 'heroin', 'meth',
  'stupid', 'idiot', 'moron', 'loser', 'ugly', 'dumb',
  'hate', 'die', 'suicide', 'cutting',
  'butthole', 'buttwipe', 'screw', 'screwing', 'fck', 'fcuk', 'fuk',
  'wtf', 'stfu', 'lmfao', 'lmao', 'omfg',
  'arse', 'bugger', 'bloody', 'sodding', 'tosser', 'knob', 'bellend',
  'chink', 'spic', 'wetback', 'beaner', 'kike', 'gook', 'jap',
  'cracker', 'honky', 'redneck', 'trailer trash',
  'homo', 'queer', 'dyke', 'tranny', 'shemale',
  'pedophile', 'pedo', 'pervert', 'molester',
  'hooker', 'prostitute', 'pimp', 'stripper',
  'jackoff', 'jerkoff', 'wank', 'masturbate', 'orgasm',
  'erection', 'boner', 'horny', 'slutty', 'kinky',
  'damn', 'dammit', 'goddamn', 'goddammit', 'damnit',
  'cyka', 'blyat', 'kurwa', 'puta', 'mierda', 'perra', 'cabron',
  'putain', 'merde', 'connard', 'salaud', 'enculer',
  'scheiße', 'scheisse', 'arschloch', 'fotze', 'hurensohn',
  'fanculo', 'cazzo', 'stronzo', 'puttana', 'merda',
  'klootzak', 'hoer', 'kut', 'godverdomme',
  'suka', 'bljad', 'huj', 'pizdec',
  'cancer', 'aids', 'hiv', 'corona', 'covid',
  'shooting', 'shooter', 'gunman', 'massacre',
  'jihad', 'isis', 'alqaeda', 'taliban',
  'kkk', 'klan', 'supremacist', 'aryan',
  'noob', 'n00b', 'newb', 'pwned', 'pwn',
  'suck', 'sucker', 'sucks', 'sucking', 'blows',
  'crap', 'crappy', 'craps', 'crapping',
  'butt', 'butthead', 'buttface', 'buttmunch',
  'fart', 'farted', 'farts', 'farting',
  'poop', 'poopy', 'pooped', 'pooping', 'turd',
  'pee', 'peeing', 'peepee', 'weewee',
  'booger', 'snot', 'snotty',
  'brat', 'bratty', 'meanie', 'meanies',
  'shut up', 'shutup', 'stink', 'stinky', 'stinks',
  'gross', 'yucky', 'icky', 'eww', 'ewww',
  'dork', 'dorky', 'nerd', 'nerdy', 'geek', 'geeky',
  'freak', 'freaky', 'weirdo', 'weird', 'creep', 'creepy',
  'lame', 'lameo', 'pathetic',
  'jerk', 'jerky', 'meanjerk',
];

const LEET_SPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '(': 'c',
  '<': 'c',
  '{': 'c',
  '|': 'l',
  '+': 't',
  '&': 'and',
};

const SEPARATOR_CHARS = /[\s\-_\.\/\\,;:'"!?\(\)\[\]\{\}<>]+/g;

function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  for (const [leet, letter] of Object.entries(LEET_SPEAK_MAP)) {
    const escapedLeet = leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escapedLeet, 'g'), letter);
  }
  
  const withoutSeparators = normalized.replace(SEPARATOR_CHARS, '');
  
  const withoutRepeats = withoutSeparators.replace(/(.)\1{2,}/g, '$1$1');
  
  const lettersOnly = withoutRepeats.replace(/[^a-z]/g, '');
  
  return lettersOnly;
}

export function containsInappropriateContent(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  
  const normalized = normalizeText(text);
  
  for (const word of INAPPROPRIATE_WORDS) {
    const normalizedWord = word.replace(/\s+/g, '');
    if (normalized.includes(normalizedWord)) {
      return true;
    }
  }
  
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/gi, '');
    for (const badWord of INAPPROPRIATE_WORDS) {
      if (cleanWord === badWord || cleanWord.includes(badWord)) {
        return true;
      }
    }
  }
  
  return false;
}

export function validateName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: "Name cannot be empty" };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, message: "Name must be at least 2 characters" };
  }
  
  if (name.trim().length > 30) {
    return { valid: false, message: "Name must be less than 30 characters" };
  }
  
  if (containsInappropriateContent(name)) {
    return { 
      valid: false, 
      message: "Oops! That name isn't allowed. Please choose a different name."
    };
  }
  
  return { valid: true };
}

export function validateText(text: string, fieldName: string = "This field"): { valid: boolean; message?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: true };
  }
  
  if (containsInappropriateContent(text)) {
    return { 
      valid: false, 
      message: `${fieldName} contains inappropriate language. Please use appropriate words.`
    };
  }
  
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: "Email cannot be empty" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: "Please enter a valid email address" };
  }
  
  const localPart = email.split('@')[0];
  if (containsInappropriateContent(localPart)) {
    return { 
      valid: false, 
      message: "Please use an appropriate email address."
    };
  }
  
  return { valid: true };
}

export function validateNames(parentName: string, kidNames: string[]): { valid: boolean; message?: string } {
  const parentResult = validateName(parentName);
  if (!parentResult.valid) {
    return { valid: false, message: `Parent name: ${parentResult.message}` };
  }
  
  for (let i = 0; i < kidNames.length; i++) {
    const kidResult = validateName(kidNames[i]);
    if (!kidResult.valid) {
      return { valid: false, message: `Kid ${i + 1} name: ${kidResult.message}` };
    }
  }
  
  return { valid: true };
}

export function validateAllInputs(inputs: { value: string; fieldName: string; type?: 'name' | 'email' | 'text' }[]): { valid: boolean; message?: string } {
  for (const input of inputs) {
    let result: { valid: boolean; message?: string };
    
    switch (input.type) {
      case 'name':
        result = validateName(input.value);
        break;
      case 'email':
        result = validateEmail(input.value);
        break;
      case 'text':
      default:
        result = validateText(input.value, input.fieldName);
        break;
    }
    
    if (!result.valid) {
      return result;
    }
  }
  
  return { valid: true };
}
