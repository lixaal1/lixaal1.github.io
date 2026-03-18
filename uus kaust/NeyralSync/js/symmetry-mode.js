/**
 * Feature 6: Symmetry Mode
 * Draw one line, automatically mirror it in 4 directions for complex visual and audio chords
 */

class SymmetryMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.isActive = false;
    }

    /**
     * Mirror coordinates across center for 4-way symmetry
     */
    getMirroredPoints(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Original point
        const points = [{ x, y }];

        // Horizontal flip
        points.push({
            x: centerX - (x - centerX),
            y
        });

        // Vertical flip
        points.push({
            x,
            y: centerY - (y - centerY)
        });

        // Both flips (180 rotation)
        points.push({
            x: centerX - (x - centerX),
            y: centerY - (y - centerY)
        });

        return points;
    }

    /**
     * Mirror a line segment in 4 directions
     */
    mirrorLine(x1, y1, x2, y2) {
        const mirroredLines = [];
        const startPoints = this.getMirroredPoints(x1, y1);
        const endPoints = this.getMirroredPoints(x2, y2);

        // Create lines by pairing corresponding mirror points
        for (let i = 0; i < startPoints.length; i++) {
            mirroredLines.push({
                x1: startPoints[i].x,
                y1: startPoints[i].y,
                x2: endPoints[i].x,
                y2: endPoints[i].y,
                index: i
            });
        }

        return mirroredLines;
    }

    /**
     * Draw mirrored lines
     */
    drawMirroredLines(ctx, lines, color, lineWidth = 2) {
        lines.forEach((line, idx) => {
            // Different opacity for each mirror
            const alpha = 1 - (idx * 0.15);
            ctx.strokeStyle = this.hexToRgba(color, alpha);
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        });
    }

    /**
     * Generate symmetry chord sound
     */
    playSymmetrySound(frequency, color) {
        // Play harmonic intervals for each mirror position
        const baseFreqs = [
            frequency,
            frequency * 1.25,
            frequency * 1.5,
            frequency * 2
        ];

        baseFreqs.forEach(freq => {
            audioEngine.playColorNote(color, freq, 0.15, 0.2);
        });
    }

    /**
     * Helper: Convert hex color to rgba
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

window.SymmetryMode = SymmetryMode;
