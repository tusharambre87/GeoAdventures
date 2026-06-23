import type { BlogPost } from "./types";

const post: BlogPost = {
  slug: "barcelona-family-guide",
  title: "Barcelona with Kids: The Ultimate Family Guide",
  date: "2025-10-15",
  description: "Everything you need to know about visiting Barcelona with children — from Gaudí's fairy-tale architecture to beachside gelato runs and the best family-friendly neighbourhoods.",
  published: true,
  contentHtml: `
<h2>Why Barcelona Is a Dream for Families</h2>
<p>Barcelona has a rare superpower: it manages to be endlessly exciting for adults while staying completely manageable — even joyful — for kids. Wide pedestrian boulevards, sandy beaches a short metro ride from the old city, and an architectural landscape that looks like it was designed by a friendly giant all conspire to make it one of Europe's top family destinations.</p>

<h2>Getting Around</h2>
<p>The metro is clean, frequent, and free for children under 4. Older kids love the coloured lines on the map and quickly become junior navigators. Buy a T-Casual card (10 trips) for each adult — it works on metro, bus, and tram. For a treat, the Montjuïc cable car gives sweeping city views that will have even teenagers looking up from their phones.</p>

<h2>Gaudí With Children</h2>
<p>Skip the interior queues at the Sagrada Família if you have toddlers — the exterior towers, carved like melting sandcastles, are the real show and completely free to admire from the outside. Park Güell's mosaic dragon terrace, on the other hand, is a must-visit with kids: the colourful salamander on the main staircase has been photographed millions of times, and for good reason. Book timed entry in advance to avoid long waits.</p>
<p>Casa Batlló offers a kids' audio guide that tells the story of a dragon, a hero, and a princess — it transforms what might be a boring building tour into a 45-minute adventure. Highly recommended for children aged 6 and up.</p>

<h2>Barceloneta Beach</h2>
<p>The city beach is wide, sandy, and backed by a promenade lined with ice cream vendors. Go before 11am to get a good spot and avoid the midday crush. The shallow water is safe for paddling toddlers, and the beach volleyball nets entertain older kids for hours. Rent a pedalo for a family treat — the booth is at the north end of the beach near the Port Olímpic.</p>

<h2>Eating Out</h2>
<p>Catalans eat late — dinner typically starts at 9pm — which can be brutal for young children. The trick is the <em>menú del día</em>, a fixed-price lunch available at most restaurants between 1pm and 3:30pm. It's abundant, cheap, and served at a civilised hour. La Boqueria market on Las Ramblas is excellent for a self-service family lunch: grab fresh fruit, jamón, cheese, and a bag of nuts and find a bench.</p>

<h2>Best Family Neighbourhoods to Stay</h2>
<ul>
  <li><strong>Eixample:</strong> Central, wide pavements, easy metro access. Best for families wanting quick access to Gaudí sites.</li>
  <li><strong>Barceloneta:</strong> Steps from the beach. Perfect if your children are water-obsessed.</li>
  <li><strong>Gràcia:</strong> Quieter village feel with lovely squares — kids can run freely while parents enjoy an evening beer.</li>
</ul>

<h2>Practical Tips</h2>
<ul>
  <li>Pharmacies (marked with a green cross) stock nappies, formula, and sun cream at reasonable prices.</li>
  <li>Most museums are free on the first Sunday of each month.</li>
  <li>Tap water in Barcelona is safe to drink but tastes of chlorine — carry a filter bottle.</li>
  <li>Book Sagrada Família and Park Güell tickets at least two weeks ahead in summer.</li>
</ul>
`,
  faqs: [
    {
      question: "Is Barcelona safe for families with young children?",
      answer: "Barcelona is generally very safe for families. The main risk is pickpocketing on Las Ramblas and the metro — keep bags in front and use inside jacket pockets for valuables. The beach and parks are family-friendly and heavily used by local families.",
    },
    {
      question: "What is the best time of year to visit Barcelona with kids?",
      answer: "April to June and September to October are ideal — warm enough for the beach, fewer crowds than July and August, and comfortable temperatures for walking. July and August are very hot (35°C+) and extremely busy.",
    },
    {
      question: "How many days do you need in Barcelona with kids?",
      answer: "Four to five days gives you enough time to see the Gaudí highlights, spend a day at the beach, explore the Gothic Quarter, and have a slow morning or two — which is essential with children.",
    },
    {
      question: "Are children allowed inside the Sagrada Família?",
      answer: "Yes, children of all ages are welcome inside. There is a dedicated family audio guide. Children under 11 enter free. The towers require a separate ticket and involve lifts plus narrow spiral stairs, so consider whether that suits your group.",
    },
    {
      question: "What are the best free activities in Barcelona for kids?",
      answer: "Park Güell's free zone (outside the monumental area), Barceloneta beach, the Gothic Quarter's narrow streets and squares, the Font Màgica light show on weekend evenings, and the Barceloneta boardwalk are all excellent free options.",
    },
  ],
};

export default post;
