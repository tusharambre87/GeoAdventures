const ADVENTURE_CITY_IMAGES: Record<string, string> = {
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
  honolulu: "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
  hawaii: "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
  cairo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
  rio: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  "rio de janeiro": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  delhi: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "new delhi": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "cape town": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  capetown: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  newyork: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  "new york city": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  nyc: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  chicago: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop&q=80",
  "saint louis": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "st. louis": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "st louis": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "los angeles": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=600&fit=crop&q=80",
  "las vegas": "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=800&h=600&fit=crop&q=80",
  "san francisco": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop&q=80",
  miami: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  seattle: "https://images.unsplash.com/photo-1474080280060-6cd81e9f4d2e?w=800&h=600&fit=crop&q=80",
  denver: "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&h=600&fit=crop&q=80",
  boston: "https://images.unsplash.com/photo-1501979376754-b5cc4a4f3e12?w=800&h=600&fit=crop&q=80",
  washington: "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=600&fit=crop&q=80",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  barcelona: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
  berlin: "https://images.unsplash.com/photo-1546268060-2592ff93ee24?w=800&h=600&fit=crop&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop&q=80",
  "mexico city": "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
  // ── India – South ──────────────────────────────────────────────────────────
  bangalore: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  bengaluru: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  "bangalore, india": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  "bangalore, karnataka": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  mysore: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  mysuru: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  "mysore, karnataka": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  "mysore, india": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  ooty: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg",
  "ooty, tamilnadu": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg",
  "ooty, tamil nadu": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg",
  ootacamund: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg",
  // ── India – Other key cities ────────────────────────────────────────────────
  mumbai: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "mumbai, india": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "south mumbai": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  goa: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Baga_Beach_Goa_India.jpg/800px-Baga_Beach_Goa_India.jpg",
  "goa, india": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Baga_Beach_Goa_India.jpg/800px-Baga_Beach_Goa_India.jpg",
  jaipur: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hawa_Mahal_Jaipur.jpg/800px-Hawa_Mahal_Jaipur.jpg",
  "jaipur, india": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hawa_Mahal_Jaipur.jpg/800px-Hawa_Mahal_Jaipur.jpg",
  agra: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg",
  "agra, india": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg",
  kochi: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "kochi, india": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  kerala: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "udaipur, india": "https://images.unsplash.com/photo-1617516975781-13b06c12e5fc?w=800&h=600&fit=crop&q=80",
  udaipur: "https://images.unsplash.com/photo-1617516975781-13b06c12e5fc?w=800&h=600&fit=crop&q=80",
  varanasi: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&h=600&fit=crop&q=80",
  "varanasi, india": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&h=600&fit=crop&q=80",
  // ── India – Hill Stations ───────────────────────────────────────────────────
  manali: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  "manali, india": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  shimla: "https://images.unsplash.com/photo-1597975820995-f2810af07958?w=800&h=600&fit=crop&q=80",
  "shimla, india": "https://images.unsplash.com/photo-1597975820995-f2810af07958?w=800&h=600&fit=crop&q=80",
  darjeeling: "https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&h=600&fit=crop&q=80",
  "darjeeling, india": "https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&h=600&fit=crop&q=80",
  // ── India – Heritage Cities ─────────────────────────────────────────────────
  amritsar: "https://images.unsplash.com/photo-1607427293702-036707ce1e19?w=800&h=600&fit=crop&q=80",
  "amritsar, india": "https://images.unsplash.com/photo-1607427293702-036707ce1e19?w=800&h=600&fit=crop&q=80",
  hyderabad: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "hyderabad, india": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  calcutta: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  "kolkata, india": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  // ── India – Nature & Backwaters ─────────────────────────────────────────────
  coorg: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&h=600&fit=crop&q=80",
  "coorg, india": "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&h=600&fit=crop&q=80",
  alleppey: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  alappuzha: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "alleppey, india": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  pondicherry: "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  puducherry: "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "pondicherry, india": "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  // ── 10 new canonical cities ────────────────────────────────────────────────
  rishikesh: "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&h=600&fit=crop&q=80",
  "rishikesh, india": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&h=600&fit=crop&q=80",
  hampi: "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "hampi, india": "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  jaisalmer: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "jaisalmer, india": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  ladakh: "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  leh: "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  "leh ladakh": "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  "leh ladakh, india": "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  lonavala: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "lonavala, india": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  madurai: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "madurai, india": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  mahabalipuram: "https://images.unsplash.com/photo-1594760467013-64ac2b922aee?w=800&h=600&fit=crop&q=80",
  mamallapuram: "https://images.unsplash.com/photo-1594760467013-64ac2b922aee?w=800&h=600&fit=crop&q=80",
  "mahabalipuram, india": "https://images.unsplash.com/photo-1594760467013-64ac2b922aee?w=800&h=600&fit=crop&q=80",
  ranthambore: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "ranthambore, india": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  varkala: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "varkala, india": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  ahmedabad: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  amdavad: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "ahmedabad, india": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  // ── 3 new canonical cities (batch 3) ──────────────────────────────────────
  chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  madras: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "chennai, india": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  mahabaleshwar: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "mahabaleshwar, india": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "mahabaleshwar, maharashtra": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  matheran: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "matheran, india": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "matheran, maharashtra": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
};

// Alternative images (variant 1 = card 3 "kids", variant 2 = card 4 "parent")
// Each city gets up to 2 more distinct landmark photos so the carousel never repeats.
const ADVENTURE_CITY_IMAGES_V2: Record<string, string> = {
  london:        "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&h=600&fit=crop&q=80",
  paris:         "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&q=80",
  tokyo:         "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop&q=80",
  "new york":    "https://images.unsplash.com/photo-1553285254-39e2c575c5f3?w=800&h=600&fit=crop&q=80",
  nyc:           "https://images.unsplash.com/photo-1553285254-39e2c575c5f3?w=800&h=600&fit=crop&q=80",
  "new york city": "https://images.unsplash.com/photo-1553285254-39e2c575c5f3?w=800&h=600&fit=crop&q=80",
  chicago:       "https://images.unsplash.com/photo-1586380951230-e6703d9f6833?w=800&h=600&fit=crop&q=80",
  sydney:        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  rome:          "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  barcelona:     "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80",
  amsterdam:     "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
  berlin:        "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&h=600&fit=crop&q=80",
  dubai:         "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&h=600&fit=crop&q=80",
  singapore:     "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&h=600&fit=crop&q=80",
  bangkok:       "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&h=600&fit=crop&q=80",
  cairo:         "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  rio:           "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "rio de janeiro": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  delhi:         "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=600&fit=crop&q=80",
  "new delhi":   "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=600&fit=crop&q=80",
  mumbai:        "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  bangalore:     "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=600&fit=crop&q=80",
  bengaluru:     "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=600&fit=crop&q=80",
  mysore:        "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  mysuru:        "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  ooty:          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  goa:           "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  jaipur:        "https://images.unsplash.com/photo-1477587458883-47145ed31769?w=800&h=600&fit=crop&q=80",
  agra:          "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  kochi:         "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  udaipur:       "https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=800&h=600&fit=crop&q=80",
  varanasi:      "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",
  "cape town":   "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  capetown:      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  miami:         "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "san francisco": "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&h=600&fit=crop&q=80",
  "los angeles": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=600&fit=crop&q=80",
};

