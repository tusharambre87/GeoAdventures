#!/usr/bin/env node
// Quick audit: which countries in guessMapsData have no 110m silhouette?
const topology = require('../node_modules/world-atlas/countries-110m.json');
const topojson = require('../node_modules/topojson-client/dist/topojson-client.js');
const d3 = require('../node_modules/d3-geo/dist/d3-geo.js');

const fc = topojson.feature(topology, topology.objects.countries);
const datasetIds = new Set(fc.features.map(f => String(f.id)));

function getPath(numericId) {
  const feature = fc.features.find(f => Number(f.id) === numericId);
  if (!feature || !feature.geometry) return null;
  try {
    const proj = d3.geoMercator().fitSize([500, 500], feature);
    return d3.geoPath(proj)(feature) ?? null;
  } catch { return null; }
}

// Inline the numeric IDs from guessMapsData.ts
const countries = [
  { id: 840, name: "United States" },
  { id: 124, name: "Canada" },
  { id: 76,  name: "Brazil" },
  { id: 484, name: "Mexico" },
  { id: 32,  name: "Argentina" },
  { id: 152, name: "Chile" },
  { id: 170, name: "Colombia" },
  { id: 604, name: "Peru" },
  { id: 862, name: "Venezuela" },
  { id: 858, name: "Uruguay" },
  { id: 600, name: "Paraguay" },
  { id: 68,  name: "Bolivia" },
  { id: 218, name: "Ecuador" },
  { id: 328, name: "Guyana" },
  { id: 740, name: "Suriname" },
  { id: 320, name: "Guatemala" },
  { id: 340, name: "Honduras" },
  { id: 222, name: "El Salvador" },
  { id: 558, name: "Nicaragua" },
  { id: 188, name: "Costa Rica" },
  { id: 591, name: "Panama" },
  { id: 84,  name: "Belize" },
  { id: 192, name: "Cuba" },
  { id: 332, name: "Haiti" },
  { id: 214, name: "Dominican Republic" },
  { id: 250, name: "France" },
  { id: 276, name: "Germany" },
  { id: 380, name: "Italy" },
  { id: 724, name: "Spain" },
  { id: 826, name: "United Kingdom" },
  { id: 620, name: "Portugal" },
  { id: 528, name: "Netherlands" },
  { id: 56,  name: "Belgium" },
  { id: 756, name: "Switzerland" },
  { id: 40,  name: "Austria" },
  { id: 752, name: "Sweden" },
  { id: 578, name: "Norway" },
  { id: 208, name: "Denmark" },
  { id: 246, name: "Finland" },
  { id: 300, name: "Greece" },
  { id: 616, name: "Poland" },
  { id: 372, name: "Ireland" },
  { id: 352, name: "Iceland" },
  { id: 643, name: "Russia" },
  { id: 804, name: "Ukraine" },
  { id: 203, name: "Czech Republic" },
  { id: 348, name: "Hungary" },
  { id: 642, name: "Romania" },
  { id: 100, name: "Bulgaria" },
  { id: 191, name: "Croatia" },
  { id: 703, name: "Slovakia" },
  { id: 705, name: "Slovenia" },
  { id: 688, name: "Serbia" },
  { id: 792, name: "Turkey" },
  { id: 643, name: "Russia" },
  { id: 400, name: "Jordan" },
  { id: 368, name: "Iraq" },
  { id: 364, name: "Iran" },
  { id: 682, name: "Saudi Arabia" },
  { id: 784, name: "United Arab Emirates" },
  { id: 634, name: "Qatar" },
  { id: 512, name: "Oman" },
  { id: 887, name: "Yemen" },
  { id: 760, name: "Syria" },
  { id: 422, name: "Lebanon" },
  { id: 376, name: "Israel" },
  { id: 392, name: "Japan" },
  { id: 156, name: "China" },
  { id: 356, name: "India" },
  { id: 410, name: "South Korea" },
  { id: 408, name: "North Korea" },
  { id: 764, name: "Thailand" },
  { id: 704, name: "Vietnam" },
  { id: 116, name: "Cambodia" },
  { id: 418, name: "Laos" },
  { id: 104, name: "Myanmar" },
  { id: 360, name: "Indonesia" },
  { id: 458, name: "Malaysia" },
  { id: 608, name: "Philippines" },
  { id: 50,  name: "Bangladesh" },
  { id: 144, name: "Sri Lanka" },
  { id: 524, name: "Nepal" },
  { id: 586, name: "Pakistan" },
  { id: 4,   name: "Afghanistan" },
  { id: 398, name: "Kazakhstan" },
  { id: 860, name: "Uzbekistan" },
  { id: 795, name: "Turkmenistan" },
  { id: 762, name: "Tajikistan" },
  { id: 417, name: "Kyrgyzstan" },
  { id: 496, name: "Mongolia" },
  { id: 818, name: "Egypt" },
  { id: 504, name: "Morocco" },
  { id: 12,  name: "Algeria" },
  { id: 788, name: "Tunisia" },
  { id: 434, name: "Libya" },
  { id: 729, name: "Sudan" },
  { id: 231, name: "Ethiopia" },
  { id: 706, name: "Somalia" },
  { id: 404, name: "Kenya" },
  { id: 800, name: "Uganda" },
  { id: 834, name: "Tanzania" },
  { id: 646, name: "Rwanda" },
  { id: 108, name: "Burundi" },
  { id: 710, name: "South Africa" },
  { id: 716, name: "Zimbabwe" },
  { id: 508, name: "Mozambique" },
  { id: 454, name: "Malawi" },
  { id: 894, name: "Zambia" },
  { id: 426, name: "Lesotho" },
  { id: 748, name: "Eswatini" },
  { id: 72,  name: "Botswana" },
  { id: 516, name: "Namibia" },
  { id: 24,  name: "Angola" },
  { id: 180, name: "DR Congo" },
  { id: 178, name: "Republic of Congo" },
  { id: 266, name: "Gabon" },
  { id: 120, name: "Cameroon" },
  { id: 566, name: "Nigeria" },
  { id: 288, name: "Ghana" },
  { id: 384, name: "Côte d'Ivoire" },
  { id: 324, name: "Guinea" },
  { id: 694, name: "Sierra Leone" },
  { id: 430, name: "Liberia" },
  { id: 686, name: "Senegal" },
  { id: 466, name: "Mali" },
  { id: 854, name: "Burkina Faso" },
  { id: 562, name: "Niger" },
  { id: 148, name: "Chad" },
  { id: 270, name: "Gambia" },
  { id: 624, name: "Guinea-Bissau" },
  { id: 132, name: "Cape Verde" },
  { id: 36,  name: "Australia" },
  { id: 554, name: "New Zealand" },
  { id: 598, name: "Papua New Guinea" },
  { id: 242, name: "Fiji" },
];

const missing = [];
const present = [];

for (const c of countries) {
  const p = getPath(c.id);
  if (!p) missing.push(`  ✗ ${c.name} (${c.id})`);
  else present.push(`  ✓ ${c.name} (${c.id})`);
}

console.log(`\n✅ Countries WITH valid paths: ${present.length}`);
console.log(`❌ Countries MISSING paths:    ${missing.length}`);
if (missing.length) {
  console.log('\nMissing:');
  missing.forEach(m => console.log(m));
}
console.log(`\nDataset total features: ${fc.features.length}`);
