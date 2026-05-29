const fs = require('fs');

const filePath = 'client/src/lib/gameData.ts';

const cityToCode = {
    "Paris": "fr", "Rome": "it", "London": "gb", "Athens": "gr", "Berlin": "de",
    "Madrid": "es", "Amsterdam": "nl", "New York": "us", "Toronto": "ca",
    "Los Angeles": "us", "Chicago": "us", "Mexico City": "mx", "Vancouver": "ca",
    "San Francisco": "us", "Tokyo": "jp", "Beijing": "cn", "Bangkok": "th",
    "Mumbai": "in", "Seoul": "kr", "Singapore": "sg", "Dubai": "ae",
    "Rio de Janeiro": "br", "Buenos Aires": "ar", "Lima": "pe", "Santiago": "cl",
    "Bogotá": "co", "Caracas": "ve", "Quito": "ec", "Cairo": "eg", "Nairobi": "ke",
    "Cape Town": "za", "Johannesburg": "za", "Marrakesh": "ma", "Lagos": "ng",
    "Addis Ababa": "et", "Sydney": "au", "Melbourne": "au", "Auckland": "nz",
    "Brisbane": "au", "Perth": "au", "Honolulu": "us", "Fiji": "fj"
};

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match the block
    // "city": "...",
    // "country": "...",
    // "continent": "...",
    const pattern = /("city": "(.*?)",\s*\n\s*"country": ".*?",\s*\n\s*"continent": ".*?",)/g;

    const newContent = content.replace(pattern, (match, block, city) => {
        if (cityToCode[city]) {
            const code = cityToCode[city];
            return `${block}\n    "flagUrl": "https://flagcdn.com/w320/${code}.png",`;
        }
        return block;
    });

    fs.writeFileSync(filePath, newContent);
    console.log("Updated flags successfully.");
} catch (err) {
    console.error("Error:", err);
}