export const PLANETS = [
  {
    name: "Mercury",
    radius: 0.4,
    distance: 8,
    color: 0x8c7e6d,
    orbitalSpeed: 4.15,
    rotationSpeed: 0.003,
    tilt: 0.034,
    moons: 0,
    diameter: "4,879 km",
    distanceFromSun: "57,900,000 km",
    temperature: "167°C (day) / -180°C (night)",
    orbitalPeriod: "88 days",
    rotationPeriod: "58.6 days",
    funFact: "Mercury has no atmosphere and is the smallest planet in our solar system.",
    educational: {
      overview: "Mercury is the smallest and closest planet to the Sun. It has no atmosphere, leading to extreme temperature variations between day and night.",
      composition: "Iron core (about 85% of radius), silicate mantle, thin crust",
      atmosphere: "Virtually none — thin exosphere with traces of oxygen, sodium, hydrogen",
      surface: "Heavily cratered, similar to Earth's Moon, with vast smooth plains",
      exploration: "Visited by Mariner 10 (1974–1975) and MESSENGER (2011–2015). BepiColombo en route (arrival ~2025)",
      discovery: "Known since ancient times — earliest recorded observations date to around 1400 BCE",
      dayLength: "One solar day on Mercury lasts 176 Earth days",
      gravity: "3.7 m/s² (38% of Earth's gravity)"
    }
  },
  {
    name: "Venus",
    radius: 0.9,
    distance: 11,
    color: 0xe8cda0,
    orbitalSpeed: 1.62,
    rotationSpeed: 0.002,
    tilt: 2.64,
    moons: 0,
    diameter: "12,104 km",
    distanceFromSun: "108,200,000 km",
    temperature: "465°C (average)",
    orbitalPeriod: "225 days",
    rotationPeriod: "243 days (retrograde)",
    funFact: "Venus rotates backwards compared to most planets and is the hottest planet in our solar system.",
    educational: {
      overview: "Venus is often called Earth's twin due to similar size, but its thick atmosphere makes it the hottest planet with an extreme greenhouse effect.",
      composition: "Iron core, rocky mantle, thick basaltic crust",
      atmosphere: "96.5% carbon dioxide, 3.5% nitrogen — creates a runaway greenhouse effect with surface pressure 92× Earth's",
      surface: "Volcanic plains, highland regions (Ishtar Terra, Aphrodite Terra), large shield volcanoes",
      exploration: "Visited by Venera landers (1970s–1980s), Magellan orbiter (1990–1994). VERITAS and DAVINCI+ missions planned",
      discovery: "Known since ancient times — called 'Morning Star' or 'Evening Star'",
      dayLength: "One solar day on Venus lasts 117 Earth days. It rotates slower than it orbits",
      gravity: "8.87 m/s² (91% of Earth's gravity)"
    }
  },
  {
    name: "Earth",
    radius: 1.0,
    distance: 15,
    color: 0x4a90d9,
    orbitalSpeed: 1.0,
    rotationSpeed: 0.01,
    tilt: 0.41,
    moons: 1,
    diameter: "12,742 km",
    distanceFromSun: "149,600,000 km",
    temperature: "15°C (average)",
    orbitalPeriod: "365.25 days",
    rotationPeriod: "23 hours 56 minutes",
    funFact: "Earth is the only known planet to support life and has liquid water on its surface.",
    educational: {
      overview: "Earth is the third planet from the Sun and the only known world to harbor life. Its surface is 71% water, giving it the nickname 'Blue Marble'.",
      composition: "Iron-nickel core, silicate mantle, thin crust with tectonic plates",
      atmosphere: "78% nitrogen, 21% oxygen, 1% other gases — protects from solar radiation",
      surface: "Oceans, continents, mountains, valleys, polar ice caps",
      exploration: "Extensively studied — thousands of satellites, ISS, Moon landings",
      discovery: "Humanity's home planet — understood as spherical since ancient Greeks",
      dayLength: "23 hours 56 minutes (sidereal), 24 hours (solar day)",
      gravity: "9.81 m/s² (standard gravity)"
    }
  },
  {
    name: "Mars",
    radius: 0.6,
    distance: 20,
    color: 0xc1440e,
    orbitalSpeed: 0.53,
    rotationSpeed: 0.009,
    tilt: 0.44,
    moons: 2,
    diameter: "6,779 km",
    distanceFromSun: "227,900,000 km",
    temperature: "-65°C (average)",
    orbitalPeriod: "687 days",
    rotationPeriod: "24.6 hours",
    funFact: "Mars has the tallest volcano in the solar system, Olympus Mons, at 21.9 km high.",
    educational: {
      overview: "Mars is the Red Planet, named after the Roman god of war. It has the largest volcano and deepest canyon in the solar system.",
      composition: "Iron sulfide core, silicate mantle, basaltic crust rich in iron oxide",
      atmosphere: "95% carbon dioxide, thin (about 1% of Earth's pressure) — too thin for stable liquid water",
      surface: "Valles Marineris canyon system, Olympus Mons volcano, polar ice caps, ancient riverbeds",
      exploration: "Multiple rovers (Curiosity, Perseverance), orbiters, and landers. Ingenuity helicopter flew on Mars",
      discovery: "Known since ancient times — named by ancient Babylonians around 2000 BCE",
      dayLength: "24 hours 37 minutes (very similar to Earth)",
      gravity: "3.72 m/s² (38% of Earth's gravity)"
    }
  },
  {
    name: "Jupiter",
    radius: 3.5,
    distance: 30,
    color: 0xc88b3a,
    orbitalSpeed: 0.084,
    rotationSpeed: 0.025,
    tilt: 0.05,
    moons: 95,
    diameter: "139,820 km",
    distanceFromSun: "778,500,000 km",
    temperature: "-110°C (cloud tops)",
    orbitalPeriod: "11.86 years",
    rotationPeriod: "9.93 hours",
    funFact: "Jupiter's Great Red Spot is a storm that has been raging for at least 350 years.",
    educational: {
      overview: "Jupiter is the largest planet in our solar system — more than twice as massive as all other planets combined. It's a gas giant with no solid surface.",
      composition: "Hydrogen (about 90%) and helium (about 10%) — likely has a rocky/metallic core",
      atmosphere: "Hydrogen and helium with traces of methane, ammonia, water vapor — Great Red Spot is a persistent anticyclonic storm",
      surface: "No solid surface — cloud tops at various pressure levels with colorful bands and zones",
      exploration: "Visited by Pioneer 10/11, Voyager 1/2, Galileo orbiter (1995–2003), Juno (2016–present)",
      discovery: "Known since ancient times — Galileo discovered its four largest moons in 1610",
      gravity: "24.79 m/s² (2.5× Earth's gravity)"
    },
    majorMoons: [
      { name: "Io", radius: 0.2, distance: 6, color: 0xe8d040, speed: 0.8, funFact: "Io is the most volcanically active body in the solar system.", diameter: "3,643 km", distanceFromParent: "421,700 km from Jupiter", orbitalPeriod: "1.77 days", temperature: "-143°C (surface avg), up to 1,700°C at volcanoes", educational: { overview: "Io is Jupiter's innermost Galilean moon and the most volcanically active body in the solar system, driven by tidal heating from Jupiter's gravity.", composition: "Silicate rock with iron/iron sulfide core", atmosphere: "Thin sulfur dioxide atmosphere, replenished by volcanic activity", surface: "Over 400 active volcanoes, sulfur and sulfur dioxide deposits, lava flows", exploration: "Discovered by Galileo in 1610. Visited by Voyager 1/2 and Galileo orbiter", discovery: "Discovered by Galileo Galilei on January 7, 1610", gravity: "1.796 m/s²" } },
      { name: "Europa", radius: 0.18, distance: 7.5, color: 0xc8b898, speed: 0.6, funFact: "Europa has a subsurface ocean that may contain more water than all of Earth's oceans.", diameter: "3,122 km", distanceFromParent: "671,100 km from Jupiter", orbitalPeriod: "3.55 days", temperature: "-160°C (surface avg)", educational: { overview: "Europa is a smooth, ice-covered moon with a subsurface ocean that may contain more water than all of Earth's oceans combined — a prime target for finding extraterrestrial life.", composition: "Silicate rock core with water-ice crust over liquid water ocean", atmosphere: "Very thin oxygen exosphere", surface: "Smooth ice crust with linear cracks (lineae) and chaotic terrain", exploration: "Discovered by Galileo in 1610. Europa Clipper mission launched 2024", discovery: "Discovered by Galileo Galilei on January 7, 1610", gravity: "1.314 m/s²" } },
      { name: "Ganymede", radius: 0.28, distance: 9.5, color: 0x8c7e6d, speed: 0.4, funFact: "Ganymede is the largest moon in the solar system — even larger than Mercury.", diameter: "5,268 km", distanceFromParent: "1,070,400 km from Jupiter", orbitalPeriod: "7.15 days", temperature: "-163°C (surface avg)", educational: { overview: "Ganymede is the largest moon in the solar system, bigger than Mercury. It's the only moon known to generate its own magnetic field.", composition: "Silicate rock and water ice in roughly equal parts, iron core", atmosphere: "Very thin oxygen exosphere", surface: "Mix of dark, heavily cratered regions and lighter grooved terrain", exploration: "Discovered by Galileo in 1610. Studied by Voyager 1/2 and Galileo. ESA JUICE mission en route", discovery: "Discovered by Galileo Galilei on January 7, 1610", gravity: "1.428 m/s²" } },
      { name: "Callisto", radius: 0.25, distance: 12, color: 0x5a5a5a, speed: 0.3, funFact: "Callisto has the oldest, most heavily cratered surface in the solar system.", diameter: "4,821 km", distanceFromParent: "1,882,700 km from Jupiter", orbitalPeriod: "16.69 days", temperature: "-139°C (surface avg)", educational: { overview: "Callisto is Jupiter's outermost Galilean moon with the oldest and most heavily cratered surface of any body in the solar system. It may have a subsurface ocean.", composition: "Roughly equal mix of ice and rock, possible subsurface ocean", atmosphere: "Very thin carbon dioxide and oxygen exosphere", surface: "Heavily cratered, ancient surface with multi-ring impact basins (Valhalla)", exploration: "Discovered by Galileo in 1610. Visited by Voyager 1/2 and Galileo", discovery: "Discovered by Galileo Galilei on January 7, 1610", gravity: "1.235 m/s²" } }
    ]
  },
  {
    name: "Saturn",
    radius: 3.0,
    distance: 42,
    color: 0xf5deb3,
    orbitalSpeed: 0.034,
    rotationSpeed: 0.022,
    tilt: 0.47,
    moons: 146,
    diameter: "116,460 km",
    distanceFromSun: "1,432,000,000 km",
    temperature: "-140°C (cloud tops)",
    orbitalPeriod: "29.46 years",
    rotationPeriod: "10.7 hours",
    funFact: "Saturn's density is so low it could float in water if there were a bathtub big enough.",
    educational: {
      overview: "Saturn is famous for its stunning ring system made of ice and rock particles. It's the second-largest planet and least dense — it could float on water!",
      composition: "Hydrogen (about 96%) and helium (about 3%) — likely rocky/metallic core",
      atmosphere: "Hydrogen and helium with ammonia crystals in upper atmosphere, powerful wind bands",
      surface: "No solid surface — gas giant with rings spanning about 282,000 km in diameter",
      exploration: "Visited by Pioneer 11, Voyager 1/2, Cassini-Huygens (2004–2017)",
      discovery: "Known since ancient times — rings first observed by Galileo in 1610, identified by Huygens in 1655",
      gravity: "10.44 m/s² (1.07× Earth's gravity)"
    },
    majorMoons: [
      { name: "Titan", radius: 0.3, distance: 8, color: 0xd4a040, speed: 0.5, funFact: "Titan is the only moon with a thick atmosphere and liquid lakes on its surface.", diameter: "5,150 km", distanceFromParent: "1,221,870 km from Saturn", orbitalPeriod: "15.95 days", temperature: "-179°C", educational: { overview: "Titan is Saturn's largest moon, the second-largest moon in the solar system, and the only moon with a dense atmosphere. It has lakes of liquid methane and ethane.", composition: "Water ice shell over liquid water ocean over silicate rock core", atmosphere: "Thick nitrogen atmosphere (1.5× Earth's surface pressure) with methane and ethane", surface: "Dunes, lakes, rivers, and seas of liquid methane/ethane — rain cycle similar to Earth", exploration: "Studied by Cassini orbiter, Huygens lander (landed January 14, 2005). Dragonfly mission planned for 2030s", discovery: "Discovered by Christiaan Huygens on March 25, 1655", gravity: "1.352 m/s²" } },
      { name: "Enceladus", radius: 0.12, distance: 5, color: 0xf0f0f0, speed: 0.9, funFact: "Enceladus shoots geysers of water ice from fractures at its south pole.", diameter: "504 km", distanceFromParent: "237,948 km from Saturn", orbitalPeriod: "1.37 days", temperature: "-201°C", educational: { overview: "Enceladus is a small, icy moon that ejects plumes of water ice and organic molecules from its south pole, confirming a global subsurface ocean — a prime target for astrobiology.", composition: "Water ice surface over global liquid water ocean over silicate core", atmosphere: "Plume-generated water vapor atmosphere near south pole", surface: "Young, smooth ice with 'tiger stripe' fractures at south pole that emit geysers", exploration: "Studied extensively by Cassini (2005–2017). Plumes first discovered in 2005", discovery: "Discovered by William Herschel on August 28, 1789", gravity: "0.113 m/s²" } },
      { name: "Mimas", radius: 0.1, distance: 4, color: 0xb0b0b0, speed: 1.0, funFact: "Mimas has a giant crater that makes it look like the Death Star from Star Wars.", diameter: "396 km", distanceFromParent: "185,539 km from Saturn", orbitalPeriod: "0.94 days", temperature: "-209°C", educational: { overview: "Mimas is a small, heavily cratered moon with the giant Herschel impact crater (130 km across) that gives it a Death Star appearance. Recent data suggests it may have a subsurface ocean.", composition: "Mostly water ice with small rocky core", atmosphere: "None", surface: "Heavily cratered, dominated by the 130 km Herschel crater", exploration: "Visited by Voyager 1 (1980), studied by Cassini (2004–2017)", discovery: "Discovered by William Herschel on September 17, 1789", gravity: "0.064 m/s²" } },
      { name: "Rhea", radius: 0.18, distance: 6.5, color: 0xc8c8c8, speed: 0.65, funFact: "Rhea is Saturn's second-largest moon and is composed almost entirely of water ice.", diameter: "1,528 km", distanceFromParent: "527,108 km from Saturn", orbitalPeriod: "4.52 days", temperature: "-174°C (sunlit side) / -220°C (shaded side)", educational: { overview: "Rhea is Saturn's second-largest moon. It is almost entirely made of water ice and is one of the most heavily cratered bodies in the solar system.", composition: "About 75% water ice, 25% silicate rock", atmosphere: "Very thin oxygen and carbon dioxide exosphere", surface: "Two distinct hemispheres — one heavily cratered, one with bright wispy markings", exploration: "Studied by Voyager 1/2 and Cassini", discovery: "Discovered by Giovanni Domenico Cassini on December 23, 1672", gravity: "0.264 m/s²" } }
    ]
  },
  {
    name: "Uranus",
    radius: 1.8,
    distance: 55,
    color: 0x73c2d0,
    orbitalSpeed: 0.012,
    rotationSpeed: 0.015,
    tilt: 1.71,
    moons: 28,
    diameter: "50,724 km",
    distanceFromSun: "2,867,000,000 km",
    temperature: "-224°C (minimum cloud top)",
    orbitalPeriod: "84.01 years",
    rotationPeriod: "17.24 hours (retrograde)",
    funFact: "Uranus rotates on its side with a 98° axial tilt, likely due to a collision with an Earth-sized object billions of years ago.",
    educational: {
      overview: "Uranus is an ice giant that rotates on its side (98° tilt), causing extreme seasons. It was the first planet discovered with a telescope.",
      composition: "Water, methane, and ammonia ices surrounding a small rocky core — 'ice giant' rather than 'gas giant'",
      atmosphere: "Hydrogen (83%), helium (15%), methane (2%) — methane gives it the blue-green color",
      surface: "No solid surface — thick icy atmosphere with faint ring system (13 rings)",
      exploration: "Visited only by Voyager 2 on January 24, 1986. Uranus Orbiter & Probe recommended as next flagship mission",
      discovery: "Discovered by William Herschel on March 13, 1781 — first planet found with a telescope",
      gravity: "8.87 m/s² (91% of Earth's gravity)"
    },
    majorMoons: [
      { name: "Miranda", radius: 0.08, distance: 4, color: 0x808080, speed: 1.1, funFact: "Miranda has the tallest known cliff in the solar system — Verona Rupes, about 20 km high.", diameter: "472 km", distanceFromParent: "129,390 km from Uranus", orbitalPeriod: "1.41 days", temperature: "-187°C", educational: { overview: "Miranda is Uranus's innermost major moon with one of the most bizarre landscapes in the solar system — huge fault canyons, terraced layers, and the towering Verona Rupes cliff.", composition: "Roughly 50% water ice and 50% silicate rock", atmosphere: "None", surface: "Patchwork terrain with coronae (unique ovoid features), grooved terrain, and Verona Rupes cliff", exploration: "Visited by Voyager 2 in January 1986", discovery: "Discovered by Gerard Kuiper on February 16, 1948", gravity: "0.079 m/s²" } },
      { name: "Ariel", radius: 0.12, distance: 5.5, color: 0xa0a0a0, speed: 0.8, funFact: "Ariel is the brightest of Uranus's moons and appears to have been geologically active.", diameter: "1,158 km", distanceFromParent: "190,900 km from Uranus", orbitalPeriod: "2.52 days", temperature: "-213°C", educational: { overview: "Ariel is Uranus's fourth-largest moon and the brightest. It shows the most recent geological activity among Uranus's moons, with extensive canyons and smooth plains.", composition: "Roughly 50% water ice and 50% silicate rock and carbonaceous material", atmosphere: "None", surface: "Extensive canyon systems (chasmata), smooth plains suggesting past cryovolcanism", exploration: "Visited by Voyager 2 in January 1986 (only 35% of surface imaged)", discovery: "Discovered by William Lassell on October 24, 1851", gravity: "0.269 m/s²" } },
      { name: "Umbriel", radius: 0.11, distance: 6.5, color: 0x606060, speed: 0.7, funFact: "Umbriel is the darkest of Uranus's major moons, reflecting very little light.", diameter: "1,169 km", distanceFromParent: "266,300 km from Uranus", orbitalPeriod: "4.14 days", temperature: "-198°C", educational: { overview: "Umbriel is the darkest of Uranus's major moons and has an ancient, heavily cratered surface with a mysterious bright ring feature (Wunda crater).", composition: "Roughly 50% water ice and 50% silicate/carbonaceous material", atmosphere: "None", surface: "Heavily cratered, uniformly dark surface with bright ring feature at Wunda crater", exploration: "Visited by Voyager 2 in January 1986", discovery: "Discovered by William Lassell on October 24, 1851", gravity: "0.23 m/s²" } },
      { name: "Titania", radius: 0.16, distance: 8, color: 0x909090, speed: 0.5, funFact: "Titania is the largest moon of Uranus and the eighth-largest moon in the solar system.", diameter: "1,578 km", distanceFromParent: "435,910 km from Uranus", orbitalPeriod: "8.71 days", temperature: "-203°C", educational: { overview: "Titania is Uranus's largest moon with a surface featuring enormous canyon systems (up to 1,500 km long) suggesting past tectonic activity.", composition: "Roughly 50% water ice and 50% silicate rock, possible internal ocean", atmosphere: "Possible very thin CO₂ atmosphere (seasonal)", surface: "Large fault canyons (chasmata), impact craters, smooth plains from past resurfacing", exploration: "Visited by Voyager 2 in January 1986", discovery: "Discovered by William Herschel on January 11, 1787", gravity: "0.379 m/s²" } }
    ]
  },
  {
    name: "Neptune",
    radius: 1.7,
    distance: 65,
    color: 0x3f54ba,
    orbitalSpeed: 0.006,
    rotationSpeed: 0.014,
    tilt: 0.49,
    moons: 16,
    diameter: "49,528 km",
    distanceFromSun: "4,515,000,000 km",
    temperature: "-214°C (cloud tops)",
    orbitalPeriod: "164.8 years",
    rotationPeriod: "16.11 hours",
    funFact: "Neptune has the strongest sustained winds in the solar system, reaching speeds over 2,100 km/h.",
    educational: {
      overview: "Neptune is the windiest planet with supersonic winds. It was the first planet found through mathematical prediction rather than observation.",
      composition: "Water, methane, ammonia ices — ice giant similar to Uranus but denser",
      atmosphere: "Hydrogen (80%), helium (19%), methane (1.5%) — deep blue color from methane absorption of red light",
      surface: "No solid surface — dynamic weather with the Great Dark Spot, bright cloud features, and violent winds",
      exploration: "Visited only by Voyager 2 on August 25, 1989 — no other missions since",
      discovery: "Predicted mathematically by Le Verrier and Adams in 1846, observed by Johann Galle on September 23, 1846",
      gravity: "11.15 m/s² (1.14× Earth's gravity)"
    },
    majorMoons: [
      { name: "Triton", radius: 0.22, distance: 6, color: 0xc8c0b8, speed: -0.6, funFact: "Triton orbits Neptune backwards (retrograde) and is slowly spiraling inward — it will eventually be torn apart.", diameter: "2,707 km", distanceFromParent: "354,759 km from Neptune", orbitalPeriod: "5.88 days (retrograde)", temperature: "-235°C (coldest known surface in solar system)", educational: { overview: "Triton is Neptune's largest moon and the only large moon with a retrograde orbit, strongly suggesting it was captured from the Kuiper Belt. It is the coldest known object in the solar system.", composition: "Nitrogen ice surface, water ice mantle, silicate/metallic core", atmosphere: "Thin nitrogen atmosphere with trace methane", surface: "Young surface with nitrogen geysers, cantaloupe terrain, frozen nitrogen plains", exploration: "Visited by Voyager 2 on August 25, 1989", discovery: "Discovered by William Lassell on October 10, 1846 — just 17 days after Neptune itself", gravity: "0.779 m/s²" } }
    ]
  }
];

