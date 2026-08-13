import { getSavedTheme } from './theme.js';

let animationFrameId = null;

function setupCanvas() {
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        canvas.className = 'fixed inset-0 pointer-events-none z-0';
        document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        if (isAnimationEnabled()) {
            initParticles(currentTheme);
        }
    });

    let currentTheme = getSavedTheme();
    let particles = [];

    // Comprobar si la animación está permitida por el usuario
    function isAnimationEnabled() {
        const isDisabled = localStorage.getItem('app_bg_anim') === 'disabled';
        if (isDisabled) {
            if (canvas) canvas.style.display = 'none';
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            return false;
        }
        if (canvas) canvas.style.display = 'block';
        return true;
    }

    // 1. CYBERPUNK OSCURO (Red Ciber)
    class CyberNode {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#818cf8';
            ctx.fill();
        }
    }

    // 2. CRIMSON MIDNIGHT (Rojo Carmesí / Azul)
    class CrimsonParticle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 2.5 + 1;
            this.vy = -(Math.random() * 0.6 + 0.2);
            this.vx = (Math.random() - 0.5) * 0.4;
            this.color = Math.random() > 0.4 ? '#ef4444' : '#38bdf8';
            this.alpha = Math.random() * 0.6 + 0.2;
        }
        update() {
            this.y += this.vy;
            this.x += this.vx;
            if (this.y < 0) { this.y = height; this.x = Math.random() * width; }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // 3. VÓRTICE DE POLVO (Partículas Cálidas)
    class DustParticle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2.2 + 0.8;
            this.speedX = Math.random() * 0.8 + 0.2;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = Math.random() > 0.5 ? '#f97316' : '#38bdf8';
            this.alpha = Math.random() * 0.7 + 0.2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 100) {
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * 3;
                this.y += Math.sin(angle) * 3;
            }
            if (this.x > width || this.y < 0 || this.y > height) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // 4. MATRIZ ESMERALDA (Lluvia Matrix)
    class MatrixDrop {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.speed = Math.random() * 2 + 1;
            this.length = Math.random() * 12 + 6;
        }
        update() {
            this.y += this.speed;
            if (this.y > height) {
                this.y = 0;
                this.x = Math.random() * width;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.length);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }

    // 5. APPLE DARK (Orbes Flotantes Azul iOS y Cyan)
    class AppleDarkOrb {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 3 + 1;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.color = Math.random() > 0.5 ? '#0a84ff' : '#64d2ff';
            this.alpha = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // 6. NETFLIX DARK (Brasas y Chispas Ascendentes)
    class NetflixEmber {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 2.2 + 0.8;
            this.vy = -(Math.random() * 0.9 + 0.3);
            this.vx = (Math.random() - 0.5) * 0.4;
            this.color = Math.random() > 0.3 ? '#e50914' : '#b9090b';
            this.alpha = Math.random() * 0.7 + 0.2;
        }
        update() {
            this.y += this.vy;
            this.x += this.vx;
            if (this.y < 0) { this.y = height; this.x = Math.random() * width; }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // 7. LUMINOSO / APPLE LIGHT (Burbujas Suaves)
    class LightOrb {
        constructor() {
            this.radius = Math.random() * 12 + 6;
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.color = ['#cbd5e1', '#93c5fd', '#c4b5fd'][Math.floor(Math.random() * 3)];
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // Inicializar Partículas según Tema
    function initParticles(theme) {
        currentTheme = theme;
        particles = [];

        if (!isAnimationEnabled()) return;

        if (theme === 'dark-cyber') {
            for (let i = 0; i < 60; i++) particles.push(new CyberNode());
        } else if (theme === 'dark-crimson') {
            for (let i = 0; i < 80; i++) particles.push(new CrimsonParticle());
        } else if (theme === 'dust-vortex') {
            for (let i = 0; i < 180; i++) particles.push(new DustParticle());
        } else if (theme === 'neon-matrix') {
            for (let i = 0; i < 90; i++) particles.push(new MatrixDrop());
        } else if (theme === 'apple-dark') {
            for (let i = 0; i < 70; i++) particles.push(new AppleDarkOrb());
        } else if (theme === 'netflix-dark') {
            for (let i = 0; i < 100; i++) particles.push(new NetflixEmber());
        } else {
            // Apple Light / Light Clean
            for (let i = 0; i < 25; i++) particles.push(new LightOrb());
        }
    }

    // Bucle de Animación principal
    function animate() {
        if (!isAnimationEnabled()) return;

        ctx.clearRect(0, 0, width, height);

        // Conexión de líneas exclusiva de Cyberpunk
        if (currentTheme === 'dark-cyber') {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = '#6366f1';
                        ctx.globalAlpha = (100 - dist) / 500;
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }

        particles.forEach(p => { p.update(); p.draw(); });
        animationFrameId = requestAnimationFrame(animate);
    }

    // Manejadores de Eventos Globales
    window.addEventListener('themeChanged', (e) => {
        const selectedTheme = e.detail?.theme || getSavedTheme();
        initParticles(selectedTheme);
        if (isAnimationEnabled() && !animationFrameId) {
            animate();
        }
    });

    window.addEventListener('bgAnimChanged', () => {
        if (isAnimationEnabled()) {
            initParticles(getSavedTheme());
            if (!animationFrameId) animate();
        } else {
            ctx.clearRect(0, 0, width, height);
        }
    });

    if (isAnimationEnabled()) {
        initParticles(currentTheme);
        animate();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCanvas);
} else {
    setupCanvas();
}