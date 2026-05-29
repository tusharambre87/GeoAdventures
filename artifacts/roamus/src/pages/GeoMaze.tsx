import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Trophy, Sparkles, Lock, RotateCcw, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import confetti from "canvas-confetti";
import { useExplorer } from "@/lib/explorerContext";
import { EXPLORER_AVATARS } from "@/lib/gameData";

type CellType = 0 | 1 | 2 | 3 | 4 | 5;

interface MazeLevel {
  id: string;
  targetCountry: string;
  targetFlag: string;
  correctGoal: 3 | 4 | 5;
  countries: { name: string; flag: string; goal: 3 | 4 | 5 }[];
  difficulty: 'easy' | 'medium' | 'hard';
  tip: string;
  memoryTip: string;
  grid: CellType[][];
  startPos: { row: number; col: number };
}

// Country hints for wrong answers and memory tips for correct answers
const COUNTRY_INFO: Record<string, { hint: string; memoryTip: string }> = {
  'France': { hint: 'Look for blue, white, red vertical stripes!', memoryTip: 'The French flag has the same colors as the USA - blue, white, red - but in vertical stripes!' },
  'Germany': { hint: 'Black, red, yellow horizontal stripes!', memoryTip: 'Germany\'s flag is like a traffic light turned sideways - black, red, gold!' },
  'Spain': { hint: 'Red and yellow with a coat of arms!', memoryTip: 'Spain\'s flag is mostly yellow with red stripes - think of a sunny Spanish beach!' },
  'Japan': { hint: 'A big red circle on white!', memoryTip: 'Japan is the "Land of the Rising Sun" - that\'s what the red circle represents!' },
  'China': { hint: 'Red with yellow stars!', memoryTip: 'China has one big star with four smaller stars - like a family together!' },
  'South Korea': { hint: 'White with a red and blue circle!', memoryTip: 'Korea\'s yin-yang symbol shows balance - red and blue swirling together!' },
  'Brazil': { hint: 'Green with a yellow diamond!', memoryTip: 'Brazil\'s flag is like a treasure map - green forests with a golden diamond!' },
  'Mexico': { hint: 'Green, white, red with an eagle!', memoryTip: 'Mexico has an eagle eating a snake on a cactus - like their ancient legend!' },
  'Argentina': { hint: 'Light blue and white with a sun!', memoryTip: 'Argentina has a happy sun with a face - called the "Sun of May"!' },
  'United Kingdom': { hint: 'The Union Jack with red, white, blue crosses!', memoryTip: 'The UK flag combines three countries\' flags - like a team jersey!' },
  'Australia': { hint: 'Blue with Union Jack and Southern Cross stars!', memoryTip: 'Australia shows the Southern Cross - stars you can only see from there!' },
  'New Zealand': { hint: 'Blue with Union Jack and four red stars!', memoryTip: 'New Zealand\'s four stars are red with white edges - like kiwi birds!' },
  'United States': { hint: 'Stars and stripes - 50 stars, 13 stripes!', memoryTip: 'The US has 50 stars for 50 states, and 13 stripes for the first colonies!' },
  'Canada': { hint: 'Red and white with a maple leaf!', memoryTip: 'Canada\'s maple leaf is the only leaf on any country\'s flag!' },
  'Italy': { hint: 'Green, white, red vertical stripes!', memoryTip: 'Italy\'s flag is like pizza colors - green basil, white mozzarella, red tomato!' },
  'Ireland': { hint: 'Green, white, orange vertical stripes!', memoryTip: 'Ireland has orange, not red - think of orange carrots and green shamrocks!' },
  'Vietnam': { hint: 'Red with a yellow star!', memoryTip: 'Vietnam has one big yellow star on red - simple but bold!' },
  'India': { hint: 'Orange, white, green with a blue wheel!', memoryTip: 'India\'s wheel has 24 spokes - one for each hour of the day!' },
  'Pakistan': { hint: 'Green and white with a crescent moon!', memoryTip: 'Pakistan\'s flag is mostly green with a white stripe and crescent!' },
  'Greece': { hint: 'Blue and white stripes with a cross!', memoryTip: 'Greece has 9 stripes - one for each syllable in "freedom or death" in Greek!' },
  'Egypt': { hint: 'Red, white, black with a golden eagle!', memoryTip: 'Egypt\'s eagle is the Eagle of Saladin - a famous historical hero!' },
  'Turkey': { hint: 'Red with a white crescent and star!', memoryTip: 'Turkey\'s crescent moon and star glow white on red - like the night sky!' },
  'Norway': { hint: 'Red with a blue cross!', memoryTip: 'Norway\'s flag is red with a blue cross - different from Denmark!' },
  'Sweden': { hint: 'Blue with a yellow cross!', memoryTip: 'Sweden\'s yellow cross on blue is like sunshine on a clear sky!' },
  'Denmark': { hint: 'Red with a white cross!', memoryTip: 'Denmark\'s flag is the oldest in the world - over 800 years old!' },
  'Netherlands': { hint: 'Red, white, blue horizontal stripes!', memoryTip: 'Netherlands has red on TOP - think "Roses on top"!' },
  'Russia': { hint: 'White, blue, red horizontal stripes!', memoryTip: 'Russia has white on TOP - think "White snow on top"!' },
  'Luxembourg': { hint: 'Red, white, light blue horizontal!', memoryTip: 'Luxembourg\'s blue is lighter than Netherlands - like a clear sky!' },
  'Switzerland': { hint: 'Red with a white cross!', memoryTip: 'Switzerland\'s flag is square and has a white plus sign - like a first aid kit!' },
  'Uruguay': { hint: 'Blue and white stripes with a sun!', memoryTip: 'Uruguay has a sun with a face, like Argentina - they\'re neighbors!' },
  'Israel': { hint: 'White with blue stripes and Star of David!', memoryTip: 'Israel\'s blue stripes are like a prayer shawl with the Star of David!' },
  'Ivory Coast': { hint: 'Orange, white, green vertical stripes!', memoryTip: 'Ivory Coast is like Ireland but reversed - orange on the LEFT!' },
  'Palau': { hint: 'Light blue with a yellow circle!', memoryTip: 'Palau\'s yellow moon on blue represents the peaceful ocean at night!' },
  'Ukraine': { hint: 'Blue and yellow horizontal stripes!', memoryTip: 'Ukraine is blue sky over golden wheat fields - their beautiful landscape!' },
  'Tunisia': { hint: 'Red with white circle and crescent!', memoryTip: 'Tunisia has red with a white circle containing a red crescent - like Turkey but inside out!' },
  'Singapore': { hint: 'Red and white with crescent and stars!', memoryTip: 'Singapore has 5 small stars next to the crescent - representing their values!' },
  'Fiji': { hint: 'Light blue with Union Jack and shield!', memoryTip: 'Fiji\'s shield shows a lion holding a coconut - and sugarcane!' },
  'Portugal': { hint: 'Green and red with a coat of arms!', memoryTip: 'Portugal has green on the LEFT and red on the right - and a cool golden ball!' },
  'Poland': { hint: 'White and red horizontal stripes!', memoryTip: 'Poland is white on top, red on bottom - like whipped cream on strawberries!' },
  'Austria': { hint: 'Red, white, red horizontal stripes!', memoryTip: 'Austria is like a sandwich - red bread with white filling!' },
  'Belgium': { hint: 'Black, yellow, red vertical stripes!', memoryTip: 'Belgium\'s flag looks like Germany\'s but vertical!' },
  'Thailand': { hint: 'Red, white, blue stripes!', memoryTip: 'Thailand has a thick blue stripe in the middle - for the Thai royalty!' },
  'Indonesia': { hint: 'Red and white horizontal stripes!', memoryTip: 'Indonesia is red on top, white on bottom - like Poland upside down!' },
  'Malaysia': { hint: 'Red and white stripes with blue corner!', memoryTip: 'Malaysia has 14 stripes and a 14-point star - for their 14 states!' },
  'South Africa': { hint: 'Colorful Y-shape design!', memoryTip: 'South Africa\'s flag has 6 colors - more than almost any other country!' },
  'Nigeria': { hint: 'Green, white, green vertical stripes!', memoryTip: 'Nigeria is green-white-green - like a forest with a white river!' },
  'Kenya': { hint: 'Black, red, green with a shield!', memoryTip: 'Kenya has a Maasai warrior shield in the middle - very cool!' },
  'Morocco': { hint: 'Red with a green star!', memoryTip: 'Morocco\'s green star has 5 points - called the Seal of Solomon!' },
  'Peru': { hint: 'Red, white, red vertical stripes!', memoryTip: 'Peru\'s flag has red on both sides with white in the middle!' },
  'Chile': { hint: 'White and red with a blue corner and star!', memoryTip: 'Chile has a lone star in the blue - like the Texas flag!' },
  'Colombia': { hint: 'Yellow, blue, red horizontal stripes!', memoryTip: 'Colombia has a BIG yellow stripe on top - for their gold!' },
};