export const SUN_DATA = {
  name: "Sun",
  diameter: "1,391,000 km",
  distance: "0 km (Center of Solar System)",
  orbitalSpeed: "N/A",
  orbitalPeriod: "N/A",
  rotationPeriod: "25.4 days (equator) / 35 days (poles)",
  temperature: "5,500°C (surface) / 15,000,000°C (core)",
  moons: "8 planets",
  funFact: "The Sun contains 99.86% of all mass in our solar system and converts 600 million tons of hydrogen into helium every second.",
  educational: {
    overview: "The Sun is a G2V main-sequence yellow dwarf star at the center of our solar system. It's 4.6 billion years old and will become a red giant in about 5 billion years.",
    composition: "73% hydrogen, 25% helium, 2% heavier elements (oxygen, carbon, neon, iron)",
    atmosphere: "Photosphere (visible surface, ~5,500°C), chromosphere, transition region, corona (extends millions of km, 1–3 million °C)",
    surface: "Plasma with granulation, sunspots (cooler regions ~3,500°C), solar flares, coronal mass ejections",
    exploration: "Studied by SOHO, SDO, STEREO, Parker Solar Probe (closest approach: 6.1 million km)",
    discovery: "Known since prehistoric times — Galileo observed sunspots telescopically in 1610. Understood as a star since the 19th century",
    gravity: "274 m/s² (28× Earth's gravity)"
  }
};

