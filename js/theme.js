export const themes = [
    { id: 'dark-cyber', name: 'Cyberpunk Oscuro' },
    { id: 'dark-crimson', name: 'Crimson Midnight' },
    { id: 'dust-vortex', name: 'Vórtice de Polvo' },
    { id: 'neon-matrix', name: 'Matriz Esmeralda' },
    { id: 'light-clean', name: 'Luminoso Minimalista' }
];

export function getSavedTheme() {
    return localStorage.getItem('app_theme') || 'dark-crimson';
}

export function applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    if (document.body) {
        document.body.setAttribute('data-theme', themeId);
    }
    localStorage.setItem('app_theme', themeId);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeId } }));
}

// Aplicación inmediata
applyTheme(getSavedTheme());

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getSavedTheme());
});