// GESTOR DE TEMAS Y PERSISTENCIA GLOBAL
export const themes = {
    'dark-cyber': { name: 'Cyberpunk Oscuro', bg: '#070a12', accent: '#6366f1' },
    'dust-vortex': { name: 'Vórtice de Polvo (Imagen)', bg: '#020408', accent: '#f97316' },
    'neon-matrix': { name: 'Matriz Esmeralda', bg: '#04120e', accent: '#10b981' },
    'light-clean': { name: 'Luminoso Minimalista', bg: '#f1f5f9', accent: '#4f46e5' }
};

export function getSavedTheme() {
    return localStorage.getItem('app_theme') || 'dust-vortex';
}

export function applyTheme(themeId) {
    const validTheme = themes[themeId] ? themeId : 'dust-vortex';
    document.documentElement.setAttribute('data-theme', validTheme);
    localStorage.setItem('app_theme', validTheme);
    
    // Disparar evento para actualizar la animación en background.js
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: validTheme } }));
}

// Inicializar tema inmediatamente antes del renderizado
applyTheme(getSavedTheme());