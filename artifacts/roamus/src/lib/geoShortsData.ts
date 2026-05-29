export interface GeoShortFact {
  text: string;
  emoji?: string;
  highlight?: string;
  // Per-fact location for zoom animation
  location?: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  // Image URL for visual display
  image?: string;
}

export interface GeoShort {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  location: {
    name: string;
    lat: number;
    lng: number;
    altitude?: number;
  };
  facts: GeoShortFact[];
  duration: number;
  category: 'oceans' | 'mountains' | 'deserts' | 'forests' | 'continents' | 'landmarks';
  difficulty: 'easy' | 'medium' | 'hard';
}

export const GEO_SHORTS: GeoShort[] = [
  {
    id: 'pacific_ocean',
    title: 'The Mighty Pacific Ocean',
    description: 'Discover the biggest ocean on Earth!',
    thumbnail: '🌊',
    location: {
      name: 'Pacific Ocean',
      lat: 0,
      lng: -160,
      altitude: 2.5,
    },
    facts: [
      { 
        text: 'The Pacific Ocean is the BIGGEST ocean on Earth!', 
        emoji: '🌊', 
        highlight: 'BIGGEST',
        location: { lat: 0, lng: -160, altitude: 2.5 },
        image: '/geo-shorts/pacific_ocean_blue_w_46cc8f36.jpg'
      },
      { 
        text: 'It covers more than 30% of our entire planet!', 
        emoji: '🌍', 
        highlight: '30%',
        location: { lat: 10, lng: -140, altitude: 3.0 },
        image: '/geo-shorts/pacific_ocean_blue_w_0b983224.jpg'
      },
      { 
        text: 'You could fit ALL the continents inside it!', 
        emoji: '🗺️', 
        highlight: 'ALL',
        location: { lat: -5, lng: -170, altitude: 4.0 },
        image: '/geo-shorts/pacific_ocean_blue_w_e5042e34.jpg'
      },
      { 
        text: 'The deepest spot is the Mariana Trench...', 
        emoji: '⬇️', 
        highlight: 'deepest',
        location: { lat: 11.3493, lng: 142.1996, altitude: 1.5 },
        image: '/geo-shorts/pacific_ocean_blue_w_46cc8f36.jpg'
      },
      { 
        text: "It's 36,000 feet deep - deeper than Mount Everest is tall!", 
        emoji: '📏', 
        highlight: '36,000 feet',
        location: { lat: 11.3493, lng: 142.1996, altitude: 1.2 },
        image: '/geo-shorts/pacific_ocean_blue_w_0b983224.jpg'
      },
    ],
    duration: 25,
    category: 'oceans',
    difficulty: 'easy',
  },
  {
    id: 'mount_everest',
    title: 'Mount Everest: Top of the World',
    description: 'Climb to the highest point on Earth!',
    thumbnail: '🏔️',
    location: {
      name: 'Mount Everest',
      lat: 27.9881,
      lng: 86.925,
      altitude: 1.8,
    },
    facts: [
      { 
        text: 'Mount Everest is the TALLEST mountain on Earth!', 
        emoji: '🏔️', 
        highlight: 'TALLEST',
        location: { lat: 27.9881, lng: 86.925, altitude: 1.5 },
        image: '/geo-shorts/mount_everest_snowy__a7e15711.jpg'
      },
      { 
        text: 'It stands 29,032 feet above sea level!', 
        emoji: '📏', 
        highlight: '29,032 feet',
        location: { lat: 27.9881, lng: 86.925, altitude: 1.2 },
        image: '/geo-shorts/mount_everest_snowy__fbdd7cb6.jpg'
      },
      { 
        text: "It's so tall that planes fly LOWER than its peak!", 
        emoji: '✈️', 
        highlight: 'LOWER',
        location: { lat: 28.5, lng: 87.0, altitude: 2.0 },
        image: '/geo-shorts/mount_everest_snowy__bdbfeaad.jpg'
      },
      { 
        text: 'The mountain grows about 4mm taller every year!', 
        emoji: '📈', 
        highlight: 'grows',
        location: { lat: 27.9881, lng: 86.925, altitude: 1.3 },
        image: '/geo-shorts/mount_everest_snowy__a7e15711.jpg'
      },
      { 
        text: 'Over 6,000 people have reached the summit!', 
        emoji: '🎉', 
        highlight: '6,000 people',
        location: { lat: 27.9881, lng: 86.925, altitude: 1.0 },
        image: '/geo-shorts/mount_everest_snowy__fbdd7cb6.jpg'
      },
    ],
    duration: 25,
    category: 'mountains',
    difficulty: 'easy',
  },
  {
    id: 'sahara_desert',
    title: 'The Sahara: Sea of Sand',
    description: 'Explore the largest hot desert!',
    thumbnail: '🏜️',
    location: {
      name: 'Sahara Desert',
      lat: 23.4162,
      lng: 25.6628,
      altitude: 2.0,
    },
    facts: [
      { 
        text: 'The Sahara is the largest HOT desert on Earth!', 
        emoji: '🏜️', 
        highlight: 'HOT',
        location: { lat: 23.4162, lng: 25.6628, altitude: 1.8 },
        image: '/geo-shorts/sahara_desert_sand_d_5282a5f3.jpg'
      },
      { 
        text: "It's almost as big as the entire United States!", 
        emoji: '🇺🇸', 
        highlight: 'United States',
        location: { lat: 25.0, lng: 10.0, altitude: 2.5 },
        image: '/geo-shorts/sahara_desert_sand_d_e04d9cb0.jpg'
      },
      { 
        text: 'During the day it can reach 136°F (58°C)!', 
        emoji: '🌡️', 
        highlight: '136°F',
        location: { lat: 26.0, lng: 13.0, altitude: 1.5 },
        image: '/geo-shorts/sahara_desert_sand_d_76d3c0fd.jpg'
      },
      { 
        text: 'But at night it can drop below freezing!', 
        emoji: '❄️', 
        highlight: 'freezing',
        location: { lat: 22.0, lng: 20.0, altitude: 1.8 },
        image: '/geo-shorts/sahara_desert_sand_d_5282a5f3.jpg'
      },
      { 
        text: 'Millions of years ago, the Sahara was actually green with rivers!', 
        emoji: '🌿', 
        highlight: 'green',
        location: { lat: 20.0, lng: 30.0, altitude: 2.0 },
        image: '/geo-shorts/sahara_desert_sand_d_e04d9cb0.jpg'
      },
    ],
    duration: 25,
    category: 'deserts',
    difficulty: 'easy',
  },
  {
    id: 'amazon_rainforest',
    title: 'The Amazon: Lungs of Earth',
    description: 'Journey into the largest rainforest!',
    thumbnail: '🌳',
    location: {
      name: 'Amazon Rainforest',
      lat: -3.4653,
      lng: -62.2159,
      altitude: 1.8,
    },
    facts: [
      { 
        text: 'The Amazon is the LARGEST rainforest in the world!', 
        emoji: '🌳', 
        highlight: 'LARGEST',
        location: { lat: -3.4653, lng: -62.2159, altitude: 1.8 },
        image: '/geo-shorts/amazon_rainforest_gr_5213f46c.jpg'
      },
      { 
        text: 'It produces 20% of the oxygen we breathe!', 
        emoji: '💨', 
        highlight: '20%',
        location: { lat: -5.0, lng: -60.0, altitude: 2.0 },
        image: '/geo-shorts/amazon_rainforest_gr_9e73f33c.jpg'
      },
      { 
        text: '10% of ALL species on Earth live here!', 
        emoji: '🦜', 
        highlight: 'ALL species',
        location: { lat: -2.5, lng: -55.0, altitude: 1.5 },
        image: '/geo-shorts/amazon_rainforest_gr_66b27bfd.jpg'
      },
      { 
        text: 'The Amazon River is the biggest river by water volume!', 
        emoji: '🌊', 
        highlight: 'biggest river',
        location: { lat: -3.1, lng: -60.0, altitude: 1.3 },
        image: '/geo-shorts/amazon_rainforest_gr_5213f46c.jpg'
      },
      { 
        text: 'Some trees here are over 1,000 years old!', 
        emoji: '🌲', 
        highlight: '1,000 years',
        location: { lat: -4.0, lng: -65.0, altitude: 1.2 },
        image: '/geo-shorts/amazon_rainforest_gr_9e73f33c.jpg'
      },
    ],
    duration: 25,
    category: 'forests',
    difficulty: 'easy',
  },
  {
    id: 'antarctica',
    title: 'Antarctica: The Frozen Continent',
    description: 'Discover the coldest place on Earth!',
    thumbnail: '🧊',
    location: {
      name: 'Antarctica',
      lat: -82.8628,
      lng: 135.0,
      altitude: 2.2,
    },
    facts: [
      { 
        text: 'Antarctica is the COLDEST place on Earth!', 
        emoji: '🥶', 
        highlight: 'COLDEST',
        location: { lat: -82.8628, lng: 135.0, altitude: 2.0 },
        image: '/geo-shorts/antarctica_ice_pengu_3ea3c7bb.jpg'
      },
      { 
        text: 'It holds 70% of all the fresh water on Earth!', 
        emoji: '💧', 
        highlight: '70%',
        location: { lat: -75.0, lng: 0.0, altitude: 2.5 },
        image: '/geo-shorts/antarctica_ice_pengu_2b6dd07b.jpg'
      },
      { 
        text: 'No country owns Antarctica - it belongs to science!', 
        emoji: '🔬', 
        highlight: 'science',
        location: { lat: -77.85, lng: 166.67, altitude: 1.8 },
        image: '/geo-shorts/antarctica_ice_pengu_becd9589.jpg'
      },
      { 
        text: 'Penguins and seals are the main animals here!', 
        emoji: '🐧', 
        highlight: 'Penguins',
        location: { lat: -64.0, lng: -62.0, altitude: 1.5 },
        image: '/geo-shorts/antarctica_ice_pengu_3ea3c7bb.jpg'
      },
      { 
        text: 'The ice is up to 3 miles (4.8 km) thick!', 
        emoji: '🧊', 
        highlight: '3 miles',
        location: { lat: -80.0, lng: 80.0, altitude: 1.8 },
        image: '/geo-shorts/antarctica_ice_pengu_2b6dd07b.jpg'
      },
    ],
    duration: 25,
    category: 'continents',
    difficulty: 'easy',
  },
];
