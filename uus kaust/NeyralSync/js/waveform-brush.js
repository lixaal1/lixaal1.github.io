/**
 * Feature 7: Waveform Brush
 * Brush stroke visualizes a live audio oscillogram that vibrates with the sound
 */

class WaveformBrush {
    constructor(canvas) {
        this.canvas = canvas;
        this.analyser = null;
        this.waveData = [];
    }

    /**
     * Initialize analyzer from audio engine
     */
    initAnalyzer() {
        const audioContext = audioEngine.audioContext;
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        audioEngine.masterVolume.connect(this.analyser);
        this.waveData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    /**
     * Get current waveform data
     */
    getWaveformData() {
        if (!this.analyser) {
            this.initAnalyzer();
        }
        try {
            this.analyser.getByteFrequencyData(this.waveData);
            return this.waveData;
        } catch (e) {
            return new Uint8Array(128);
        }
    }

    /**
     * Draw brush stroke with waveform vibration
     */
    drawWaveformStroke(ctx, x1, y1, x2, y2, color, lineWidth = 3) {
        const waveData = this.getWaveformData();
        const points = this.interpolatePoints(x1, y1, x2, y2, 20);

        points.forEach((point, idx) => {
            // Sample waveform data for vibration
            const waveIndex = Math.floor((idx / points.length) * waveData.length);
            const vibration = (waveData[waveIndex] / 255) * 8;

            // Perpendicular offset (creates the vibrating effect)
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / len;
            const perpY = dx / len;

            const vx = point.x + perpX * vibration;
            const vy = point.y + perpY * vibration;

            // Draw oscillating point
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.9;

            // Create a small waveform-like pattern
            ctx.beginPath();
            const size = lineWidth * (0.5 + (waveData[waveIndex] / 255) * 0.5);
            ctx.arc(vx, vy, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        });

        // Draw the base stroke
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /**
     * Interpolate points between two coordinates
     */
    interpolatePoints(x1, y1, x2, y2, count) {
        const points = [];
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            points.push({
                x: x1 + (x2 - x1) * t,
                y: y1 + (y2 - y1) * t
            });
        }
        return points;
    }

    /**
     * Get frequency-based color based on waveform energy
     */
    getReactiveColor(baseColor) {
        const waveData = this.getWaveformData();
        const energy = waveData.reduce((a, b) => a + b) / waveData.length;
        const intensity = Math.min(energy / 255, 1);

        // Increase saturation and brightness based on audio energy
        if (baseColor === '#ff0000') {
            return `hsl(0, ${70 + intensity * 30}%, ${40 + intensity * 20}%)`;
        } else if (baseColor === '#0000ff') {
            return `hsl(240, ${70 + intensity * 30}%, ${40 + intensity * 20}%)`;
        } else if (baseColor === '#ffff00') {
            return `hsl(60, ${70 + intensity * 30}%, ${40 + intensity * 20}%)`;
        }
        return baseColor;
    }
}

window.WaveformBrush = WaveformBrush;