const ADVENTURE_CITY_IMAGES_V3: Record<string, string> = {
  london:        "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
  paris:         "https://images.unsplash.com/photo-1560090370-e42b87e688af?w=800&h=600&fit=crop&q=80",
  tokyo:         "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop&q=80",
  "new york":    "https://images.unsplash.com/photo-1492360630eed-a75a105b2e94?w=800&h=600&fit=crop&q=80",
  nyc:           "https://images.unsplash.com/photo-1492360630eed-a75a105b2e94?w=800&h=600&fit=crop&q=80",
  "new york city": "https://images.unsplash.com/photo-1492360630eed-a75a105b2e94?w=800&h=600&fit=crop&q=80",
  chicago:       "https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?w=800&h=600&fit=crop&q=80",
  sydney:        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  rome:          "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  barcelona:     "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
  amsterdam:     "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&h=600&fit=crop&q=80",
  berlin:        "https://images.unsplash.com/photo-1546268060-2592ff93ee24?w=800&h=600&fit=crop&q=80",
  dubai:         "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
  singapore:     "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
  bangkok:       "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop&q=80",
  cairo:         "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
  rio:           "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  "rio de janeiro": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  delhi:         "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "new delhi":   "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  mumbai:        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/800px-Mumbai_03-2016_30_Gateway_of_India.jpg",
  bangalore:     "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  bengaluru:     "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Vidhana_Soudha_%28India%29.jpg/800px-Vidhana_Soudha_%28India%29.jpg",
  mysore:        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  mysuru:        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mysore_palace_illuminated.jpg/800px-Mysore_palace_illuminated.jpg",
  ooty:          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ooty_Botanical_gardens.jpg/800px-Ooty_Botanical_gardens.jpg",
  goa:           "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Baga_Beach_Goa_India.jpg/800px-Baga_Beach_Goa_India.jpg",
  jaipur:        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hawa_Mahal_Jaipur.jpg/800px-Hawa_Mahal_Jaipur.jpg",
  agra:          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg",
  kochi:         "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  udaipur:       "https://images.unsplash.com/photo-1617516975781-13b06c12e5fc?w=800&h=600&fit=crop&q=80",
  varanasi:      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&h=600&fit=crop&q=80",
  "cape town":   "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  capetown:      "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  miami:         "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?w=800&h=600&fit=crop&q=80",
  "san francisco": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop&q=80",
  "los angeles": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=600&fit=crop&q=80",
};

