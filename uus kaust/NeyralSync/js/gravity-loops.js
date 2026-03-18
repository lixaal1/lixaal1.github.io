/**
 * Feature 5: Gravity Loops
 * Magnetic points that attract audio particles in rhythmic patterns
 */

class GravityLoops {
    constructor(canvas) {
        this.canvas = canvas;
        this.magneticPoints = [];
        this.particles = [];
        this.isActive = false;
    }

    /**
     * Add a magnetic point to the canvas
     */
    addMagneticPoint(x, y) {
        this.magneticPoints.push({
            x,
            y,
            radius: 80,
            particles: [],
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            soundPhase: 0
        });
    }

    /**
     * Create gravitational particles around a point
     */
    createOrbit(point) {
        const particleCount = 6 + Math.floor(Math.random() * 4);

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 30 + Math.random() * 30;

            const particle = {
                x: point.x + Math.cos(angle) * distance,
                y: point.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * (1 + Math.random()),
                vy: Math.sin(angle) * (1 + Math.random()),
                parent: point,
                angle,
                distance,
                life: 1.0
            };

            this.particles.push(particle);
            point.particles.push(particle);
        }
    }

    /**
     * Update particle positions and physics
     */
    update() {
        if (this.magneticPoints.length === 0) return;

        // Update each particle
        this.particles = this.particles.filter(p => {
            const parent = p.parent;

            // Gravity toward parent
            const dx = parent.x - p.x;
            const dy = parent.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = 0.15;

            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;

            // Damping
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Orbital motion - they orbit the point
            p.angle += 0.02;
            p.distance = Math.sqrt(dx * dx + dy * dy);

            // Life decay
            p.life -= 0.01;

            // Generate sound when particles are at specific positions
            if (Math.random() < 0.02) {
                const freq = 200 + Math.sin(p.angle) * 100;
                audioEngine.playColorNote('yellow', freq, 0.05, 0.2);
            }

            return p.life > 0;
        });

        // Occasionally recreate orbits
        if (Math.random() < 0.05) {
            const randomPoint = this.magneticPoints[Math.floor(Math.random() * this.magneticPoints.length)];
            this.createOrbit(randomPoint);
        }

        // Update sound phases
        this.magneticPoints.forEach((point, idx) => {
            point.soundPhase += 0.02;
            // Generate rhythmic sound pattern
            if (Math.sin(point.soundPhase * 6) > 0.9) {
                const freq = 110 * (1 + idx * 0.5);
                audioEngine.playColorNote('blue', freq, 0.1, 0.3);
            }
        });
    }

    /**
     * Draw particles and magnetic points
     */
    draw(ctx) {
        // Draw magnetic points
        this.magneticPoints.forEach(point => {
            // Glow effect
            const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius);
            gradient.addColorStop(0, `rgba(${parseInt(point.color.slice(4, -1).split(',')[0])}, 255, 0.3)`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(point.x - point.radius, point.y - point.radius, point.radius * 2, point.radius * 2);

            // Core
            ctx.fillStyle = point.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw particles
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 200, 100, ${p.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Connection lines
            ctx.strokeStyle = `rgba(100, 200, 255, ${p.life * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.parent.x, p.parent.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        });
    }

    clear() {
        this.magneticPoints = [];
        this.particles = [];
    }
}

window.GravityLoops = GravityLoops;
