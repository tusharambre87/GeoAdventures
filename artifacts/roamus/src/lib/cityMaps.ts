import addisAbaba from "../assets/maps/Addis_Ababa.png";
import amsterdam from "../assets/maps/Amsterdam.png";
import athens from "../assets/maps/Athens.png";
import auckland from "../assets/maps/Auckland.png";
import bangkok from "../assets/maps/Bangkok.png";
import beijing from "../assets/maps/Beijing.png";
import berlin from "../assets/maps/Berlin.png";
import bogota from "@assets/Bogota-colombia_1764711748637.jpg";
import brisbane from "../assets/maps/Brisbane.png";
import buenosAires from "../assets/maps/Buenos_Aires.png";
import cairo from "../assets/maps/Cairo.png";
import capeTown from "../assets/maps/Cape_Town.png";
import caracas from "../assets/maps/Caracas.png";
import chicago from "../assets/maps/Chicago.png";
import delhi from "../assets/maps/Delhi.png";
import dubai from "../assets/maps/Dubai.png";
import fiji from "../assets/maps/Fiji.png";
import johannesburg from "../assets/maps/Johannesburg.png";
import lagos from "../assets/maps/Lagos.png";
import lima from "../assets/maps/Lima.png";
import london from "../assets/maps/London.png";
import losAngeles from "../assets/maps/Los_Angeles.png";
import madrid from "../assets/maps/Madrid.png";
import marrakesh from "../assets/maps/Marrakesh.png";
import melbourne from "../assets/maps/Melbourne.png";
import mexicoCity from "../assets/maps/Mexico_City.png";
import mumbai from "../assets/maps/Mumbai.png";
import nairobi from "../assets/maps/Nairobi.png";
import newYork from "../assets/maps/New_York.png";
import paris from "../assets/maps/Paris.png";
import perth from "../assets/maps/Perth.png";
import quito from "../assets/maps/Quito.png";
import rioDeJaneiro from "../assets/maps/Rio_De_Janeiro.png";
import sanFrancisco from "../assets/maps/San_Francisco.png";
import santiago from "../assets/maps/Santiago.png";
import seoul from "../assets/maps/Seoul.png";
import singapore from "../assets/maps/Singapore.png";
import sydney from "../assets/maps/Sydney.png";
import tokyo from "../assets/maps/Tokyo.png";
import toronto from "../assets/maps/Toronto.png";
import vancouver from "../assets/maps/Vancouver.png";
import wellington from "../assets/maps/Wellington.png";
import moscow from "../assets/maps/Moscow.png";
import rome from "../assets/maps/Rome.png";

import chinaMap from "@assets/image_1764692657002.png";
import australiaMap from "@assets/Gemini_Generated_Image_13clci13clci13cl_1764692907489.png";
import indiaMap from "@assets/Gemini_Generated_Image_yt05vyt05vyt05vy_1764692971899.png";
import russiaMap from "@assets/Gemini_Generated_Image_6eki2e6eki2e6eki_1764693022174.png";
import peruMap from "@assets/Gemini_Generated_Image_oskm6roskm6roskm_1764693084149.png";
import japanMap from "@assets/Gemini_Generated_Image_ur67laur67laur67_1764693128761.png";
import antarcticaMap from "@assets/Gemini_Generated_Image_inelscinelscinel_1764693201213.png";
import brazilMap from "@assets/Gemini_Generated_Image_ncthwpncthwpncth_1764693723516.png";
import franceMap from "@assets/Gemini_Generated_Image_mck1xlmck1xlmck1_1764693968583.png";
import usaMap from "@assets/Gemini_Generated_Image_g548zog548zog548_1764693973167.png";
import canadaMap from "@assets/Gemini_Generated_Image_tzfcyctzfcyctzfc_1764693993980.png";
import kenyaMap from "@assets/Gemini_Generated_Image_vdv6l2vdv6l2vdv6_1764694307864.png";
import egyptMap from "@assets/Gemini_Generated_Image_e9k7n2e9k7n2e9k7_1764694314600.png";
import icelandMap from "@assets/Gemini_Generated_Image_t2a3wet2a3wet2a3_1764694339684.png";
import newZealandMap from "@assets/Gemini_Generated_Image_b0nd52b0nd52b0nd_1764694542183.png";
import argentinaMap from "@assets/Gemini_Generated_Image_rmgnmsrmgnmsrmgn_1764694545631.png";
import norwayMap from "@assets/Gemini_Generated_Image_5mb0u65mb0u65mb0_1764694909687.png";
import italyMap from "@assets/Gemini_Generated_Image_hz90f3hz90f3hz90_1764694918681.png";
import mexicoMap from "@assets/Gemini_Generated_Image_lmo9pxlmo9pxlmo9_1764695006601.png";
import thailandMap from "@assets/Gemini_Generated_Image_hubxb6hubxb6hubx_1764695050186.png";
import spainMap from "@assets/Gemini_Generated_Image_urau78urau78urau_1764695059194.png";
import germanyMap from "@assets/Gemini_Generated_Image_8u2fhd8u2fhd8u2f_1764695106707.png";
import southKoreaMap from "@assets/Gemini_Generated_Image_kc23gukc23gukc23_1764695150697.png";

