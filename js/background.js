import { getSavedTheme } from './theme.js';

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
        initParticles(currentTheme);
    });

    let currentTheme = getSavedTheme();
    let particles = [];

    // --- PATRÓN 1: CONSTELACIÓN CIBERNÉTICA (dark-cyber) ---
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

    // --- PATRÓN 2: POLVO ESTELAR CÁLIDO (dust-vortex) ---
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

    // --- PATRÓN 3: LLUVIAS DE CÓDIGO MATRIX (neon-matrix) ---
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

    // --- PATRÓN 4: ESFERAS FLOTANTES LIGHT (light-clean) ---
    class LightOrb {
        constructor() {
            this.radius = Math.random() * 15 + 8;
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
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
            ctx.globalAlpha = 0.25;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    function initParticles(theme) {
        currentTheme = theme;
        particles = [];
        if (theme === 'dark-cyber') {
            for (let i = 0; i < 60; i++) particles.push(new CyberNode());
        } else if (theme === 'dust-vortex') {
            for (let i = 0; i < 200; i++) particles.push(new DustParticle());
        } else if (theme === 'neon-matrix') {
            for (let i = 0; i < 90; i++) particles.push(new MatrixDrop());
        } else {
            for (let i = 0; i < 30; i++) particles.push(new LightOrb());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Si es Cyberpunk, dibujar líneas de conexión entre nodos cercanos
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
        requestAnimationFrame(animate);
    }

    window.addEventListener('themeChanged', (e) => initParticles(e.detail.theme));
    initParticles(currentTheme);
    animate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCanvas);
} else {
    setupCanvas();
}