export const MOON_DATA = {
  name: "Moon",
  diameter: "3,474 km",
  distance: "384,400 km from Earth",
  orbitalSpeed: "1.022 km/s",
  orbitalPeriod: "27.3 days",
  rotationPeriod: "27.3 days (synchronous — tidally locked)",
  temperature: "-173°C (night) to 127°C (day)",
  moons: "0",
  funFact: "The Moon is slowly drifting away from Earth at about 3.8 cm per year and always shows the same face to us due to tidal locking.",
  educational: {
    overview: "The Moon is Earth's only natural satellite and the fifth-largest moon in the solar system. It causes ocean tides, stabilizes Earth's axial tilt, and has been visited by 12 humans.",
    composition: "Small iron core (~350 km radius), silicate mantle and crust — similar to Earth's mantle",
    atmosphere: "Virtually none — thin exosphere with traces of helium, neon, hydrogen, argon",
    surface: "Regolith (crushed rock dust), maria (dark basaltic plains from ancient lava flows), highlands, and impact craters",
    exploration: "Apollo missions (1969–1972) — 12 astronauts walked on the Moon. Artemis program aims to return humans. Multiple robotic missions from USA, Russia, China, India, Japan",
    discovery: "Known since prehistoric times — first telescopic observations by Galileo in 1610",
    gravity: "1.62 m/s² (16.6% of Earth's gravity)"
  }
};

