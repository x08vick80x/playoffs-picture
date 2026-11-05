export const FAVORITES_KEY = 'nfl-favorites';

// Storage can be unavailable, malformed or left over from an older season.
export function readFavorites() {
    try {
        const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        return Array.isArray(value) ? [...new Set(value.filter(name => typeof name === 'string'))] : [];
    } catch { return []; }
}

export function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return true;
    } catch { return false; }
}