const cityMaps: Record<string, string> = {
  "Addis Ababa": addisAbaba,
  "Amsterdam": amsterdam,
  "Athens": athens,
  "Auckland": auckland,
  "Bangkok": bangkok,
  "Beijing": beijing,
  "Berlin": berlin,
  "Bogota": bogota,
  "Brisbane": brisbane,
  "Buenos Aires": buenosAires,
  "Cairo": cairo,
  "Cape Town": capeTown,
  "Caracas": caracas,
  "Chicago": chicago,
  "Delhi": delhi,
  "Dubai": dubai,
  "Fiji": fiji,
  "Johannesburg": johannesburg,
  "Lagos": lagos,
  "Lima": lima,
  "London": london,
  "Los Angeles": losAngeles,
  "Madrid": madrid,
  "Marrakesh": marrakesh,
  "Melbourne": melbourne,
  "Mexico City": mexicoCity,
  "Moscow": moscow,
  "Mumbai": mumbai,
  "Nairobi": nairobi,
  "New York": newYork,
  "Paris": paris,
  "Perth": perth,
  "Quito": quito,
  "Rio de Janeiro": rioDeJaneiro,
  "Rome": rome,
  "San Francisco": sanFrancisco,
  "Santiago": santiago,
  "Seoul": seoul,
  "Singapore": singapore,
  "Sydney": sydney,
  "Tokyo": tokyo,
  "Toronto": toronto,
  "Vancouver": vancouver,
  "Wellington": wellington
};

const countryMaps: Record<string, string> = {
  "china": chinaMap,
  "australia": australiaMap,
  "india": indiaMap,
  "russia": russiaMap,
  "peru": peruMap,
  "japan": japanMap,
  "antarctica": antarcticaMap,
  "brazil": brazilMap,
  "france": franceMap,
  "usa": usaMap,
  "united states": usaMap,
  "canada": canadaMap,
  "kenya": kenyaMap,
  "egypt": egyptMap,
  "iceland": icelandMap,
  "new zealand": newZealandMap,
  "argentina": argentinaMap,
  "norway": norwayMap,
  "italy": italyMap,
  "mexico": mexicoMap,
  "thailand": thailandMap,
  "spain": spainMap,
  "germany": germanyMap,
  "south korea": southKoreaMap,
  "uk": london,
  "united kingdom": london,
  "uae": dubai,
  "united arab emirates": dubai,
  "south africa": capeTown,
  "netherlands": amsterdam,
  "greece": athens,
  "singapore": singapore,
  "ethiopia": addisAbaba,
  "morocco": marrakesh,
  "nigeria": lagos,
  "venezuela": caracas,
  "chile": santiago,
  "colombia": bogota,
  "fiji": fiji
};

export const getCityMapUrl = (city: string, country: string): string => {
  if (cityMaps[city]) return cityMaps[city];
  
  const key = Object.keys(cityMaps).find(k => k.toLowerCase() === city.toLowerCase());
  if (key) return cityMaps[key];

  const c = country.toLowerCase().trim();
  if (countryMaps[c]) return countryMaps[c];
  
  const cityKey = Object.keys(cityMaps).find(k => {
    const cityCountry = getCityCountry(k);
    return cityCountry && cityCountry.toLowerCase() === c;
  });
  if (cityKey) return cityMaps[cityKey];

  return usaMap;
};

const getCityCountry = (city: string): string | null => {
  const cityToCountry: Record<string, string> = {
    "Paris": "france",
    "London": "united kingdom",
    "Tokyo": "japan",
    "Beijing": "china",
    "Sydney": "australia",
    "Melbourne": "australia",
    "Brisbane": "australia",
    "Perth": "australia",
    "New York": "usa",
    "Los Angeles": "usa",
    "San Francisco": "usa",
    "Chicago": "usa",
    "Toronto": "canada",
    "Vancouver": "canada",
    "Berlin": "germany",
    "Rome": "italy",
    "Madrid": "spain",
    "Amsterdam": "netherlands",
    "Athens": "greece",
    "Moscow": "russia",
    "Dubai": "uae",
    "Mumbai": "india",
    "Delhi": "india",
    "Bangkok": "thailand",
    "Seoul": "south korea",
    "Singapore": "singapore",
    "Cairo": "egypt",
    "Nairobi": "kenya",
    "Cape Town": "south africa",
    "Johannesburg": "south africa",
    "Lagos": "nigeria",
    "Addis Ababa": "ethiopia",
    "Marrakesh": "morocco",
    "Rio de Janeiro": "brazil",
    "Buenos Aires": "argentina",
    "Lima": "peru",
    "Santiago": "chile",
    "Bogota": "colombia",
    "Caracas": "venezuela",
    "Quito": "ecuador",
    "Mexico City": "mexico",
    "Auckland": "new zealand",
    "Wellington": "new zealand",
    "Fiji": "fiji"
  };
  return cityToCountry[city] || null;
};

export { countryMaps };
