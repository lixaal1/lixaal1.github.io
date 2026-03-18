/**
 * Feature 3: Echo Trails
 * Lines fade slowly while sound echo (delay) also decays
 */

class EchoTrails {
    constructor() {
        this.trails = [];
        this.maxTrails = 100;
    }

    /**
     * Add a new trail segment
     */
    addTrail(x, y, x2, y2, color, audioData) {
        const trail = {
            x,
            y,
            x2,
            y2,
            color,
            life: 1.0,
            audioData: audioData || { frequency: 440, volume: 0.5, color: 'blue' },
            createdAt: Date.now()
        };

        this.trails.push(trail);

        // Keep trail count manageable
        if (this.trails.length > this.maxTrails) {
            this.trails.shift();
        }

        return trail;
    }

    /**
     * Update trail decay and audio echo
     */
    update(decayAmount) {
        this.trails = this.trails.map(trail => {
            // Decay based on settings
            trail.life -= (0.02 / decayAmount);
            return trail;
        }).filter(trail => trail.life > 0.05);
    }

    /**
     * Draw all trails with fade effect
     */
    draw(ctx) {
        this.trails.forEach(trail => {
            const alpha = trail.life * 0.8;

            // Convert hex color to rgba
            let rgbaColor;
            if (trail.color.startsWith('#')) {
                const r = parseInt(trail.color.slice(1, 3), 16);
                const g = parseInt(trail.color.slice(3, 5), 16);
                const b = parseInt(trail.color.slice(5, 7), 16);
                rgbaColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                rgbaColor = trail.color.replace(')', `, ${alpha})`);
            }

            ctx.strokeStyle = rgbaColor;
            ctx.lineWidth = 2 * trail.life;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(trail.x, trail.y);
            ctx.lineTo(trail.x2, trail.y2);
            ctx.stroke();

            // Optional: Draw glow for fresher trails
            if (trail.life > 0.7) {
                ctx.strokeStyle = rgbaColor.replace(/[\d.]+\)$/g, `${alpha * 0.3})`);
                ctx.lineWidth = 6 * trail.life;
                ctx.stroke();
            }
        });
    }

    /**
     * Get audio decay factor based on visual decay
     */
    getAudioDecay() {
        return this.trails.length / this.maxTrails;
    }

    clear() {
        this.trails = [];
    }
}

window.EchoTrails = EchoTrails;
