export const themes = [
    { id: 'dark-crimson', name: 'Crimson Midnight' },
    { id: 'apple-dark', name: 'Apple Dark' },
    { id: 'netflix-dark', name: 'Netflix Dark' },
    { id: 'apple-light', name: 'Apple Light' },
    { id: 'dark-cyber', name: 'Cyberpunk Oscuro' },
    { id: 'dust-vortex', name: 'Vórtice de Polvo' },
    { id: 'neon-matrix', name: 'Matriz Esmeralda' },
    { id: 'light-clean', name: 'Luminoso Minimalista' }
];

const validIds = themes.map(t => t.id);

export function getSavedTheme() {
    let saved = localStorage.getItem('app_theme');
    
    // Mapeo automático de nombres viejos/alternativos a los IDs oficiales
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

    // Aplicar atributo a documentElement (<html>) y <body>
    document.documentElement.setAttribute('data-theme', target);
    if (document.body) {
        document.body.setAttribute('data-theme', target);
    }
    
    localStorage.setItem('app_theme', target);
    
    // Notificar a toda la app que el tema ha cambiado (Background Canvas, Charts, etc.)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: target } }));
}

// Inyección e inicialización inmediata del tema guardado
applyTheme(getSavedTheme());

// Re-asegurar la aplicación del tema una vez cargado el DOM (en caso de que document.body no estuviera listo)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyTheme(getSavedTheme());
    });
} else {
    applyTheme(getSavedTheme());
}