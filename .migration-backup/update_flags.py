import re

file_path = 'client/src/lib/gameData.ts'

city_to_code = {
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
}

with open(file_path, 'r') as f:
    content = f.read()

def injection(match):
    block = match.group(1)
    # Extract city
    m_city = re.search(r'"city": "(.*?)"', block)
    if m_city:
        city = m_city.group(1)
        if city in city_to_code:
            code = city_to_code[city]
            return f'{block}\n    "flagUrl": "https://flagcdn.com/w320/{code}.png",'
    return block

# Pattern matches:
# "city": "Name",
# "country": "Name",
# "continent": "Name",
pattern = r'("city": ".*?",\s*\n\s*"country": ".*?",\s*\n\s*"continent": ".*?",)'

new_content = re.sub(pattern, injection, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Updated flags.")