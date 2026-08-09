export const themes = [
    { id: 'dark-crimson', name: 'Crimson Midnight' },
    { id: 'dark-cyber', name: 'Cyberpunk Oscuro' },
    { id: 'dust-vortex', name: 'Vórtice de Polvo' },
    { id: 'neon-matrix', name: 'Matriz Esmeralda' },
    { id: 'light-clean', name: 'Luminoso Minimalista' }
];

const validIds = themes.map(t => t.id);

export function getSavedTheme() {
    let saved = localStorage.getItem('app_theme');
    
    // Mapeo automático de nombres viejos a los nuevos IDs oscuros
    if (saved === 'crimson' || saved === 'dark-crimson-old') saved = 'dark-crimson';
    if (saved === 'cyber') saved = 'dark-cyber';
    if (saved === 'dust') saved = 'dust-vortex';
    if (saved === 'matrix') saved = 'neon-matrix';

    // Si está vacío o es un nombre no válido, forzar 'dark-crimson'
    if (!saved || !validIds.includes(saved)) {
        saved = 'dark-crimson';
        localStorage.setItem('app_theme', 'dark-crimson');
    }
    return saved;
}

export function applyTheme(themeId) {
    let target = themeId;
    if (!validIds.includes(target)) target = 'dark-crimson';

    document.documentElement.setAttribute('data-theme', target);
    if (document.body) {
        document.body.setAttribute('data-theme', target);
    }
    localStorage.setItem('app_theme', target);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: target } }));
}

applyTheme(getSavedTheme());

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getSavedTheme());
});