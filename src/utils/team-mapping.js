export function getTeamId(teamName) {
    // Normalizes team names to match the sprite IDs (e.g. "Kansas City" -> "chiefs")
    // Map full names to the file basenames found in src/images/logos

    if (!teamName) return 'nfl';

    const map = {
        // City names (from Standings.json)
        'Kansas City': 'chiefs',
        'Buffalo': 'bills',
        'Pittsburgh': 'steelers',
        'Houston': 'texans',
        'L.A. Chargers': 'chargers',
        'Baltimore': 'ravens',
        'Denver': 'broncos',
        'Indianapolis': 'colts',
        'Miami': 'dolphins',
        'Cincinnati': 'bengals',
        'N.Y. Jets': 'jets',
        'Cleveland': 'browns',
        'Las Vegas': 'raiders',
        'Tennessee': 'titans',
        'Jacksonville': 'jaguars',
        'New England': 'patriots',
        'Detroit': 'lions',
        'Philadelphia': 'eagles',
        'Seattle': 'seahawks',
        'Atlanta': 'falcons',
        'Minnesota': 'vikings',
        'Green Bay': 'packers',
        'Washington': 'commanders',
        'L.A. Rams': 'rams',
        'Tampa Bay': 'buccaneers', // Corrected spelling if sprite allows, else keep 'buccaners'
        'San Francisco': '49ers',
        'Arizona': 'cardinals',
        'Dallas': 'cowboys',
        'New Orleans': 'saints',
        'Chicago': 'bears',
        'N.Y. Giants': 'giants',
        'Carolina': 'panthers',

        // Full names (from playoff-picture.json)
        'Kansas City Chiefs': 'chiefs',
        'Buffalo Bills': 'bills',
        'Pittsburgh Steelers': 'steelers',
        'Houston Texans': 'texans',
        'Los Angeles Chargers': 'chargers',
        'L.A. Chargers': 'chargers',
        'Baltimore Ravens': 'ravens',
        'Denver Broncos': 'broncos',
        'Indianapolis Colts': 'colts',
        'Miami Dolphins': 'dolphins',
        'Cincinnati Bengals': 'bengals',
        'New York Jets': 'jets',
        'N.Y. Jets': 'jets',
        'Cleveland Browns': 'browns',
        'Las Vegas Raiders': 'raiders',
        'Tennessee Titans': 'titans',
        'Jacksonville Jaguars': 'jaguars',
        'New England Patriots': 'patriots',
        'Detroit Lions': 'lions',
        'Philadelphia Eagles': 'eagles',
        'Seattle Seahawks': 'seahawks',
        'Atlanta Falcons': 'falcons',
        'Minnesota Vikings': 'vikings',
        'Green Bay Packers': 'packers',
        'Washington Commanders': 'commanders',
        'Los Angeles Rams': 'rams',
        'L.A. Rams': 'rams',
        'Tampa Bay Buccaneers': 'buccaners', // Typo in sprite ID
        'San Francisco 49ers': '49ers',
        'Arizona Cardinals': 'cardinals',
        'Dallas Cowboys': 'cowboys',
        'New Orleans Saints': 'saints',
        'Chicago Bears': 'bears',
        'New York Giants': 'giants',
        'N.Y. Giants': 'giants',
        'Carolina Panthers': 'panthers'
    };

    // Normalize input to handle potential variations
    const normalized = teamName.trim();
    if (map[normalized]) return map[normalized];

    const parts = normalized.split(/\s+/);
    const lastWord = parts[parts.length - 1].toLowerCase();

    // Attempt to match last word to a value in map?
    // This handles "Indianapolis Colts" -> "Colts" -> check if "Colts" is a key? No "Colts" is not a key.
    // But "Indianapolis" -> "colts".
    // "Colts" alone is not mapped.

    // Quick heuristic: checks if any value in map equals the dash-cased last word
    const values = Object.values(map);
    if (values.includes(lastWord)) return lastWord;
    // Check if plural/singular mismatch? usually logos are plural.

    console.warn(`Antigravity: Team mapping not found for "${teamName}"`);
    return normalized.toLowerCase().replace(/\s+/g, '-');
}

export function getTeamAbbreviation(teamName) {
    if (!teamName) return '';
    const normalized = teamName.trim();

    // Mapping provided by user
    const abbrMap = {
        'Denver': 'DEN',
        'New England': 'NE',
        'Jacksonville': 'JAX',
        'Pittsburgh': 'PIT',
        'L.A. Chargers': 'LAC',
        'Los Angeles Chargers': 'LAC',
        'Buffalo': 'BUF',
        'Houston': 'HOU',
        'Indianapolis': 'IND',
        'Baltimore': 'BLT',
        'Kansas City': 'KC',
        'Miami': 'MIA',
        'Cincinnati': 'CIN',
        'N.Y. Jets': 'NYJ',
        'New York Jets': 'NYJ',
        'Cleveland': 'CLV',
        'Las Vegas': 'LV',
        'Tennessee': 'TEN',
        'L.A. Rams': 'LAR',
        'Los Angeles Rams': 'LAR',
        'Green Bay': 'GB',
        'Philadelphia': 'PHI',
        'Tampa Bay': 'TB',
        'Seattle': 'SEA',
        'San Francisco': 'SF',
        'Chicago': 'CHI',
        'Detroit': 'DET',
        'Carolina': 'CAR',
        'Dallas': 'DAL',
        'Minnesota': 'MIN',
        'Atlanta': 'ATL',
        'Arizona': 'ARZ',
        'New Orleans': 'NO',
        'Washington': 'WSH',
        'N.Y. Giants': 'NYG',
        'New York Giants': 'NYG'
    };

    if (abbrMap[normalized]) return abbrMap[normalized];

    // Fallback: If not found, try to use first 3 letters uppercase
    // or if it ends with a known city name... but better to just return first 3 chars
    // to avoid breaking layout.
    return normalized.substring(0, 3).toUpperCase();
}