const CITY_STOP_IMAGES: Record<string, Record<string, string>> = {
  paris: {
    "eiffel tower": "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&h=600&fit=crop&q=80",
    "eiffel": "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&h=600&fit=crop&q=80",
    "louvre": "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=600&fit=crop&q=80",
    "notre-dame": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&q=80",
    "notre dame": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&q=80",
    "champs-élysées": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
    "champs elysees": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
    "champs-elysees": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
    "sacré-cœur": "https://images.unsplash.com/photo-1560090370-e42b87e688af?w=800&h=600&fit=crop&q=80",
    "sacre coeur": "https://images.unsplash.com/photo-1560090370-e42b87e688af?w=800&h=600&fit=crop&q=80",
    "sacré-coeur": "https://images.unsplash.com/photo-1560090370-e42b87e688af?w=800&h=600&fit=crop&q=80",
    "seine": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
    "arc de triomphe": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&q=80",
    "triomphe": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&q=80",
    "luxembourg": "https://images.unsplash.com/photo-1560090370-e42b87e688af?w=800&h=600&fit=crop&q=80",
    "montmartre": "https://images.unsplash.com/photo-1569439282813-a2e738b4a0af?w=800&h=600&fit=crop&q=80",
    "versailles": "https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?w=800&h=600&fit=crop&q=80",
  },
  tokyo: {
    "sensoji": "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop&q=80",
    "asakusa": "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop&q=80",
    "shibuya": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "meiji": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
    "tokyo tower": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "akihabara": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "imperial palace": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
    "tsukiji": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "harajuku": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "takeshita": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "shinjuku": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "golden gai": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
    "fuji": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop&q=80",
    "mount fuji": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop&q=80",
    "kawaguchiko": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop&q=80",
  },
  honolulu: {
    "waikiki": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "diamond head": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "pearl harbor": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "north shore": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "hanauma": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "hanauma bay": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "iolani": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "polynesian": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "ko olina": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
    "manoa falls": "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
    "manoa": "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
    "chinatown": "https://images.unsplash.com/photo-1507473879009-6dc74614e6b6?w=800&h=600&fit=crop&q=80",
  },
  cairo: {
    "pyramid": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "pyramids": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "giza": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "sphinx": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "egyptian museum": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "khan el-khalili": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "khan el khalili": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "bazaar": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "nile": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "citadel": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "al-azhar": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "al azhar": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "cairo tower": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "coptic": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop&q=80",
    "step pyramid": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "saqqara": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
    "djoser": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  },
  rio: {
    "christ": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "redeemer": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "corcovado": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "sugarloaf": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "sugar loaf": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "pão de açúcar": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "copacabana": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "ipanema": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "maracanã": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",
    "maracana": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",
    "stadium": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",
    "lapa": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "botanical": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "jardim": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "santa teresa": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "tijuca": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
    "selarón": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
    "selaron": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  },
  sydney: {
    "opera house": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "opera": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "harbour bridge": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "harbor bridge": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "bondi": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "botanic garden": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "royal botanic": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "taronga": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
    "the rocks": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "darling harbour": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "darling harbor": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
    "blue mountains": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
    "three sisters": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
    "manly": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "circular quay": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
  },
  london: {
    "big ben": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "westminster": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "parliament": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "tower of london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "crown jewels": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "buckingham": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "london eye": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "tower bridge": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "british museum": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "hyde park": "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
    "kensington": "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
    "st paul": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "saint paul": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "trafalgar": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
    "camden": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  },
  delhi: {
    "taj mahal": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "taj": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "red fort": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "lal qila": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "qutub minar": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "qutub": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "qutb": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "india gate": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "humayun": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "chandni chowk": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "chandni": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "lotus temple": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "lotus": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "jama masjid": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "connaught": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
    "akshardham": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  },
  capetown: {
    "table mountain": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "bo-kaap": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "bo kaap": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "boulders beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "boulders": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "penguin": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "v&a waterfront": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "waterfront": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "cape point": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "cape of good hope": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "kirstenbosch": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "robben island": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "robben": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "signal hill": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "chapman": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
    "district six": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  },
  newyork: {
    "statue of liberty": "https://images.unsplash.com/photo-1503751071777-d2918b21bbd9?w=800&h=600&fit=crop&q=80",
    "liberty": "https://images.unsplash.com/photo-1503751071777-d2918b21bbd9?w=800&h=600&fit=crop&q=80",
    "central park": "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
    "times square": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "broadway": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "brooklyn bridge": "https://images.unsplash.com/photo-1553285254-39e2c575c5f3?w=800&h=600&fit=crop&q=80",
    "empire state": "https://images.unsplash.com/photo-1492360630eed-a75a105b2e94?w=800&h=600&fit=crop&q=80",
    "metropolitan museum": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "the met": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "grand central": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "fifth avenue": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "5th avenue": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "rockefeller": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "wall street": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
    "coney island": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",
  },
  barcelona: {
    "sagrada familia": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80",
    "sagrada":         "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80",
    "park güell":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "parc güell":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "parc guell":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "park guell":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "güell":           "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "las ramblas":     "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "la rambla":       "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "rambla":          "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "gothic":          "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "gòtic":           "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "born":            "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "barceloneta":     "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "montjuïc":        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "montjuic":        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "ciutadella":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "casa batlló":     "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "casa batllo":     "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "casa milà":       "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "la pedrera":      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "camp nou":        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "picasso":         "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
    "palau":           "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80",
  },
  rome: {
    "colosseum":       "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
    "coliseum":        "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
    "roman forum":     "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
    "trevi":           "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
    "pantheon":        "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
    "vatican":         "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "sistine":         "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "borghese":        "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "trastevere":      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "spanish steps":   "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "piazza navona":   "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "campo de fiori":  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  },
  amsterdam: {
    "rijksmuseum":     "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
    "anne frank":      "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
    "van gogh":        "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
    "vondelpark":      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "jordaan":         "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
    "heineken":        "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80",
    "keukenhof":       "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  },
  dubai: {
    "burj khalifa":    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "burj al arab":    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "dubai mall":      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "palm jumeirah":   "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "creek":           "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "gold souk":       "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "spice souk":      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
    "miracle garden":  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  },
  singapore: {
    "gardens by the bay": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
    "marina bay":      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
    "sentosa":         "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    "universal":       "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
    "chinatown":       "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
    "little india":    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop&q=80",
    "hawker":          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "botanic":         "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  },
  mexicocity: {
    "teotihuacan":     "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
    "aztec":           "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
    "zocalo":          "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
    "coyoacan":        "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
    "frida kahlo":     "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
    "chapultepec":     "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "xochimilco":      "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&h=600&fit=crop&q=80",
  },
  // ── Bangalore (Garden City of India) ──────────────────────────────────────
  bangalore: {
    "bangalore palace":           "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&h=600&fit=crop&q=80",
    "cubbon park":                "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "lalbagh botanical":          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "lalbagh":                    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "bannerghatta biological":    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
    "bannerghatta":               "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
    "iskcon":                     "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
    "malleswaram":                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "vidyarthi bhavan":           "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "innovative film city":       "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
    "visvesvaraya":               "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "vidhana soudha":             "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop&q=80",
    "ulsoor lake":                "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
    "national gallery":           "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "tipu sultan":                "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&h=600&fit=crop&q=80",
    "commercial street":          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "mg road":                    "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop&q=80",
  },
  // ── Mysore (City of Palaces) ───────────────────────────────────────────────
  mysore: {
    "mysore palace":              "https://images.unsplash.com/photo-1616426062647-25e9f12c74c2?w=800&h=600&fit=crop&q=80",
    "mysuru palace":              "https://images.unsplash.com/photo-1616426062647-25e9f12c74c2?w=800&h=600&fit=crop&q=80",
    "chamundi":                   "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
    "chamundeswari":              "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
    "brindavan gardens":          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "brindavan":                  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "mysuru zoo":                 "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
    "mysore zoo":                 "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
    "devaraja market":            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "devaraja":                   "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "jaganmohan palace":          "https://images.unsplash.com/photo-1616426062647-25e9f12c74c2?w=800&h=600&fit=crop&q=80",
    "krishnaraja sagar":          "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
    "karanji lake":               "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
    "regional museum":            "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
    "st. philomena":              "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
    "st philomena":               "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
  },
  // ── Ooty (Queen of Hill Stations) ─────────────────────────────────────────
  ooty: {
    "nilgiri mountain railway":   "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
    "nilgiri railway":            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
    "mountain railway":           "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
    "toy train":                  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
    "ooty botanical":             "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "botanical garden":           "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "thread garden":              "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "rose garden":                "https://images.unsplash.com/photo-1561181286-d3f8d8f79494?w=800&h=600&fit=crop&q=80",
    "ooty lake":                  "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
    "ooty lake and boathouse":    "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
    "doddabetta":                 "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
    "tea museum":                 "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
    "tea plantation":             "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
    "pykara falls":               "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
    "pykara":                     "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
    "ketti valley":               "https://images.unsplash.com/photo-1449038221263-3ffde35ee0ed?w=800&h=600&fit=crop&q=80",
    "emerald lake":               "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
    "avalanche lake":             "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
    "avalanche":                  "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
    "ooty market":                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    "st. stephen":                "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
    "st stephen":                 "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
    "stephen's church":           "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
    "sim's park":                 "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
    "sims park":                  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  },
};

const CITY_KEY_MAP: Record<string, string> = {
  paris: "paris",
  tokyo: "tokyo",
  honolulu: "honolulu",
  hawaii: "honolulu",
  cairo: "cairo",
  rio: "rio",
  "rio de janeiro": "rio",
  sydney: "sydney",
  london: "london",
  delhi: "delhi",
  "new delhi": "delhi",
  "cape town": "capetown",
  capetown: "capetown",
  "new york": "newyork",
  "new york city": "newyork",
  nyc: "newyork",
  barcelona: "barcelona",
  rome: "rome",
  amsterdam: "amsterdam",
  berlin: "berlin",
  dubai: "dubai",
  singapore: "singapore",
  bangkok: "bangkok",
  "mexico city": "mexicocity",
  // ── India – South ──────────────────────────────────────────────────────────
  bangalore: "bangalore",
  bengaluru: "bangalore",
  "bangalore, india": "bangalore",
  mysore: "mysore",
  mysuru: "mysore",
  "mysore, karnataka": "mysore",
  ooty: "ooty",
  "ooty, tamilnadu": "ooty",
  "ooty, tamil nadu": "ooty",
  ootacamund: "ooty",
  // ── India – Hill Stations ───────────────────────────────────────────────────
  manali: "manali",
  "manali, india": "manali",
  "manali, himachal": "manali",
  shimla: "shimla",
  "shimla, india": "shimla",
  darjeeling: "darjeeling",
  "darjeeling, india": "darjeeling",
  // ── India – Heritage Cities ─────────────────────────────────────────────────
  amritsar: "amritsar",
  "amritsar, india": "amritsar",
  hyderabad: "hyderabad",
  "hyderabad, india": "hyderabad",
  kolkata: "kolkata",
  calcutta: "kolkata",
  "kolkata, india": "kolkata",
  // ── India – Nature & Backwaters ─────────────────────────────────────────────
  coorg: "coorg",
  kodagu: "coorg",
  "coorg, india": "coorg",
  alleppey: "alleppey",
  alappuzha: "alleppey",
  "alleppey, india": "alleppey",
  pondicherry: "pondicherry",
  puducherry: "pondicherry",
  "pondicherry, india": "pondicherry",
  // ── India – Adventure & Spiritual ──────────────────────────────────────────
  rishikesh: "rishikesh",
  "rishikesh, india": "rishikesh",
  "rishikesh, uttarakhand": "rishikesh",
  // ── India – UNESCO Ruins ────────────────────────────────────────────────────
  hampi: "hampi",
  "hampi, india": "hampi",
  "hampi, karnataka": "hampi",
  // ── India – Rajasthan Desert ────────────────────────────────────────────────
  jaisalmer: "jaisalmer",
  "jaisalmer, india": "jaisalmer",
  "jaisalmer, rajasthan": "jaisalmer",
  // ── India – Himalaya / Ladakh ───────────────────────────────────────────────
  ladakh: "ladakh",
  leh: "ladakh",
  "leh ladakh": "ladakh",
  "leh, india": "ladakh",
  "ladakh, india": "ladakh",
  "leh ladakh, india": "ladakh",
  // ── India – Western Ghats ───────────────────────────────────────────────────
  lonavala: "lonavala",
  "lonavala, india": "lonavala",
  "lonavala, maharashtra": "lonavala",
  // ── India – Tamil Nadu Heritage ─────────────────────────────────────────────
  madurai: "madurai",
  "madurai, india": "madurai",
  "madurai, tamil nadu": "madurai",
  mahabalipuram: "mahabalipuram",
  mamallapuram: "mahabalipuram",
  "mahabalipuram, india": "mahabalipuram",
  "mahabalipuram, tamil nadu": "mahabalipuram",
  // ── India – Wildlife ────────────────────────────────────────────────────────
  ranthambore: "ranthambore",
  "ranthambore, india": "ranthambore",
  "ranthambore, rajasthan": "ranthambore",
  // ── India – Kerala Cliff Coast ──────────────────────────────────────────────
  varkala: "varkala",
  "varkala, india": "varkala",
  "varkala, kerala": "varkala",
  // ── India – Gujarat ─────────────────────────────────────────────────────────
  ahmedabad: "ahmedabad",
  "ahmedabad, india": "ahmedabad",
  "ahmedabad, gujarat": "ahmedabad",
  amdavad: "ahmedabad",
  // ── India – South Metros ────────────────────────────────────────────────────
  chennai: "chennai",
  madras: "chennai",
  "chennai, india": "chennai",
  "chennai, tamil nadu": "chennai",
  // ── India – Maharashtra Hill Stations ───────────────────────────────────────
  mahabaleshwar: "mahabaleshwar",
  "mahabaleshwar, india": "mahabaleshwar",
  "mahabaleshwar, maharashtra": "mahabaleshwar",
  matheran: "matheran",
  "matheran, india": "matheran",
  "matheran, maharashtra": "matheran",
};

function resolveCityKey(city?: string | null, destination?: string | null): string | null {
  const searchText = `${city || ''} ${destination || ''}`.toLowerCase().trim();
  if (!searchText) return null;
  const sortedKeys = Object.keys(CITY_KEY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (searchText.includes(key)) return CITY_KEY_MAP[key];
  }
  return null;
}

// Named landmark lookup — checked BEFORE type-based generics.
// Maps famous stop name keywords → Unsplash photo of the actual place.
const NAMED_LANDMARK_IMAGES: Record<string, string> = {
  // ── Chicago ───────────────────────────────────────────────────────────────
  "millennium park":    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop&q=80",
  "cloud gate":         "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop&q=80",
  "the bean":           "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop&q=80",
  // Navy Pier: Ferris wheel + festival lights on Lake Michigan waterfront
  "navy pier":          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&q=80",
  // Willis Tower: iconic black-glass skyscraper dominating Chicago skyline
  "willis tower":       "https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?w=800&h=600&fit=crop&q=80",
  "sears tower":        "https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?w=800&h=600&fit=crop&q=80",
  "chicago riverwalk":  "https://images.unsplash.com/photo-1586380951230-e6703d9f6833?w=800&h=600&fit=crop&q=80",
  "art institute of chicago": "https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=800&h=600&fit=crop&q=80",
  // Field Museum: grand neoclassical natural history museum
  "field museum":       "https://images.unsplash.com/photo-1544979590-37e9b47eb705?w=800&h=600&fit=crop&q=80",
  // Chicago Children's Museum: colorful interactive play space at Navy Pier
  "chicago children's museum": "https://images.unsplash.com/photo-1576765607924-3f7b8410a787?w=800&h=600&fit=crop&q=80",
  "children's museum":  "https://images.unsplash.com/photo-1576765607924-3f7b8410a787?w=800&h=600&fit=crop&q=80",
  // Shedd Aquarium: famous freshwater and marine aquarium on Chicago lakefront
  "shedd aquarium":     "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  // Adler Planetarium: lakefront planetarium with star shows
  "adler planetarium":  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  // Lincoln Park Zoo: free city zoo with giraffes, lions, lush greenery
  "lincoln park zoo":   "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "wrigley field":      "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",

  // ── St. Louis ─────────────────────────────────────────────────────────────
  "gateway arch":       "https://images.unsplash.com/photo-1569601943710-19e2b26d1707?w=800&h=600&fit=crop&q=80",
  "gateway arch national park": "https://images.unsplash.com/photo-1569601943710-19e2b26d1707?w=800&h=600&fit=crop&q=80",
  "saint louis science center": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "st. louis science center": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "forest park":        "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=800&h=600&fit=crop&q=80",
  "saint louis art museum": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  // Saint Louis Zoo: use zoo animals image instead of wrong child photo
  "saint louis zoo":    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "anheuser-busch brewery": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "busch stadium":      "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",

  // ── Washington DC ─────────────────────────────────────────────────────────
  "lincoln memorial":   "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=600&fit=crop&q=80",
  "washington monument":"https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&h=600&fit=crop&q=80",
  "national mall":      "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=600&fit=crop&q=80",
  "white house":        "https://images.unsplash.com/photo-1501501754673-a5e47046ebfb?w=800&h=600&fit=crop&q=80",
  "smithsonian":        "https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=800&h=600&fit=crop&q=80",
  "national air and space museum": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "national museum of natural history": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "capitol building":   "https://images.unsplash.com/photo-1558618047-f4e60cef5008?w=800&h=600&fit=crop&q=80",
  "us capitol":         "https://images.unsplash.com/photo-1558618047-f4e60cef5008?w=800&h=600&fit=crop&q=80",
  "jefferson memorial": "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=600&fit=crop&q=80",
  "vietnam veterans memorial": "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&h=600&fit=crop&q=80",

  // ── New York City ─────────────────────────────────────────────────────────
  "statue of liberty":  "https://images.unsplash.com/photo-1503751071777-d2918b21bbd9?w=800&h=600&fit=crop&q=80",
  "central park":       "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
  "times square":       "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  "empire state building": "https://images.unsplash.com/photo-1492360630eed-a75a105b2e94?w=800&h=600&fit=crop&q=80",
  "brooklyn bridge":    "https://images.unsplash.com/photo-1553285254-39e2c575c5f3?w=800&h=600&fit=crop&q=80",
  "one world trade":    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  "high line":          "https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800&h=600&fit=crop&q=80",
  "met museum":         "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  "metropolitan museum":"https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  "rockefeller center": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80",
  "coney island":       "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800&h=600&fit=crop&q=80",

  // ── San Francisco ─────────────────────────────────────────────────────────
  "golden gate bridge": "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&h=600&fit=crop&q=80",
  "alcatraz":           "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop&q=80",
  "fisherman's wharf":  "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  "fishermans wharf":   "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  "lombard street":     "https://images.unsplash.com/photo-1465722136882-0e6d6c5b8cc8?w=800&h=600&fit=crop&q=80",
  "chinatown san francisco": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "cable car":          "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",

  // ── Los Angeles ───────────────────────────────────────────────────────────
  "hollywood sign":     "https://images.unsplash.com/photo-1542889601-399c4f3a8402?w=800&h=600&fit=crop&q=80",
  "griffith observatory": "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&h=600&fit=crop&q=80",
  "santa monica pier":  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "venice beach":       "https://images.unsplash.com/photo-1501701364015-c2de4f4af2cf?w=800&h=600&fit=crop&q=80",
  "getty center":       "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",

  // ── National Parks & Nature ───────────────────────────────────────────────
  "grand canyon":       "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "yellowstone":        "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "old faithful":       "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "yosemite":           "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop&q=80",
  "niagara falls":      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&q=80",
  "mount rushmore":     "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&h=600&fit=crop&q=80",
  "zion national park": "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop&q=80",
  "bryce canyon":       "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "arches national park": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",

  // ── Seattle ───────────────────────────────────────────────────────────────
  "space needle":       "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&h=600&fit=crop&q=80",
  "pike place market":  "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  "pike place":         "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",

  // ── Miami ─────────────────────────────────────────────────────────────────
  "south beach":        "https://images.unsplash.com/photo-1501701364015-c2de4f4af2cf?w=800&h=600&fit=crop&q=80",
  "art deco district":  "https://images.unsplash.com/photo-1501701364015-c2de4f4af2cf?w=800&h=600&fit=crop&q=80",
  "bayside marketplace":"https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  "vizcaya museum":     "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  "coral gables":       "https://images.unsplash.com/photo-1501701364015-c2de4f4af2cf?w=800&h=600&fit=crop&q=80",
  "wynwood walls":      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "everglades":         "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",

  // ── New Orleans ───────────────────────────────────────────────────────────
  "french quarter":     "https://images.unsplash.com/photo-1571241560524-6e69d95c2e28?w=800&h=600&fit=crop&q=80",
  "bourbon street":     "https://images.unsplash.com/photo-1571241560524-6e69d95c2e28?w=800&h=600&fit=crop&q=80",
  "jackson square":     "https://images.unsplash.com/photo-1571241560524-6e69d95c2e28?w=800&h=600&fit=crop&q=80",
  "cafe du monde":      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "st. louis cathedral":"https://images.unsplash.com/photo-1571241560524-6e69d95c2e28?w=800&h=600&fit=crop&q=80",

  // ── Orlando ───────────────────────────────────────────────────────────────
  "walt disney world":  "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "magic kingdom":      "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "epcot":              "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "universal studios":  "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "kennedy space center": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",

  // ── Bangalore, India ──────────────────────────────────────────────────────
  "bangalore palace":       "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&h=600&fit=crop&q=80",
  "cubbon park":            "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "lalbagh botanical garden": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "lalbagh":                "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "bannerghatta biological park": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "bannerghatta":           "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "iskcon temple":          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "malleswaram market":     "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "vidyarthi bhavan":       "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "visvesvaraya":           "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  "vidhana soudha":         "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop&q=80",

  // ── Mysore, India ─────────────────────────────────────────────────────────
  "mysore palace":          "https://images.unsplash.com/photo-1616426062647-25e9f12c74c2?w=800&h=600&fit=crop&q=80",
  "mysuru palace":          "https://images.unsplash.com/photo-1616426062647-25e9f12c74c2?w=800&h=600&fit=crop&q=80",
  "chamundi hill":          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "brindavan gardens":      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "mysuru zoo":             "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "mysore zoo":             "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "devaraja market":        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",

  // ── Ooty, Tamil Nadu, India ────────────────────────────────────────────────
  "nilgiri mountain railway": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
  "thread garden":          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "ooty botanical gardens": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "ooty lake":              "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "doddabetta peak":        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "doddabetta":             "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "tea museum":             "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
  "pykara falls":           "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  "pykara":                 "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  "ketti valley viewpoint": "https://images.unsplash.com/photo-1449038221263-3ffde35ee0ed?w=800&h=600&fit=crop&q=80",
  "ketti valley":           "https://images.unsplash.com/photo-1449038221263-3ffde35ee0ed?w=800&h=600&fit=crop&q=80",
  "emerald lake":           "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "avalanche lake":         "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "ooty market":            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "st. stephen's church":   "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
  "st stephen's church":    "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
  "stephen's church":       "https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
  "rose garden":            "https://images.unsplash.com/photo-1561181286-d3f8d8f79494?w=800&h=600&fit=crop&q=80",

  // ── International ─────────────────────────────────────────────────────────
  "eiffel tower":       "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&h=600&fit=crop&q=80",
  "louvre":             "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=600&fit=crop&q=80",
  "big ben":            "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  "tower bridge":       "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  "buckingham palace":  "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  "colosseum":          "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  "trevi fountain":     "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  "taj mahal":          "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "great wall":         "https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=800&h=600&fit=crop&q=80",
  "great wall of china":"https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=800&h=600&fit=crop&q=80",
  "sydney opera house": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
  "sydney harbour bridge": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop&q=80",
  "sagrada familia":    "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80",
  "acropolis":          "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  "machu picchu":       "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&h=600&fit=crop&q=80",
  "christ the redeemer":"https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  "sugarloaf mountain": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80",
  "senso-ji":           "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop&q=80",
  "asakusa":            "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop&q=80",
  "mount fuji":         "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop&q=80",
  "shibuya crossing":   "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80",
  "pyramids of giza":   "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  "great pyramid":      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  "sphinx":             "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=600&fit=crop&q=80",
  "burj khalifa":       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "table mountain":     "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80",
  "petra":              "https://images.unsplash.com/photo-1582714894793-e2aba1b27cb8?w=800&h=600&fit=crop&q=80",
  "angkor wat":         "https://images.unsplash.com/photo-1543490736-e6e8b9cde26c?w=800&h=600&fit=crop&q=80",

  // ── Mahabaleshwar, Maharashtra, India ─────────────────────────────────────
  "arthur's seat":      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "arthurs seat":       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "elephant's head point": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "elephants head point":  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "wilson point":       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "mapro garden":       "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "venna lake":         "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "lingmala waterfall": "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  "bhilar waterfall":   "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  "panchgani table land": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "strawberry farm":    "https://images.unsplash.com/photo-1444210971048-6130cf0c46cf?w=800&h=600&fit=crop&q=80",

  // ── Manali, Himachal Pradesh, India ───────────────────────────────────────
  "hadimba temple":     "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  "hadimba devi temple":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  "manu temple":        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "old manali":         "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  "solang valley":      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80",
  "rohtang pass":       "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80",
  "rohtang":            "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80",
  "vashisht hot springs":"https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&h=600&fit=crop&q=80",
  "vashisht":           "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&h=600&fit=crop&q=80",
  "naggar castle":      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",

  // ── Shimla, Himachal Pradesh, India ───────────────────────────────────────
  "mall road shimla":   "https://images.unsplash.com/photo-1597975820995-f2810af07958?w=800&h=600&fit=crop&q=80",
  "scandal point":      "https://images.unsplash.com/photo-1597975820995-f2810af07958?w=800&h=600&fit=crop&q=80",
  "ridge shimla":       "https://images.unsplash.com/photo-1597975820995-f2810af07958?w=800&h=600&fit=crop&q=80",
  "christ church shimla":"https://images.unsplash.com/photo-1557320539-9958ec9b9e8e?w=800&h=600&fit=crop&q=80",
  "jakhu temple":       "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "jakhu":              "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "kufri":              "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80",
  "himalayan nature park": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "viceregal lodge":    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "chadwick falls":     "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",

  // ── Darjeeling, West Bengal, India ────────────────────────────────────────
  "tiger hill":         "https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&h=600&fit=crop&q=80",
  "tiger hill sunrise": "https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&h=600&fit=crop&q=80",
  "batasia loop":       "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
  "ghum monastery":     "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "darjeeling zoo":     "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "himalayan mountaineering institute": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&q=80",
  "chowrasta":          "https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&h=600&fit=crop&q=80",
  "darjeeling himalayan railway": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&q=80",
  "happy valley tea estate": "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
  "happy valley":       "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",

  // ── Varanasi, Uttar Pradesh, India ────────────────────────────────────────
  "assi ghat":          "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",
  "dashashwamedh ghat": "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",
  "ganga aarti":        "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",
  "kashi vishwanath":   "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "sarnath":            "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "ganges boat":        "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",
  "varanasi ghats":     "https://images.unsplash.com/photo-1561036770-2e01f5f0e41b?w=800&h=600&fit=crop&q=80",

  // ── Amritsar, Punjab, India ───────────────────────────────────────────────
  "golden temple":      "https://images.unsplash.com/photo-1607427293702-036707ce1e19?w=800&h=600&fit=crop&q=80",
  "harmandir sahib":    "https://images.unsplash.com/photo-1607427293702-036707ce1e19?w=800&h=600&fit=crop&q=80",
  "jallianwala bagh":   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "langar":             "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "wagah border":       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "wagah":              "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "gobindgarh fort":    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "amritsar bazaar":    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",

  // ── Coorg (Kodagu), Karnataka, India ──────────────────────────────────────
  "abbey falls":        "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  "raja's seat":        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "rajas seat":         "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "madikeri fort":      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "dubare elephant camp": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "dubare":             "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "namdroling monastery": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "namdroling":         "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "coffee estate":      "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
  "iruppu falls":       "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",

  // ── Hyderabad, Telangana, India ───────────────────────────────────────────
  "charminar":          "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "laad bazaar":        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "golconda fort":      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "hussain sagar":      "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "hussain sagar lake": "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "ramoji film city":   "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "ramoji":             "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "nehru zoological park": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "qutb shahi":         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "birla mandir":       "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",

  // ── Kolkata, West Bengal, India ───────────────────────────────────────────
  "victoria memorial":  "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  "howrah bridge":      "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  "prinsep ghat":       "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=600&fit=crop&q=80",
  "science city kolkata": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "nicco park":         "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  "dakshineswar temple":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "dakshineswar":       "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "birla planetarium":  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  "kalighat temple":    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "kalighat":           "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "indian museum":      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",

  // ── Alleppey (Alappuzha), Kerala, India ───────────────────────────────────
  "kerala backwaters":  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "houseboat cruise":   "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "backwaters houseboat": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "vembanad lake":      "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "kuttanad":           "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "alappuzha beach":    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "alleppey lighthouse":"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "krishnapuram palace":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",

  // ── Pondicherry (Puducherry), India ───────────────────────────────────────
  "french quarter":     "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "white town":         "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "promenade beach":    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "auroville":          "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "matrimandir":        "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "sri aurobindo ashram": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "botanical garden pondicherry": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "chunnambar boat house": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "chunnambar":         "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",

  // ── Rishikesh, Uttarakhand, India ─────────────────────────────────────────
  "laxman jhula":       "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&h=600&fit=crop&q=80",
  "ram jhula":          "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&h=600&fit=crop&q=80",
  "triveni ghat":       "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "triveni ghat ganga aarti": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "ganga aarti rishikesh": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "family river rafting rishikesh": "https://images.unsplash.com/photo-1536066316226-3c2e7fe9b4eb?w=800&h=600&fit=crop&q=80",
  "river rafting rishikesh": "https://images.unsplash.com/photo-1536066316226-3c2e7fe9b4eb?w=800&h=600&fit=crop&q=80",
  "beatles ashram":     "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop&q=80",
  "parmarth niketan":   "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&h=600&fit=crop&q=80",

  // ── Hampi, Karnataka, India ───────────────────────────────────────────────
  "virupaksha temple":  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "hampi bazaar":       "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "vittala temple":     "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "vittala temple and stone chariot": "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "stone chariot hampi":"https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "hemakuta hill":      "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "hemakuta hill sunrise": "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "elephant stables":   "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "lotus mahal":        "https://images.unsplash.com/photo-1565791380713-1756b9a05343?w=800&h=600&fit=crop&q=80",
  "tungabhadra river coracle ride": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",
  "coracle ride hampi": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=600&fit=crop&q=80",

  // ── Mumbai / South Mumbai, Maharashtra, India ─────────────────────────────
  "gateway of india":   "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "gateway india":      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "elephanta caves":    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "elephanta island":   "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "malabar hill":       "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  "malabar hills":      "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  "hanging gardens":    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "colaba causeway":    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "chhatrapati shivaji maharaj vastu sangrahalaya": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "csmvs":              "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "chowpatty beach":    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "chowpatty":          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "marine drive":       "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  "queen's necklace":   "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  "knesset eliyahoo":   "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  "dharavi":            "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "bandra worli sea link": "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&h=600&fit=crop&q=80",
  "haji ali dargah":    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "haji ali":           "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "siddhivinayak":      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "juhu beach":         "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "crawford market":    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "cst mumbai":         "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "chhatrapati shivaji terminus": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&h=600&fit=crop&q=80",
  "byculla zoo":        "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",

  // ── Jaisalmer, Rajasthan, India ───────────────────────────────────────────
  "jaisalmer fort":     "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "sonar qila":         "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "patwon ki haveli":   "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "gadisar lake":       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "sam sand dunes":     "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "sam sand dunes desert safari": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "desert safari jaisalmer": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "desert camp dinner and stargazing": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "desert camp jaisalmer": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",

  // ── Leh Ladakh, Jammu & Kashmir, India ───────────────────────────────────
  "leh palace":         "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "shanti stupa leh":   "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "shanti stupa":       "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "thiksey monastery":  "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "hemis monastery":    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "khardung la":        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "khardung la pass":   "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "nubra valley":       "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "diskit monastery nubra": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop&q=80",
  "hunder sand dunes":  "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "hunder sand dunes and bactrian camels": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop&q=80",
  "pangong lake":       "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  "pangong tso":        "https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800&h=600&fit=crop&q=80",
  "magnetic hill leh":  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "gurudwara pathar sahib": "https://images.unsplash.com/photo-1607427293702-036707ce1e19?w=800&h=600&fit=crop&q=80",

  // ── Lonavala, Maharashtra, India ──────────────────────────────────────────
  "bhushi dam":         "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "tiger's leap":       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "tiger's leap viewpoint": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "lonavala lake":      "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "karla caves":        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "lion's point":       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "lonavala chikki market": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "bhaja caves":        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",

  // ── Madurai, Tamil Nadu, India ────────────────────────────────────────────
  "meenakshi temple":   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "meenakshi amman temple": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "thirumalai nayakkar palace": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "thirumalai palace":  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "gandhi museum madurai": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "vandiyur mariamman teppakulam": "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "teppakulam tank":    "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "madurai flower market": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",

  // ── Mahabalipuram, Tamil Nadu, India ─────────────────────────────────────
  "shore temple":       "https://images.unsplash.com/photo-1594760467013-64ac2b922aee?w=800&h=600&fit=crop&q=80",
  "shore temple mahabalipuram": "https://images.unsplash.com/photo-1594760467013-64ac2b922aee?w=800&h=600&fit=crop&q=80",
  "five rathas":        "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "pancha rathas":      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "arjuna's penance":   "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "mahabalipuram beach":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "tiger cave rock cut shrine": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "crocodile bank":     "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "krishna's butter ball": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",

  // ── Ranthambore, Rajasthan, India ─────────────────────────────────────────
  "ranthambore tiger safari zone 1-5": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "ranthambore tiger safari zone 6-10": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "ranthambore safari": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "ranthambore fort":   "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "padam talao lake":   "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "padam talao":        "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",

  // ── Varkala, Kerala, India ────────────────────────────────────────────────
  "varkala cliff":      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "varkala cliff walk": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "north cliff beach varkala": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "janardana swami temple": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "janardana swami":    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  "papanasam beach":    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "odayam beach":       "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "odayam beach walk":  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "kappil lake":        "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",

  // ── Ahmedabad, Gujarat, India ─────────────────────────────────────────────
  "sabarmati ashram":   "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "gandhi ashram":      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "adalaj stepwell":    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "adalaj":             "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "sabarmati riverfront": "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "kankaria lake":      "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "science city ahmedabad": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",
  "akshardham gandhinagar": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",

  // ── Chennai (Madras), Tamil Nadu, India ───────────────────────────────────
  "marina beach":       "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "kapaleeshwarar temple": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  "santhome cathedral": "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "santhome church":    "https://images.unsplash.com/photo-1583592643761-08c08484ed89?w=800&h=600&fit=crop&q=80",
  "arignar anna zoological park": "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "vandalur zoo":       "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  "dakshinachitra":     "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "dakshinachitra heritage museum": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=600&fit=crop&q=80",
  "fort st george":     "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&h=600&fit=crop&q=80",
  "elliot's beach":     "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "besant nagar beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  "government museum chennai": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop&q=80",

  // ── Mahabaleshwar, Maharashtra, India ─────────────────────────────────────
  "venna lake":         "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "mapro garden":       "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "arthur's seat":      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "arthur's seat viewpoint": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "lingmala waterfall": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "wilson's point":     "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "elephant's head point": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "panchgani":          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "table land panchgani": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",

  // ── Matheran, Maharashtra, India ──────────────────────────────────────────
  "matheran toy train": "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&h=600&fit=crop&q=80",
  "neral matheran toy train": "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&h=600&fit=crop&q=80",
  "echo point":         "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "echo point matheran":"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "one tree hill":      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "panorama point":     "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "louisa point":       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "charlotte lake":     "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "charlotte lake matheran": "https://images.unsplash.com/photo-1558981852-426c373d4324?w=800&h=600&fit=crop&q=80",
  "mg road market walk":"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "mg road matheran":   "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
};

const STOP_TYPE_IMAGES: Record<string, string> = {
  viewpoint: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  lookout: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  overlook: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "scenic point": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  temple: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  shrine: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  mosque: "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  pagoda: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  market: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  bazaar: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  souk: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  shop: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  park: "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
  garden: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  botanical: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  coast: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  shore: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  surfing: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  museum: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  gallery: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  exhibit: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=600&fit=crop&q=80",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  peak: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  summit: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  hill: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  hiking: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  trail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  waterfall: "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  falls: "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  cascade: "https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&h=600&fit=crop&q=80",
  castle: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  palace: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  fortress: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  fort: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  food: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  restaurant: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  cafe: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  bakery: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  cuisine: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "street food": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  pier: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  harbor: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  harbour: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  port: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  dock: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  marina: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  wharf: "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800&h=600&fit=crop&q=80",
  jungle: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
  rainforest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&q=80",
  safari: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  wildlife: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  zoo: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  animal: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&q=80",
  bridge: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&h=600&fit=crop&q=80",
  volcano: "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  crater: "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  lava: "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  geyser: "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&h=600&fit=crop&q=80",
  square: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  plaza: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  piazza: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  ruins: "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  ancient: "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  archaeological: "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&h=600&fit=crop&q=80",
  reef: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  coral: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  snorkel: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  diving: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  underwater: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  lighthouse: "https://images.unsplash.com/photo-1559763141-39b4e6f7b1a4?w=800&h=600&fit=crop&q=80",
  zen: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  meditation: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  cathedral: "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  church: "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  basilica: "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  chapel: "https://images.unsplash.com/photo-1548625361-58a9d86b0b4e?w=800&h=600&fit=crop&q=80",
  village: "https://images.unsplash.com/photo-1444210971048-6130cf0c46cf?w=800&h=600&fit=crop&q=80",
  countryside: "https://images.unsplash.com/photo-1444210971048-6130cf0c46cf?w=800&h=600&fit=crop&q=80",
  farm: "https://images.unsplash.com/photo-1444210971048-6130cf0c46cf?w=800&h=600&fit=crop&q=80",
  observatory: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  planetarium: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  astronomy: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  stargazing: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&q=80",
  river: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  canal: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  creek: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  aquarium: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  oceanarium: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&h=600&fit=crop&q=80",
  "street art": "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=800&h=600&fit=crop&q=80",
  mural: "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=800&h=600&fit=crop&q=80",
  graffiti: "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=800&h=600&fit=crop&q=80",
  desert: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&h=600&fit=crop&q=80",
  dune: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&h=600&fit=crop&q=80",
  oasis: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&h=600&fit=crop&q=80",
  "tea house": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  teahouse: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  ceremony: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop&q=80",
  festival: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
  carnival: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
  celebration: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
  parade: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
  lake: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  pond: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  lagoon: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  reservoir: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
};

const STOP_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1444210971048-6130cf0c46cf?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&h=600&fit=crop&q=80",
];

export function getAdventureCityImage(city?: string | null, destination?: string | null, variant: 0 | 1 | 2 = 0): string | null {
  const searchText = `${city || ''} ${destination || ''}`.toLowerCase().trim();
  if (!searchText) return null;

  // Pick the right lookup table for this card slot
  const table = variant === 1 ? ADVENTURE_CITY_IMAGES_V2 : variant === 2 ? ADVENTURE_CITY_IMAGES_V3 : ADVENTURE_CITY_IMAGES;

  // Try the variant table first
  const variantSorted = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const key of variantSorted) {
    if (searchText.includes(key)) return table[key];
  }

  // Fallback to primary table if the variant has no entry for this city
  if (variant !== 0) {
    const primarySorted = Object.keys(ADVENTURE_CITY_IMAGES).sort((a, b) => b.length - a.length);
    for (const key of primarySorted) {
      if (searchText.includes(key)) return ADVENTURE_CITY_IMAGES[key];
    }
  }
  return null;
}

export function getAdventureStopImage(
  stopName: string,
  stopType?: string | null,
  city?: string | null,
  destination?: string | null
): string {
  const stopLower = stopName.toLowerCase();

  // 1. Named landmark lookup — checked FIRST so famous places get accurate images
  const landmarkKeys = Object.keys(NAMED_LANDMARK_IMAGES).sort((a, b) => b.length - a.length);
  for (const key of landmarkKeys) {
    if (stopLower.includes(key)) return NAMED_LANDMARK_IMAGES[key];
  }

  // 2. City-specific pre-built illustrated image
  const cityKey = resolveCityKey(city, destination);
  if (cityKey && CITY_STOP_IMAGES[cityKey]) {
    const cityStops = CITY_STOP_IMAGES[cityKey];
    const sortedStopKeys = Object.keys(cityStops).sort((a, b) => b.length - a.length);
    for (const key of sortedStopKeys) {
      if (stopLower.includes(key)) return cityStops[key];
    }
  }

  // 3. City-level image — at least contextually correct for the destination
  const cityImg = getAdventureCityImage(city, destination);
  if (cityImg) return cityImg;

  // 4. Type-based generic fallback
  const searchText = `${stopName} ${stopType || ''}`.toLowerCase();
  const sortedKeys = Object.keys(STOP_TYPE_IMAGES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (searchText.includes(key)) return STOP_TYPE_IMAGES[key];
  }

  let hash = 0;
  for (let i = 0; i < stopName.length; i++) {
    hash = ((hash << 5) - hash) + stopName.charCodeAt(i);
    hash |= 0;
  }
  return STOP_FALLBACK_IMAGES[Math.abs(hash) % STOP_FALLBACK_IMAGES.length];
}

export const PILOT_CITIES = [
  "paris", "tokyo", "honolulu", "cairo", "rio de janeiro",
  "sydney", "london", "delhi", "cape town", "new york",
  "bangalore", "bengaluru", "mysore", "mysuru", "ooty",
];

export function isPilotCity(city?: string | null): boolean {
  if (!city) return false;
  const lower = city.toLowerCase();
  return PILOT_CITIES.some(p => lower.includes(p) || p.includes(lower));
}

const onDemandCache: Record<string, string | null> = {};
const pendingRequests: Record<string, boolean> = {};

function cacheKey(type: string, city: string, stop?: string): string {
  return `${type}:${city.toLowerCase()}${stop ? `:${stop.toLowerCase()}` : ""}`;
}

export async function requestCityImage(
  cityName: string,
  country?: string
): Promise<{ imagePath: string | null; status: "ready" | "generating" | "failed" }> {
  const staticImage = getAdventureCityImage(cityName);
  if (staticImage) return { imagePath: staticImage, status: "ready" };

  const key = cacheKey("city", cityName);
  if (onDemandCache[key] !== undefined) return { imagePath: onDemandCache[key], status: "ready" };
  if (pendingRequests[key]) return { imagePath: null, status: "generating" };

  pendingRequests[key] = true;
  try {
    const res = await fetch("/api/adventure/generate-city-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ cityName, country }),
    });
    if (!res.ok) return { imagePath: null, status: "failed" };
    const data = await res.json();
    if (data.status === "ready" && data.imagePath) {
      onDemandCache[key] = data.imagePath;
      return { imagePath: data.imagePath, status: "ready" };
    }
    return { imagePath: null, status: data.status === "failed" ? "failed" : "generating" };
  } catch {
    return { imagePath: null, status: "failed" };
  } finally {
    pendingRequests[key] = false;
  }
}