function getPlayerAvatar(avatarKey?: string | null): string {
  const avatar = EXPLORER_AVATARS.find(a => a.key === avatarKey);
  return avatar?.emoji || '🐼';
}

// CONNECTIVITY-VERIFIED labyrinth layouts
// 0 = wall, 1 = path, 2 = start (row 5, col 5), 3/4/5 = goals
// All paths BFS-verified: player can reach ALL three goals from center

const MAZE_A: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_B: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_C: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,0,1,0,1,1,1,0],
  [0,0,0,1,0,1,0,1,0,0,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,0,1,0,1,1,1,0],
  [0,0,0,1,0,1,0,1,0,0,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_D: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

// Additional verified mazes with varied patterns
const MAZE_E: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,1,0,1,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,0,0,1,0,1,0,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_F: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,1,0,0,0,0,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,1,0,0,0,0,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_G: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

const MAZE_H: CellType[][] = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,1,1,4,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,1,0,0,0,1,0,1,0],
  [0,1,1,1,1,2,1,1,1,1,0],
  [0,1,0,1,0,0,0,1,0,1,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [0,1,0,0,0,1,0,0,0,1,0],
  [0,5,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

// Easy levels (1-10) - show country name at top, find matching flag
const EASY_LEVELS: MazeLevel[] = [
  { 
    id: 'e1', targetCountry: 'France', targetFlag: '🇫🇷', correctGoal: 3,
    countries: [
      { name: 'France', flag: '🇫🇷', goal: 3 },
      { name: 'Germany', flag: '🇩🇪', goal: 4 },
      { name: 'Spain', flag: '🇪🇸', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Blue, white, red vertical stripes!',
    memoryTip: COUNTRY_INFO['France'].memoryTip,
    grid: MAZE_A, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e2', targetCountry: 'Japan', targetFlag: '🇯🇵', correctGoal: 4,
    countries: [
      { name: 'China', flag: '🇨🇳', goal: 3 },
      { name: 'Japan', flag: '🇯🇵', goal: 4 },
      { name: 'South Korea', flag: '🇰🇷', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Red circle on white!',
    memoryTip: COUNTRY_INFO['Japan'].memoryTip,
    grid: MAZE_B, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e3', targetCountry: 'Brazil', targetFlag: '🇧🇷', correctGoal: 5,
    countries: [
      { name: 'Mexico', flag: '🇲🇽', goal: 3 },
      { name: 'Argentina', flag: '🇦🇷', goal: 4 },
      { name: 'Brazil', flag: '🇧🇷', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Green with yellow diamond!',
    memoryTip: COUNTRY_INFO['Brazil'].memoryTip,
    grid: MAZE_C, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e4', targetCountry: 'United Kingdom', targetFlag: '🇬🇧', correctGoal: 3,
    countries: [
      { name: 'United Kingdom', flag: '🇬🇧', goal: 3 },
      { name: 'Australia', flag: '🇦🇺', goal: 4 },
      { name: 'New Zealand', flag: '🇳🇿', goal: 5 }
    ],
    difficulty: 'easy', tip: 'The Union Jack!',
    memoryTip: COUNTRY_INFO['United Kingdom'].memoryTip,
    grid: MAZE_D, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e5', targetCountry: 'United States', targetFlag: '🇺🇸', correctGoal: 4,
    countries: [
      { name: 'Canada', flag: '🇨🇦', goal: 3 },
      { name: 'United States', flag: '🇺🇸', goal: 4 },
      { name: 'Mexico', flag: '🇲🇽', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Stars and stripes!',
    memoryTip: COUNTRY_INFO['United States'].memoryTip,
    grid: MAZE_E, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e6', targetCountry: 'Italy', targetFlag: '🇮🇹', correctGoal: 5,
    countries: [
      { name: 'France', flag: '🇫🇷', goal: 3 },
      { name: 'Ireland', flag: '🇮🇪', goal: 4 },
      { name: 'Italy', flag: '🇮🇹', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Green, white, red vertical!',
    memoryTip: COUNTRY_INFO['Italy'].memoryTip,
    grid: MAZE_F, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e7', targetCountry: 'China', targetFlag: '🇨🇳', correctGoal: 3,
    countries: [
      { name: 'China', flag: '🇨🇳', goal: 3 },
      { name: 'Vietnam', flag: '🇻🇳', goal: 4 },
      { name: 'Japan', flag: '🇯🇵', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Red with yellow stars!',
    memoryTip: COUNTRY_INFO['China'].memoryTip,
    grid: MAZE_G, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e8', targetCountry: 'Australia', targetFlag: '🇦🇺', correctGoal: 4,
    countries: [
      { name: 'Fiji', flag: '🇫🇯', goal: 3 },
      { name: 'Australia', flag: '🇦🇺', goal: 4 },
      { name: 'New Zealand', flag: '🇳🇿', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Blue with Southern Cross!',
    memoryTip: COUNTRY_INFO['Australia'].memoryTip,
    grid: MAZE_H, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e9', targetCountry: 'Egypt', targetFlag: '🇪🇬', correctGoal: 5,
    countries: [
      { name: 'Turkey', flag: '🇹🇷', goal: 3 },
      { name: 'India', flag: '🇮🇳', goal: 4 },
      { name: 'Egypt', flag: '🇪🇬', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Red, white, black with eagle!',
    memoryTip: COUNTRY_INFO['Egypt'].memoryTip,
    grid: MAZE_A, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'e10', targetCountry: 'India', targetFlag: '🇮🇳', correctGoal: 3,
    countries: [
      { name: 'India', flag: '🇮🇳', goal: 3 },
      { name: 'Pakistan', flag: '🇵🇰', goal: 4 },
      { name: 'Greece', flag: '🇬🇷', goal: 5 }
    ],
    difficulty: 'easy', tip: 'Orange, white, green with wheel!',
    memoryTip: COUNTRY_INFO['India'].memoryTip,
    grid: MAZE_B, startPos: { row: 5, col: 5 }
  },
];

// Medium levels (11-20) - slightly similar flags, country names still shown
const MEDIUM_LEVELS: MazeLevel[] = [
  { 
    id: 'm1', targetCountry: 'Canada', targetFlag: '🇨🇦', correctGoal: 3,
    countries: [
      { name: 'Canada', flag: '🇨🇦', goal: 3 },
      { name: 'Peru', flag: '🇵🇪', goal: 4 },
      { name: 'Poland', flag: '🇵🇱', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Look for the maple leaf!',
    memoryTip: COUNTRY_INFO['Canada'].memoryTip,
    grid: MAZE_C, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm2', targetCountry: 'South Korea', targetFlag: '🇰🇷', correctGoal: 4,
    countries: [
      { name: 'Japan', flag: '🇯🇵', goal: 3 },
      { name: 'South Korea', flag: '🇰🇷', goal: 4 },
      { name: 'China', flag: '🇨🇳', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Red and blue yin-yang!',
    memoryTip: COUNTRY_INFO['South Korea'].memoryTip,
    grid: MAZE_D, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm3', targetCountry: 'Argentina', targetFlag: '🇦🇷', correctGoal: 5,
    countries: [
      { name: 'Greece', flag: '🇬🇷', goal: 3 },
      { name: 'Uruguay', flag: '🇺🇾', goal: 4 },
      { name: 'Argentina', flag: '🇦🇷', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Light blue and white with a sun face!',
    memoryTip: COUNTRY_INFO['Argentina'].memoryTip,
    grid: MAZE_E, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm4', targetCountry: 'Portugal', targetFlag: '🇵🇹', correctGoal: 3,
    countries: [
      { name: 'Portugal', flag: '🇵🇹', goal: 3 },
      { name: 'Italy', flag: '🇮🇹', goal: 4 },
      { name: 'Mexico', flag: '🇲🇽', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Green on left, red on right!',
    memoryTip: COUNTRY_INFO['Portugal'].memoryTip,
    grid: MAZE_F, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm5', targetCountry: 'Thailand', targetFlag: '🇹🇭', correctGoal: 4,
    countries: [
      { name: 'France', flag: '🇫🇷', goal: 3 },
      { name: 'Thailand', flag: '🇹🇭', goal: 4 },
      { name: 'Netherlands', flag: '🇳🇱', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Thick blue stripe in the middle!',
    memoryTip: COUNTRY_INFO['Thailand'].memoryTip,
    grid: MAZE_G, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm6', targetCountry: 'South Africa', targetFlag: '🇿🇦', correctGoal: 5,
    countries: [
      { name: 'Kenya', flag: '🇰🇪', goal: 3 },
      { name: 'Nigeria', flag: '🇳🇬', goal: 4 },
      { name: 'South Africa', flag: '🇿🇦', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Y-shape with many colors!',
    memoryTip: COUNTRY_INFO['South Africa'].memoryTip,
    grid: MAZE_H, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm7', targetCountry: 'Malaysia', targetFlag: '🇲🇾', correctGoal: 3,
    countries: [
      { name: 'Malaysia', flag: '🇲🇾', goal: 3 },
      { name: 'United States', flag: '🇺🇸', goal: 4 },
      { name: 'Indonesia', flag: '🇮🇩', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Stripes with crescent moon!',
    memoryTip: COUNTRY_INFO['Malaysia'].memoryTip,
    grid: MAZE_A, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm8', targetCountry: 'Belgium', targetFlag: '🇧🇪', correctGoal: 4,
    countries: [
      { name: 'Germany', flag: '🇩🇪', goal: 3 },
      { name: 'Belgium', flag: '🇧🇪', goal: 4 },
      { name: 'Romania', flag: '🇷🇴', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Black, yellow, red VERTICAL!',
    memoryTip: COUNTRY_INFO['Belgium'].memoryTip,
    grid: MAZE_B, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm9', targetCountry: 'Colombia', targetFlag: '🇨🇴', correctGoal: 5,
    countries: [
      { name: 'Ecuador', flag: '🇪🇨', goal: 3 },
      { name: 'Venezuela', flag: '🇻🇪', goal: 4 },
      { name: 'Colombia', flag: '🇨🇴', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Big yellow stripe on top!',
    memoryTip: COUNTRY_INFO['Colombia'].memoryTip,
    grid: MAZE_C, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'm10', targetCountry: 'Chile', targetFlag: '🇨🇱', correctGoal: 3,
    countries: [
      { name: 'Chile', flag: '🇨🇱', goal: 3 },
      { name: 'Czech Republic', flag: '🇨🇿', goal: 4 },
      { name: 'Poland', flag: '🇵🇱', goal: 5 }
    ],
    difficulty: 'medium', tip: 'Blue square with white star!',
    memoryTip: COUNTRY_INFO['Chile'].memoryTip,
    grid: MAZE_D, startPos: { row: 5, col: 5 }
  },
];

// Hard levels (21-30) - very similar flags, no country names shown in legend
const HARD_LEVELS: MazeLevel[] = [
  { 
    id: 'h1', targetCountry: 'Italy', targetFlag: '🇮🇹', correctGoal: 4,
    countries: [
      { name: 'Ireland', flag: '🇮🇪', goal: 3 },
      { name: 'Italy', flag: '🇮🇹', goal: 4 },
      { name: 'Mexico', flag: '🇲🇽', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Green on the LEFT side!',
    memoryTip: COUNTRY_INFO['Italy'].memoryTip,
    grid: MAZE_E, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h2', targetCountry: 'Ireland', targetFlag: '🇮🇪', correctGoal: 3,
    countries: [
      { name: 'Ireland', flag: '🇮🇪', goal: 3 },
      { name: 'Italy', flag: '🇮🇹', goal: 4 },
      { name: 'Ivory Coast', flag: '🇨🇮', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Orange on the RIGHT side!',
    memoryTip: COUNTRY_INFO['Ireland'].memoryTip,
    grid: MAZE_F, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h3', targetCountry: 'Norway', targetFlag: '🇳🇴', correctGoal: 5,
    countries: [
      { name: 'Denmark', flag: '🇩🇰', goal: 3 },
      { name: 'Sweden', flag: '🇸🇪', goal: 4 },
      { name: 'Norway', flag: '🇳🇴', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Red with BLUE cross!',
    memoryTip: COUNTRY_INFO['Norway'].memoryTip,
    grid: MAZE_G, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h4', targetCountry: 'Denmark', targetFlag: '🇩🇰', correctGoal: 3,
    countries: [
      { name: 'Denmark', flag: '🇩🇰', goal: 3 },
      { name: 'Norway', flag: '🇳🇴', goal: 4 },
      { name: 'Switzerland', flag: '🇨🇭', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Red with WHITE cross!',
    memoryTip: COUNTRY_INFO['Denmark'].memoryTip,
    grid: MAZE_H, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h5', targetCountry: 'Netherlands', targetFlag: '🇳🇱', correctGoal: 4,
    countries: [
      { name: 'Russia', flag: '🇷🇺', goal: 3 },
      { name: 'Netherlands', flag: '🇳🇱', goal: 4 },
      { name: 'Luxembourg', flag: '🇱🇺', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Red on TOP!',
    memoryTip: COUNTRY_INFO['Netherlands'].memoryTip,
    grid: MAZE_A, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h6', targetCountry: 'Russia', targetFlag: '🇷🇺', correctGoal: 3,
    countries: [
      { name: 'Russia', flag: '🇷🇺', goal: 3 },
      { name: 'Netherlands', flag: '🇳🇱', goal: 4 },
      { name: 'France', flag: '🇫🇷', goal: 5 }
    ],
    difficulty: 'hard', tip: 'White on TOP!',
    memoryTip: COUNTRY_INFO['Russia'].memoryTip,
    grid: MAZE_B, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h7', targetCountry: 'Poland', targetFlag: '🇵🇱', correctGoal: 5,
    countries: [
      { name: 'Indonesia', flag: '🇮🇩', goal: 3 },
      { name: 'Austria', flag: '🇦🇹', goal: 4 },
      { name: 'Poland', flag: '🇵🇱', goal: 5 }
    ],
    difficulty: 'hard', tip: 'White on TOP, red on bottom!',
    memoryTip: COUNTRY_INFO['Poland'].memoryTip,
    grid: MAZE_C, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h8', targetCountry: 'Greece', targetFlag: '🇬🇷', correctGoal: 4,
    countries: [
      { name: 'Uruguay', flag: '🇺🇾', goal: 3 },
      { name: 'Greece', flag: '🇬🇷', goal: 4 },
      { name: 'Israel', flag: '🇮🇱', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Blue and white stripes with cross!',
    memoryTip: COUNTRY_INFO['Greece'].memoryTip,
    grid: MAZE_D, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h9', targetCountry: 'Sweden', targetFlag: '🇸🇪', correctGoal: 5,
    countries: [
      { name: 'Ukraine', flag: '🇺🇦', goal: 3 },
      { name: 'Palau', flag: '🇵🇼', goal: 4 },
      { name: 'Sweden', flag: '🇸🇪', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Blue with YELLOW cross!',
    memoryTip: COUNTRY_INFO['Sweden'].memoryTip,
    grid: MAZE_E, startPos: { row: 5, col: 5 }
  },
  { 
    id: 'h10', targetCountry: 'Turkey', targetFlag: '🇹🇷', correctGoal: 3,
    countries: [
      { name: 'Turkey', flag: '🇹🇷', goal: 3 },
      { name: 'Tunisia', flag: '🇹🇳', goal: 4 },
      { name: 'Singapore', flag: '🇸🇬', goal: 5 }
    ],
    difficulty: 'hard', tip: 'Crescent moon and star on RED!',
    memoryTip: COUNTRY_INFO['Turkey'].memoryTip,
    grid: MAZE_F, startPos: { row: 5, col: 5 }
  },
];

type GameState = 'menu' | 'playing' | 'wrong' | 'success' | 'levelComplete';

export default function GeoMaze() {
  const [, navigate] = useLocation();
  const fromPage = new URLSearchParams(window.location.search).get('from');
  const { activeExplorer } = useExplorer();
  
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [playerPos, setPlayerPos] = useState({ row: 5, col: 5 });
  const [starsEarned, setStarsEarned] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [reachedCountry, setReachedCountry] = useState<{ name: string; flag: string; isCorrect: boolean } | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  
  const levels = difficulty === 'easy' ? EASY_LEVELS : difficulty === 'medium' ? MEDIUM_LEVELS : HARD_LEVELS;
  const currentLevel = levels[currentLevelIndex];
  
  // Unlock conditions: complete 5 easy levels to unlock medium, complete 5 medium to unlock hard
  const easyCompleted = completedLevels.filter(id => id.startsWith('e')).length;
  const mediumCompleted = completedLevels.filter(id => id.startsWith('m')).length;
  const mediumUnlocked = easyCompleted >= 5;
  const hardUnlocked = mediumCompleted >= 5;
  
  const playerAvatar = getPlayerAvatar(activeExplorer?.avatarKey);
  
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`geomaze_completed_${activeExplorer?.id || 'guest'}`);
    if (saved) {
      setCompletedLevels(JSON.parse(saved));
    }
  }, [activeExplorer]);

  const saveProgress = useCallback((newCompleted: string[]) => {
    localStorage.setItem(`geomaze_completed_${activeExplorer?.id || 'guest'}`, JSON.stringify(newCompleted));
  }, [activeExplorer]);

  const startGame = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(diff);
    setCurrentLevelIndex(0);
    setGameState('playing');
    const level = diff === 'easy' ? EASY_LEVELS[0] : diff === 'medium' ? MEDIUM_LEVELS[0] : HARD_LEVELS[0];
    setPlayerPos({ ...level.startPos });
    setStarsEarned(0);
    setWrongAttempts(0);
    setShowTip(false);
    setReachedCountry(null);
    setMoveCount(0);
  };

  const canMove = (newRow: number, newCol: number): boolean => {
    if (!currentLevel) return false;
    const grid = currentLevel.grid;
    if (newRow < 0 || newRow >= grid.length || newCol < 0 || newCol >= grid[0].length) {
      return false;
    }
    return grid[newRow][newCol] !== 0;
  };

  const checkGoal = (row: number, col: number) => {
    if (!currentLevel) return;
    const cell = currentLevel.grid[row][col];
    if (cell >= 3 && cell <= 5) {
      const country = currentLevel.countries.find(c => c.goal === cell);
      if (country) {
        const isCorrect = cell === currentLevel.correctGoal;
        setReachedCountry({ name: country.name, flag: country.flag, isCorrect });
        
        if (isCorrect) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          
          let stars = 3;
          if (wrongAttempts > 0 || moveCount > 25) stars = 2;
          if (wrongAttempts > 1 || moveCount > 40) stars = 1;
          setStarsEarned(stars);
          
          if (!completedLevels.includes(currentLevel.id)) {
            const newCompleted = [...completedLevels, currentLevel.id];
            setCompletedLevels(newCompleted);
            saveProgress(newCompleted);
          }
          
          setGameState('success');
        } else {
          setWrongAttempts(prev => prev + 1);
          if (wrongAttempts >= 1) setShowTip(true);
          setGameState('wrong');
        }
      }
    }
  };

  const movePlayer = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'playing' || !currentLevel) return;
    
    let newRow = playerPos.row;
    let newCol = playerPos.col;
    
    switch (direction) {
      case 'up': newRow--; break;
      case 'down': newRow++; break;
      case 'left': newCol--; break;
      case 'right': newCol++; break;
    }
    
    if (canMove(newRow, newCol)) {
      setPlayerPos({ row: newRow, col: newCol });
      setMoveCount(prev => prev + 1);
      
      // Check goal immediately with current level data
      const cell = currentLevel.grid[newRow][newCol];
      if (cell >= 3 && cell <= 5) {
        const country = currentLevel.countries.find(c => c.goal === cell);
        if (country) {
          const isCorrect = cell === currentLevel.correctGoal;
          setReachedCountry({ name: country.name, flag: country.flag, isCorrect });
          
          if (isCorrect) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            
            let stars = 3;
            if (wrongAttempts > 0 || (moveCount + 1) > 25) stars = 2;
            if (wrongAttempts > 1 || (moveCount + 1) > 40) stars = 1;
            setStarsEarned(stars);
            
            if (!completedLevels.includes(currentLevel.id)) {
              const newCompleted = [...completedLevels, currentLevel.id];
              setCompletedLevels(newCompleted);
              saveProgress(newCompleted);
            }
            
            setGameState('success');
          } else {
            setWrongAttempts(prev => prev + 1);
            if (wrongAttempts >= 1) setShowTip(true);
            setGameState('wrong');
          }
        }
      }
    }
  }, [gameState, playerPos, currentLevel, wrongAttempts, moveCount, completedLevels]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case 'ArrowUp': movePlayer('up'); break;
        case 'ArrowDown': movePlayer('down'); break;
        case 'ArrowLeft': movePlayer('left'); break;
        case 'ArrowRight': movePlayer('right'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, gameState]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    
    const minSwipe = 30;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
      movePlayer(dx > 0 ? 'right' : 'left');
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipe) {
      movePlayer(dy > 0 ? 'down' : 'up');
    }
    touchStartRef.current = null;
  };

  const tryAgain = () => {
    if (!currentLevel) return;
    setPlayerPos({ ...currentLevel.startPos });
    setGameState('playing');
    setReachedCountry(null);
  };

  const nextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      const nextIdx = currentLevelIndex + 1;
      setCurrentLevelIndex(nextIdx);
      const nextLvl = levels[nextIdx];
      setPlayerPos({ ...nextLvl.startPos });
      setGameState('playing');
      setWrongAttempts(0);
      setShowTip(false);
      setReachedCountry(null);
      setMoveCount(0);
      setStarsEarned(0);
    } else {
      setGameState('levelComplete');
    }
  };

  const renderStars = (count: number, size: string = 'w-6 h-6') => (
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <Star key={i} className={`${size} ${i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  // Draw maze on canvas
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current || !currentLevel) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const grid = currentLevel.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const cellSize = Math.floor(canvas.width / cols);
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const borderWidth = 3;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const cell = grid[row][col];
        
        if (cell !== 0) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = borderWidth;
          
          const hasWallTop = row === 0 || grid[row - 1][col] === 0;
          const hasWallBottom = row === rows - 1 || grid[row + 1][col] === 0;
          const hasWallLeft = col === 0 || grid[row][col - 1] === 0;
          const hasWallRight = col === cols - 1 || grid[row][col + 1] === 0;
          
          if (hasWallTop) {
            ctx.beginPath();
            ctx.moveTo(x, y + borderWidth / 2);
            ctx.lineTo(x + cellSize, y + borderWidth / 2);
            ctx.stroke();
          }
          if (hasWallBottom) {
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize - borderWidth / 2);
            ctx.lineTo(x + cellSize, y + cellSize - borderWidth / 2);
            ctx.stroke();
          }
          if (hasWallLeft) {
            ctx.beginPath();
            ctx.moveTo(x + borderWidth / 2, y);
            ctx.lineTo(x + borderWidth / 2, y + cellSize);
            ctx.stroke();
          }
          if (hasWallRight) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize - borderWidth / 2, y);
            ctx.lineTo(x + cellSize - borderWidth / 2, y + cellSize);
            ctx.stroke();
          }
        }
        
        // Goal zones with flags
        if (cell >= 3 && cell <= 5) {
          const colors: Record<number, { bg: string; border: string }> = {
            3: { bg: '#dc2626', border: '#fca5a5' },
            4: { bg: '#f59e0b', border: '#fde68a' },
            5: { bg: '#10b981', border: '#6ee7b7' }
          };
          const { bg, border } = colors[cell];
          
          ctx.fillStyle = bg;
          ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
          ctx.strokeStyle = border;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
          
          const country = currentLevel.countries.find(c => c.goal === cell);
          if (country && !(playerPos.row === row && playerPos.col === col)) {
            ctx.font = `${cellSize * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(country.flag, x + cellSize / 2, y + cellSize / 2);
          }
        }
        
        // Player glow effect (emoji rendered via HTML overlay)
        if (playerPos.row === row && playerPos.col === col) {
          const gradient = ctx.createRadialGradient(
            x + cellSize / 2, y + cellSize / 2, 0,
            x + cellSize / 2, y + cellSize / 2, cellSize / 2
          );
          gradient.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
  }, [gameState, currentLevel, playerPos, playerAvatar]);

  // Menu Screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(fromPage || '/play-games')}
              className="rounded-full bg-white/10 text-white hover:bg-white/20" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white font-fredoka">Geo Maze</h1>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 shadow-xl mb-6 border border-yellow-500/30">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{playerAvatar}</div>
              <h2 className="text-xl font-bold text-white mb-2">Flag Maze Adventure</h2>
              <p className="text-slate-300 text-sm">Guide {playerAvatar} through the maze to find the right flag!</p>
            </div>

            <div className="space-y-3">
              {/* Easy Mode - Levels 1-10 */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => startGame('easy')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-between"
                data-testid="button-easy-mode">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌱</span>
                  <div className="text-left">
                    <div className="text-lg">Easy (1-10)</div>
                    <div className="text-xs opacity-80">Country names shown</div>
                  </div>
                </div>
                <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {easyCompleted}/10
                </div>
              </motion.button>

              {/* Medium Mode - Levels 11-20 */}
              <motion.button whileHover={mediumUnlocked ? { scale: 1.02 } : {}} whileTap={mediumUnlocked ? { scale: 0.98 } : {}}
                onClick={() => mediumUnlocked && startGame('medium')}
                className={`w-full font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-between ${
                  mediumUnlocked ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-gray-700 text-gray-400'
                }`} data-testid="button-medium-mode">
                <div className="flex items-center gap-3">
                  {mediumUnlocked ? <span className="text-2xl">⭐</span> : <Lock className="w-6 h-6" />}
                  <div className="text-left">
                    <div className="text-lg">Medium (11-20)</div>
                    <div className="text-xs opacity-80">{mediumUnlocked ? 'Similar flags challenge' : 'Complete 5 easy levels'}</div>
                  </div>
                </div>
                {mediumUnlocked && (
                  <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {mediumCompleted}/10
                  </div>
                )}
              </motion.button>

              {/* Hard Mode - Levels 21-30 */}
              <motion.button whileHover={hardUnlocked ? { scale: 1.02 } : {}} whileTap={hardUnlocked ? { scale: 0.98 } : {}}
                onClick={() => hardUnlocked && startGame('hard')}
                className={`w-full font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-between ${
                  hardUnlocked ? 'bg-gradient-to-r from-red-500 to-rose-700 text-white' : 'bg-gray-700 text-gray-400'
                }`} data-testid="button-hard-mode">
                <div className="flex items-center gap-3">
                  {hardUnlocked ? <span className="text-2xl">🔥</span> : <Lock className="w-6 h-6" />}
                  <div className="text-left">
                    <div className="text-lg">Hard (21-30)</div>
                    <div className="text-xs opacity-80">{hardUnlocked ? 'Expert: Flags only!' : 'Complete 5 medium levels'}</div>
                  </div>
                </div>
                {hardUnlocked && (
                  <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {completedLevels.filter(id => id.startsWith('h')).length}/10
                  </div>
                )}
              </motion.button>
            </div>
          </motion.div>

          <div className="bg-slate-800/30 rounded-2xl p-4 backdrop-blur-sm border border-yellow-500/20">
            <h3 className="font-bold text-yellow-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> How to Play
            </h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• See the country name at the top</li>
              <li>• Navigate {playerAvatar} through the maze</li>
              <li>• Find the matching country flag!</li>
              <li>• Earn ⭐⭐⭐ for quick completion!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Level Complete Screen
  if (gameState === 'levelComplete') {
    const modeLabel = difficulty === 'easy' ? 'Easy (1-10)' : difficulty === 'medium' ? 'Medium (11-20)' : 'Hard (21-30)';
    const totalStars = completedLevels.filter(id => 
      difficulty === 'easy' ? id.startsWith('e') : difficulty === 'medium' ? id.startsWith('m') : id.startsWith('h')
    ).length * 3;
    
    const nextMode = difficulty === 'easy' && mediumUnlocked ? 'medium' : 
                     difficulty === 'medium' && hardUnlocked ? 'hard' : null;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 p-4 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl text-center max-w-sm w-full border border-yellow-500/30">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">{modeLabel} Complete!</h2>
          <p className="text-slate-300 mb-6">You're a geography explorer!</p>
          
          <div className="bg-slate-700/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-lg font-bold text-white">Total Stars</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{totalStars}</div>
          </div>

          <div className="space-y-3">
            {nextMode === 'medium' && (
              <Button onClick={() => startGame('medium')} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                Try Medium Mode ⭐
              </Button>
            )}
            {nextMode === 'hard' && (
              <Button onClick={() => startGame('hard')} className="w-full bg-gradient-to-r from-red-500 to-rose-700 text-white">
                Try Hard Mode 🔥
              </Button>
            )}
            <Button variant="outline" onClick={() => setGameState('menu')} className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/20">
              Back to Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 p-3"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={() => setGameState('menu')}
            className="rounded-full bg-white/10 text-white hover:bg-white/20 w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-full px-3 py-1">
            <span className="font-bold text-white text-sm">Level {currentLevelIndex + 1}/{levels.length}</span>
          </div>
          <div className="bg-slate-800/60 rounded-full px-2 py-1">
            {renderStars(starsEarned, 'w-3 h-3')}
          </div>
        </div>

        {/* Target Country Name Display */}
        <div className="bg-slate-800/40 backdrop-blur rounded-xl p-3 mb-3 text-center">
          <span className="text-sm text-slate-300">Find the flag for:</span>
          <div className="text-2xl font-bold text-white mt-1">{currentLevel?.targetCountry}</div>
          {showTip && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-yellow-400 mt-2">
              💡 {currentLevel?.tip}
            </motion.p>
          )}
        </div>

        {/* Canvas Maze with Player Overlay */}
        <div className="rounded-xl overflow-hidden shadow-2xl border-4 border-yellow-500/50 mb-3 relative">
          <canvas 
            ref={canvasRef}
            width={330}
            height={330}
            className="w-full aspect-square bg-slate-900"
          />
          {/* Player emoji overlay - renders on top of canvas for proper emoji display */}
          {currentLevel && (
            <div 
              className="absolute pointer-events-none flex items-center justify-center transition-all duration-150"
              style={{
                width: `${100 / 11}%`,
                height: `${100 / 11}%`,
                left: `${(playerPos.col / 11) * 100}%`,
                top: `${(playerPos.row / 11) * 100}%`,
                fontSize: 'clamp(16px, 4vw, 24px)',
              }}
            >
              <span className="drop-shadow-lg">{playerAvatar}</span>
            </div>
          )}
        </div>

        {/* Legend - flags only (no names to avoid giving away answers) */}
        <div className="flex justify-center gap-3 mb-4">
          {currentLevel?.countries.map(c => (
            <div key={c.goal}
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2 ${
                c.goal === 3 ? 'bg-red-600/80 border-red-400' : 
                c.goal === 4 ? 'bg-amber-600/80 border-amber-400' : 
                'bg-emerald-600/80 border-emerald-400'
              }`}>
              <span className="text-2xl">{c.flag}</span>
            </div>
          ))}
        </div>

        {/* D-Pad Controls */}
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2 w-44">
            <div />
            <Button variant="outline" size="icon" onClick={() => movePlayer('up')}
              className="w-14 h-14 rounded-xl bg-slate-700 border-yellow-500/50 text-white hover:bg-slate-600 active:scale-95 shadow-lg"
              data-testid="button-move-up">
              <ChevronUp className="w-8 h-8" />
            </Button>
            <div />
            <Button variant="outline" size="icon" onClick={() => movePlayer('left')}
              className="w-14 h-14 rounded-xl bg-slate-700 border-yellow-500/50 text-white hover:bg-slate-600 active:scale-95 shadow-lg"
              data-testid="button-move-left">
              <ArrowLeft className="w-8 h-8" />
            </Button>
            <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center border border-yellow-500/30">
              <span className="text-2xl">{playerAvatar}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => movePlayer('right')}
              className="w-14 h-14 rounded-xl bg-slate-700 border-yellow-500/50 text-white hover:bg-slate-600 active:scale-95 shadow-lg"
              data-testid="button-move-right">
              <ChevronRight className="w-8 h-8" />
            </Button>
            <div />
            <Button variant="outline" size="icon" onClick={() => movePlayer('down')}
              className="w-14 h-14 rounded-xl bg-slate-700 border-yellow-500/50 text-white hover:bg-slate-600 active:scale-95 shadow-lg"
              data-testid="button-move-down">
              <ChevronDown className="w-8 h-8" />
            </Button>
            <div />
          </div>
        </div>

        {/* Feedback Modals */}
        <AnimatePresence>
          {gameState === 'wrong' && reachedCountry && currentLevel && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed inset-x-4 bottom-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-3xl p-6 shadow-2xl max-w-sm mx-auto border-2 border-amber-400 z-50">
              <div className="text-center">
                <div className="text-4xl mb-2">🧭</div>
                <h3 className="text-xl font-bold text-white mb-2">So close! Keep going!</h3>
                <p className="text-amber-100 mb-2">
                  <span className="text-2xl">{reachedCountry.flag}</span> is {reachedCountry.name}
                </p>
                <p className="text-amber-200 text-sm mb-2">
                  That's a great flag to know! But we're looking for {currentLevel.targetCountry}.
                </p>
                <div className="bg-amber-700/50 rounded-xl p-3 mb-4">
                  <p className="text-white text-sm font-medium">
                    💡 Hint: {COUNTRY_INFO[currentLevel.targetCountry]?.hint || currentLevel.tip}
                  </p>
                </div>
                <Button onClick={tryAgain} className="bg-white text-amber-700 hover:bg-amber-100" data-testid="button-try-again">
                  <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'success' && reachedCountry && currentLevel && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed inset-x-4 bottom-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 shadow-2xl max-w-sm mx-auto border-2 border-green-300 z-50">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-xl font-bold text-white mb-2">Amazing Explorer!</h3>
                <p className="text-green-100 font-medium mb-2">
                  You found {reachedCountry.name}! {reachedCountry.flag}
                </p>
                <div className="bg-green-700/50 rounded-xl p-3 mb-3">
                  <p className="text-green-100 text-xs font-medium">
                    🧠 Remember: {currentLevel.memoryTip}
                  </p>
                </div>
                <p className="text-green-200 text-sm mb-2">
                  {starsEarned === 3 ? "Perfect navigation! 🌟" : starsEarned === 2 ? "Great exploring! 👏" : "You made it! 💪"}
                </p>
                <div className="flex justify-center mb-4">{renderStars(starsEarned, 'w-8 h-8')}</div>
                <Button onClick={nextLevel} className="bg-white text-green-700 hover:bg-green-100" data-testid="button-next-level">
                  {currentLevelIndex < levels.length - 1 ? 'Next Level' : 'Finish'} <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
