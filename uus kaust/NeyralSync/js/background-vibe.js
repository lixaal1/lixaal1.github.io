/**
 * Feature 10: Background Vibe
 * Generate atmospheric sound that responds to canvas color density
 */

class BackgroundVibe {
    constructor() {
        this.isActive = true;
        this.colorDensity = 0;
        this.previousDensity = 0;
        this.updateInterval = 500; // ms
        this.lastUpdate = 0;
    }

    /**
     * Calculate color density from canvas image data
     */
    calculateColorDensity(ctx, canvas) {
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let coloredPixels = 0;
            // Check every 4th pixel to optimize
            for (let i = 0; i < data.length; i += 16) {
                // If alpha > 0, pixel has color
                if (data[i + 3] > 50) {
                    coloredPixels++;
                }
            }

            const totalPixels = (canvas.width * canvas.height) / 4;
            return Math.min(coloredPixels / totalPixels, 1);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Update background vibe based on color density
     */
    update(ctx, canvas) {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }

        this.lastUpdate = now;
        const newDensity = this.calculateColorDensity(ctx, canvas);

        // Only update if density changed significantly
        if (Math.abs(newDensity - this.previousDensity) > 0.05) {
            this.previousDensity = newDensity;
            this.colorDensity = newDensity;

            if (this.isActive) {
                audioEngine.generateBackgroundVibe(this.colorDensity);
            }
        }
    }

    /**
     * Toggle background vibe on/off
     */
    toggle() {
        this.isActive = !this.isActive;

        if (!this.isActive) {
            // Stop background oscillators
            audioEngine.backgroundOscillators.forEach(osc => {
                try {
                    osc.stop(audioEngine.audioContext.currentTime);
                } catch (e) {}
            });
            audioEngine.backgroundOscillators = [];
        } else {
            // Restart
            audioEngine.generateBackgroundVibe(this.colorDensity);
        }

        return this.isActive;
    }

    /**
     * Get current density for UI display
     */
    getDensity() {
        return this.colorDensity;
    }
}

window.BackgroundVibe = BackgroundVibe;
