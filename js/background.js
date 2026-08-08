import { getSavedTheme } from './theme.js';

const canvas = document.createElement('canvas');
canvas.id = 'bg-canvas';
canvas.className = 'fixed inset-0 pointer-events-none z-0';
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles(currentTheme);
});

let mouse = { x: -1000, y: -1000 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

let currentTheme = getSavedTheme();
let particles = [];

// REVOLUCIONARIO: PATRÓN VÓRTICE DE POLVO (Basado en la imagen adjunta)
class DustParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2.2 + 0.8;
        this.speedX = Math.random() * 0.8 + 0.2;
        this.speedY = (Math.random() - 0.5) * 0.5;
        
        // Colores idénticos a la imagen: Azul cian profundo, azul claro y destellos naranja/coral
        const rand = Math.random();
        if (rand > 0.82) this.color = '#f97316'; // Coral / Naranja
        else if (rand > 0.5) this.color = '#38bdf8'; // Azul Cian
        else if (rand > 0.2) this.color = '#1d4ed8'; // Azul Profundo
        else this.color = '#64748b'; // Polvo neutro
        
        this.alpha = Math.random() * 0.7 + 0.2;
    }

    update() {
        // Ondulación en forma de curva vectorial (Simula el patrón en diagonal de la imagen)
        this.x += this.speedX + Math.sin(this.y * 0.005) * 0.4;
        this.y += this.speedY + Math.cos(this.x * 0.005) * 0.3;

        // Repulsión con el cursor
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * 3;
            this.y += Math.sin(angle) * 3;
        }

        if (this.x > width || this.y < 0 || this.y > height) {
            this.x = 0;
            this.y = Math.random() * height;
        }
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

// PATRÓN BUBBLES REPELENTES (Cyberpunk)
class BubbleParticle {
    constructor() {
        this.radius = Math.random() * 6 + 4;
        this.x = Math.random() * (width - this.radius * 2) + this.radius;
        this.y = Math.random() * (height - this.radius * 2) + this.radius;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.color = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 4)];
    }

    update() {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * 0.8;
            this.vy += Math.sin(angle) * 0.8;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;

        if (this.x <= 0 || this.x >= width) this.vx *= -1;
        if (this.y <= 0 || this.y >= height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function initParticles(theme) {
    currentTheme = theme;
    particles = [];
    
    if (theme === 'dust-vortex') {
        // Alta densidad de micropartículas (350 puntos)
        for (let i = 0; i < 350; i++) particles.push(new DustParticle());
    } else {
        // Partículas estándar
        for (let i = 0; i < 45; i++) particles.push(new BubbleParticle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animate);
}

// Escuchar cambios de tema en vivo desde el perfil
window.addEventListener('themeChanged', (e) => {
    initParticles(e.detail.theme);
});

initParticles(currentTheme);
animate();