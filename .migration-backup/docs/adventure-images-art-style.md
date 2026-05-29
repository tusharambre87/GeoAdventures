# GeoAdventures Illustrated Image Art Style Guide

## Art Style Prompt Template

### Base Style
```
warm storybook illustration style, bold shapes, vibrant colors, children's picture book aesthetic, soft watercolor textures, whimsical and inviting, no text, no people
```

### Negative Prompt
```
realistic photo, dark, scary, text, words, letters, watermark, blurry, low quality, people, faces, characters
```

## Image Specifications

### City Hero Images (16:9)
- **Purpose**: Header/hero images for trip cards, adventure home pages
- **Aspect Ratio**: 16:9
- **Location**: `public/images/adventure/cities/{city-slug}.png`
- **Prompt Pattern**: `{base style}. {city name} skyline with {2-3 iconic landmarks}, {atmosphere/sky}, {distinctive local elements}`
- **Example**: `warm storybook illustration style... Paris skyline with Eiffel Tower, Notre-Dame cathedral, and Arc de Triomphe, soft sunset sky, café awnings and flower boxes along cobblestone streets`

### City-Specific Stop Images (4:3)
- **Purpose**: Individual landmark/location images within a city's adventure
- **Aspect Ratio**: 4:3
- **Location**: `public/images/adventure/stops/{city-slug}-{landmark-slug}.png`
- **Prompt Pattern**: `{base style}. {Landmark full name} {detailed visual description of the landmark}, {surrounding environment}, {atmospheric details}`
- **Example**: `warm storybook illustration style... Eiffel Tower iron lattice structure at golden hour, glowing lights, Champ de Mars gardens below, Seine River visible, Parisian rooftops`

### Generic Stop Type Images (4:3)
- **Purpose**: Fallback images for stop types without city-specific illustrations
- **Aspect Ratio**: 4:3
- **Location**: `public/images/adventure/stops/{stop-type}.png`
- **Prompt Pattern**: `{base style}. Generic {stop type} scene, {typical visual elements}, {inviting atmosphere}`

## Pilot Cities (10)
1. Paris
2. Tokyo
3. Honolulu
4. Cairo
5. Rio de Janeiro
6. Sydney
7. London
8. Delhi
9. Cape Town
10. New York

## Generic Stop Types (30)
temple, market, park, beach, museum, mountain, waterfall, castle, food, harbor, jungle, safari, garden, bridge, volcano, square, ruins, reef, lighthouse, zen-garden, cathedral, village, observatory, river, aquarium, street-art, desert, tea-house, festival, lake

## Image Resolution Mapping (adventureImages.ts)

### Lookup Priority
1. **City-specific stop**: If the stop name matches a known landmark for the resolved city, return the city-specific image
2. **Generic stop type**: If the stop name or type matches a generic stop category keyword, return the generic image
3. **Hash fallback**: Deterministic selection from fallback images based on stop name hash

### Adding New Cities
1. Generate 1 city hero image (16:9) at `public/images/adventure/cities/{city-slug}.png`
2. Generate 10 city-specific stop images (4:3) at `public/images/adventure/stops/{city-slug}-{landmark-slug}.png`
3. Add city to `ADVENTURE_CITY_IMAGES` mapping
4. Add city alias entries to `CITY_KEY_MAP`
5. Add landmark keyword entries to `CITY_STOP_IMAGES[cityKey]`
6. Add city name to `PILOT_CITIES` array

### File Naming Conventions
- City slugs: lowercase, no spaces (e.g., `capetown`, `newyork`, `rio`)
- Landmark slugs: lowercase, hyphens for spaces (e.g., `eiffel-tower`, `taj-mahal`, `central-park`)
- Generic stop types: lowercase, hyphens for multi-word (e.g., `zen-garden`, `street-art`, `tea-house`)
