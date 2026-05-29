export interface DemoStop {
  id: string;
  name: string;
  stopType: string;
  displayOrder: number;
  description: string;
  listenFacts: string[];
  wonderPrompt: string;
  parentTip: string;
  journeyGame: {
    type: 'guess_before_you_see' | 'spot_it' | 'this_or_that' | 'build_it';
    title: string;
    question: string;
    options?: string[];
    correctAnswer?: string;
    items?: string[];
  };
}

export interface DemoTrip {
  id: string;
  name: string;
  destination: string;
  country: string;
  city: string;
  duration: string;
  travelers: string;
  isFreeAdventure?: boolean;
  maxFreeStops?: number;
  stops: DemoStop[];
}

/**
 * Free Adventure: Paris
 * Full 7-stop experience for all users. Demonstrates the complete GeoAdventures
 * experience with Journey Packs, games, and exploration. Collage Maker is free.
 * Video Maker and 8+ stops require GeoQuest Explorer subscription.
 */
export const DEMO_TRIP: DemoTrip = {
  id: 'demo-paris-adventure',
  name: 'Free Adventure: Paris',
  destination: 'Paris, France',
  country: 'France',
  city: 'Paris',
  duration: '2 Days',
  travelers: '1 Adult + 1 Child',
  isFreeAdventure: true,
  maxFreeStops: 7,
  stops: [
    {
      id: 'demo-stop-1-eiffel',
      name: 'Eiffel Tower',
      stopType: 'landmark',
      displayOrder: 1,
      description: 'The iconic iron tower that defines the Paris skyline',
      listenFacts: [
        "Did you know the Eiffel Tower was built over 130 years ago? It was made for a big world's fair in 1889!",
        "The tower is made of 18,000 pieces of iron held together by 2.5 million rivets. That's a lot of metal!",
        "Every seven years, painters cover the entire tower with 60 tons of paint to keep it looking beautiful.",
        "At night, the tower sparkles with 20,000 light bulbs for five minutes every hour. People come from all over the world just to see it twinkle!"
      ],
      wonderPrompt: "Can you spot something tall or shiny around you? Look up — what do you notice about things that reach toward the sky?",
      parentTip: "Ask your child: Why do you think people built something this tall? What would you build if you could make something the whole world would see?",
      journeyGame: {
        type: 'guess_before_you_see',
        title: 'Guess Before You See',
        question: 'How many floors does the Eiffel Tower have that visitors can explore?',
        options: ['2 floors', '3 floors', '5 floors', '10 floors'],
        correctAnswer: '3 floors'
      }
    },
    {
      id: 'demo-stop-2-louvre',
      name: 'Louvre Museum',
      stopType: 'museum',
      displayOrder: 2,
      description: 'The world\'s largest art museum and home to the Mona Lisa',
      listenFacts: [
        "The Louvre is the biggest art museum in the world! It has over 35,000 works of art inside.",
        "The famous Mona Lisa painting lives here. She's been smiling at visitors for over 500 years!",
        "The glass pyramid at the entrance was added in 1989. Some people didn't like it at first, but now it's one of Paris's most famous sights.",
        "If you spent just 30 seconds looking at each piece of art, it would take you over 100 days to see everything!"
      ],
      wonderPrompt: "What's the most interesting shape you can find in a building or artwork near you? Is it a square, triangle, circle, or something else?",
      parentTip: "Discuss with your child: If you could create any piece of art, what would you make? What story would it tell?",
      journeyGame: {
        type: 'build_it',
        title: 'Build It!',
        question: 'If you were an artist at the Louvre, what would you create?',
        options: ['A giant painting of my family', 'A sculpture of my favorite animal', 'A colorful glass pyramid', 'A treasure chest full of jewels']
      }
    },
    {
      id: 'demo-stop-3-notredame',
      name: 'Notre-Dame Cathedral',
      stopType: 'landmark',
      displayOrder: 3,
      description: 'A beautiful medieval cathedral being rebuilt after a fire',
      listenFacts: [
        "Notre-Dame Cathedral took almost 200 years to build! Workers started in 1163 and finished in 1345.",
        "The cathedral has famous gargoyles — stone creatures that look like monsters. They're actually rain spouts that keep water away from the walls!",
        "In 2019, a fire damaged the cathedral. People from all over the world are helping to rebuild it, keeping the old traditions alive.",
        "The bells of Notre-Dame are so heavy that the biggest one weighs as much as 4 elephants!"
      ],
      wonderPrompt: "Can you find any stone decorations or carvings on buildings around you? What shapes or creatures do you see?",
      parentTip: "Ask your child: What do you think makes a building special enough for people to rebuild it after 800 years? What would you want to protect forever?",
      journeyGame: {
        type: 'this_or_that',
        title: 'This or That?',
        question: 'Which is true about Notre-Dame?',
        options: ['It has flying buttresses (special supports on the outside)', 'It was built in one year'],
        correctAnswer: 'It has flying buttresses (special supports on the outside)'
      }
    },
    {
      id: 'demo-stop-4-montmartre',
      name: 'Sacré-Cœur & Montmartre',
      stopType: 'neighborhood',
      displayOrder: 4,
      description: 'A charming hilltop neighborhood with artists and a beautiful white church',
      listenFacts: [
        "Montmartre is the highest point in Paris! You can see the whole city from the steps of Sacré-Cœur.",
        "This neighborhood was once home to famous artists like Picasso and Van Gogh who painted here.",
        "The white church called Sacré-Cœur is made of special stone that stays white even in rain — it actually cleans itself!",
        "Street artists still draw portraits and paint here every day, just like they did 100 years ago."
      ],
      wonderPrompt: "Look around you — can you find something that an artist might want to paint? What makes it special?",
      parentTip: "Try this: Give your child an imaginary 'artist frame' (make a rectangle with your hands) and have them 'capture' views they'd want to paint.",
      journeyGame: {
        type: 'spot_it',
        title: 'Spot It!',
        question: 'Can you spot someone creating art, painting, or drawing nearby?',
        items: ['An artist with an easel', 'A street musician', 'A colorful painting', 'Someone taking a photo']
      }
    },
    {
      id: 'demo-stop-5-jardin-luxembourg',
      name: 'Jardin du Luxembourg',
      stopType: 'park',
      displayOrder: 5,
      description: 'A beautiful royal garden with fountains, sailboats, and puppet shows',
      listenFacts: [
        "This garden was created for a queen! Queen Marie de Medicis built it in 1612 because she missed the gardens in Italy.",
        "Kids have been sailing toy boats in the fountain here for over 100 years! You can still rent little boats today.",
        "There's a famous puppet theater here where puppets act out fairy tales — it's been entertaining children since 1933.",
        "The garden has over 100 statues of queens and famous women from French history hidden throughout!"
      ],
      wonderPrompt: "What sounds can you hear in a park or garden? Close your eyes and count how many different sounds you notice.",
      parentTip: "Challenge your child to a 'nature hunt' — can they find 3 different types of flowers, 2 birds, and 1 statue?",
      journeyGame: {
        type: 'guess_before_you_see',
        title: 'Guess Before You See',
        question: 'What can kids do at the fountain in Jardin du Luxembourg?',
        options: ['Swim with dolphins', 'Sail toy boats', 'Feed giant fish', 'Play with remote control cars'],
        correctAnswer: 'Sail toy boats'
      }
    },
    {
      id: 'demo-stop-6-seine-cruise',
      name: 'Seine River Cruise',
      stopType: 'activity',
      displayOrder: 6,
      description: 'See Paris from the water on a relaxing boat ride',
      listenFacts: [
        "The Seine River flows right through the middle of Paris, dividing it into two parts — the Left Bank and the Right Bank.",
        "Paris has 37 bridges crossing the Seine! The oldest one, Pont Neuf, is over 400 years old.",
        "Boats have been carrying people and goods on this river for over 2,000 years!",
        "At night, the bridges and buildings along the river light up, making it look like a fairy tale."
      ],
      wonderPrompt: "If you were on a boat, what would you wave at? What do you think fish living in a city river might see?",
      parentTip: "Ask your child: If you could design a bridge, what special feature would it have? A playground? A garden? A slide?",
      journeyGame: {
        type: 'this_or_that',
        title: 'This or That?',
        question: 'How many bridges cross the Seine River in Paris?',
        options: ['37 bridges', '7 bridges'],
        correctAnswer: '37 bridges'
      }
    },
    {
      id: 'demo-stop-7-french-bakery',
      name: 'French Bakery Experience',
      stopType: 'food',
      displayOrder: 7,
      description: 'Discover the magic of French pastries and bread',
      listenFacts: [
        "French bakers wake up at 4 AM every day to make fresh bread and croissants for breakfast!",
        "The croissant isn't originally French — it came from Austria! But French bakers made it famous.",
        "A traditional French baguette must follow strict rules: only flour, water, salt, and yeast are allowed.",
        "There's a competition every year to find the best baguette in Paris. The winner gets to supply bread to the President's palace!"
      ],
      wonderPrompt: "What does fresh bread smell like to you? Can you describe a delicious smell without using the word 'yummy'?",
      parentTip: "Turn snack time into a learning moment: Can your child count how many layers they see in a croissant? (Hint: A good one has 27 layers!)",
      journeyGame: {
        type: 'build_it',
        title: 'Build Your Dream Bakery!',
        question: 'If you owned a French bakery, what would be your special creation?',
        options: ['A rainbow croissant', 'A chocolate tower cake', 'Bread shaped like animals', 'A cookie as big as your head']
      }
    }
  ]
};

export const DEMO_STOP_PLACEHOLDER_IMAGES: Record<string, string> = {
  'demo-stop-1-eiffel': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&h=300&fit=crop',
  'demo-stop-2-louvre': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop',
  'demo-stop-3-notredame': 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400&h=300&fit=crop',
  'demo-stop-4-montmartre': 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400&h=300&fit=crop',
  'demo-stop-5-jardin-luxembourg': 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=300&fit=crop',
  'demo-stop-6-seine-cruise': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
  'demo-stop-7-french-bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop'
};

export const FREE_ADVENTURE_CONFIG = {
  maxFreeStops: 7,
  collageEnabled: true,
  videoEnabled: false, // Requires GeoQuest Explorer subscription
  offlineEnabled: false, // Requires GeoQuest Explorer subscription
  city: 'Paris',
  country: 'France'
};