export async function requestStopImage(
  stopName: string,
  cityName: string,
  stopType?: string,
  country?: string
): Promise<{ imagePath: string | null; status: "ready" | "generating" | "failed" }> {
  const key = cacheKey("stop", cityName, stopName);
  if (onDemandCache[key] !== undefined) return { imagePath: onDemandCache[key], status: "ready" };
  if (pendingRequests[key]) return { imagePath: null, status: "generating" };

  pendingRequests[key] = true;
  try {
    const res = await fetch("/api/adventure/generate-stop-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stopName, cityName, stopType, country }),
    });
    if (!res.ok) return { imagePath: null, status: "failed" };
    const data = await res.json();
    if (data.status === "ready" && data.imagePath) {
      onDemandCache[key] = data.imagePath;
      return { imagePath: data.imagePath, status: "ready" };
    }
    return { imagePath: null, status: data.status === "failed" ? "failed" : "generating" };
  } catch {
    return { imagePath: null, status: "failed" };
  } finally {
    pendingRequests[key] = false;
  }
}

export function useAdventureCityImage(
  cityName?: string | null,
  country?: string
): { image: string | null; loading: boolean } {
  const staticImage = getAdventureCityImage(cityName);
  if (staticImage || !cityName) {
    return { image: staticImage, loading: false };
  }

  const key = cacheKey("city", cityName);
  if (onDemandCache[key] !== undefined) {
    return { image: onDemandCache[key], loading: false };
  }

  if (!pendingRequests[key]) {
    requestCityImage(cityName, country);
  }

  return { image: null, loading: true };
}

export function clearOnDemandCache() {
  Object.keys(onDemandCache).forEach((k) => delete onDemandCache[k]);
}