export const DWARF_PLANETS = [
  {
    name: "Pluto",
    radius: 0.35,
    distance: 78,
    color: 0xc8b496,
    orbitalSpeed: 0.004,
    rotationSpeed: 0.004,
    tilt: 2.16,
    moons: 5,
    diameter: "2,377 km",
    distanceFromSun: "5,906,000,000 km",
    temperature: "-230°C (average)",
    orbitalPeriod: "247.9 years",
    rotationPeriod: "6.39 days (retrograde)",
    funFact: "Pluto has a heart-shaped glacier called Sputnik Planitia, made of frozen nitrogen — visible in New Horizons photos.",
    isDwarf: true,
    educational: {
      overview: "Pluto was considered the ninth planet from 1930 to 2006, when the IAU reclassified it as a dwarf planet. Despite its small size, it has a complex geology with mountains, glaciers, and a thin atmosphere.",
      composition: "Nitrogen ice, methane ice, and carbon monoxide ice over a rocky core (estimated 70% rock, 30% ice)",
      atmosphere: "Thin nitrogen atmosphere with traces of methane and carbon monoxide — freezes and collapses as it moves away from the Sun",
      surface: "Mountains of water ice, nitrogen ice plains (Sputnik Planitia heart feature), dark reddish terrain from tholins",
      exploration: "New Horizons flyby on July 14, 2015 — the first and only spacecraft to visit Pluto",
      discovery: "Discovered by Clyde Tombaugh at Lowell Observatory on February 18, 1930",
      gravity: "0.62 m/s² (6.3% of Earth's gravity)"
    },
    majorMoons: [
      { name: "Charon", radius: 0.18, distance: 2, color: 0x888888, speed: 0.4, funFact: "Charon is so large relative to Pluto that they orbit each other — forming a double dwarf planet system.", diameter: "1,212 km", distanceFromParent: "19,571 km from Pluto", orbitalPeriod: "6.39 days (synchronous — mutually tidally locked)", temperature: "-220°C", educational: { overview: "Charon is Pluto's largest moon, about half Pluto's diameter. The two bodies are mutually tidally locked, always showing the same face to each other — a unique double system.", composition: "Water ice surface over rocky interior", atmosphere: "None", surface: "Gray terrain with reddish-brown polar cap (Mordor Macula) made of tholins from Pluto's escaping atmosphere", exploration: "Imaged by New Horizons during Pluto flyby in July 2015", discovery: "Discovered by James Christy at USNO on June 22, 1978", gravity: "0.288 m/s²" } }
    ]
  },
  {
    name: "Ceres",
    radius: 0.15,
    distance: 25,
    color: 0x9a9a8a,
    orbitalSpeed: 0.075,
    rotationSpeed: 0.025,
    tilt: 0.07,
    moons: 0,
    diameter: "946 km",
    distanceFromSun: "413,700,000 km",
    temperature: "-105°C (average)",
    orbitalPeriod: "4.6 years",
    rotationPeriod: "9.07 hours",
    funFact: "Ceres contains about a third of the asteroid belt's total mass and has mysterious bright spots made of sodium carbonate salt deposits.",
    isDwarf: true,
    educational: {
      overview: "Ceres is the largest object in the asteroid belt and the only dwarf planet in the inner solar system. It may have a subsurface ocean of liquid water beneath its icy mantle.",
      composition: "Rocky core with icy mantle, possibly subsurface briny ocean",
      atmosphere: "Transient water vapor detected near surface — possibly from cryovolcanism or sublimation",
      surface: "Heavily cratered with bright sodium carbonate salt deposits (Occator crater's Cerealia Facula)",
      exploration: "Dawn spacecraft orbited Ceres from March 2015 to November 2018",
      discovery: "Discovered by Giuseppe Piazzi on January 1, 1801 — originally classified as a planet, then an asteroid, now dwarf planet",
      gravity: "0.28 m/s² (2.9% of Earth's gravity)"
    }
  },
  {
    name: "Eris",
    radius: 0.36,
    distance: 92,
    color: 0xe8e8e0,
    orbitalSpeed: 0.002,
    rotationSpeed: 0.003,
    tilt: 0.78,
    moons: 1,
    diameter: "2,326 km",
    distanceFromSun: "10,125,000,000 km",
    temperature: "-243°C (average)",
    orbitalPeriod: "559 years",
    rotationPeriod: "25.9 hours",
    funFact: "Eris is the most massive known dwarf planet (27% more massive than Pluto) and its discovery directly triggered Pluto's reclassification.",
    isDwarf: true,
    educational: {
      overview: "Eris is the most massive known dwarf planet, orbiting in the scattered disc far beyond Neptune. Its discovery in 2005 triggered the IAU debate that led to Pluto losing its planet status in 2006.",
      composition: "Likely rocky interior with nitrogen and methane ice surface",
      atmosphere: "Possible thin nitrogen atmosphere when near perihelion (closest approach to Sun) — currently frozen on surface",
      surface: "Extremely bright and reflective (albedo ~0.96) — one of the most reflective surfaces in the solar system, likely fresh nitrogen ice",
      exploration: "No spacecraft has visited Eris — studied only by ground-based and space telescopes (Hubble, JWST)",
      discovery: "Discovered by Mike Brown, Chad Trujillo, and David Rabinowitz on January 5, 2005",
      gravity: "0.82 m/s² (8.4% of Earth's gravity)"
    }
  }
];
