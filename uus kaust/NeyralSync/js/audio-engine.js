/**
 * Audio Engine - Core Web Audio API Management
 * Handles all sound generation and effects
 */

class AudioEngine {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = this.audioContext.createGain();
        this.masterVolume.gain.value = 0.3;
        this.masterVolume.connect(this.audioContext.destination);

        // Delay for Echo Trails
        this.delayNode = this.audioContext.createDelay(5);
        this.delayGain = this.audioContext.createGain();
        this.delayGain.gain.value = 0.5;
        this.delayNode.delayTime.value = 0.3;
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.masterVolume);
        this.delayGain.connect(this.delayNode); // Feedback

        // Reverb (simple convolver effect)
        this.dryGain = this.audioContext.createGain();
        this.dryGain.connect(this.masterVolume);

        this.activeOscillators = [];
        this.colorInstruments = {
            red: { type: 'square', freq: 110 }, // Bass
            blue: { type: 'sine', freq: 440 },   // Piano
            yellow: { type: 'triangle', freq: 880 } // Synth
        };

        // Background vibe oscillators
        this.backgroundOscillators = [];
    }

    /**
     * Feature 1: Pitch-on-Y
     * Y-position determines frequency
     */
    getPitchFromY(y, canvasHeight) {
        // Map Y (0 = top = high pitch, height = bottom = low pitch)
        const normalized = 1 - (y / canvasHeight);
        // Frequency range: 100Hz to 800Hz
        return 100 + (normalized * 700);
    }

    /**
     * Feature 4: Speed-Volume
     * Movement speed affects volume and filter
     */
    getVolumeFromSpeed(speed) {
        // Max speed expected: ~50px per frame
        const normalized = Math.min(speed / 50, 1);
        return 0.1 + (normalized * 0.7); // Volume 0.1 to 0.8
    }

    /**
     * Feature 2: Color-Instrument
     * Create different synth types based on color
     */
    playColorNote(color, frequency, duration = 0.1, volume = 0.5) {
        const now = this.audioContext.currentTime;
        const config = this.colorInstruments[color] || this.colorInstruments.blue;

        const osc = this.audioContext.createOscillator();
        const env = this.audioContext.createGain();

        osc.type = config.type;
        osc.frequency.setValueAtTime(frequency, now);

        // Envelope
        env.gain.setValueAtTime(volume, now);
        env.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(env);
        env.connect(this.dryGain);
        env.connect(this.delayNode);

        osc.start(now);
        osc.stop(now + duration);

        this.activeOscillators.push({ osc, env, stopTime: now + duration });
        return { osc, env };
    }

    /**
     * Feature 3: Echo Trails
     * Update delay and feedback parameters
     */
    setEchoTrail(delayAmount, decayAmount) {
        this.delayNode.delayTime.value = 0.1 + delayAmount * 0.4;
        this.delayGain.gain.value = decayAmount * 0.3;
    }

    /**
     * Feature 5: Background Vibe
     * Generate ambient atmospheric sound
     */
    generateBackgroundVibe(colorDensity) {
        // Stop existing background oscillators
        this.backgroundOscillators.forEach(osc => {
            osc.stop(this.audioContext.currentTime);
        });
        this.backgroundOscillators = [];

        if (colorDensity === 0) return; // No sound if canvas is empty

        const now = this.audioContext.currentTime;
        const frequencies = [55, 110, 165, 220]; // Deep ambient notes

        // Create multiple harmonic layers
        frequencies.forEach((freq, idx) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 200 + (colorDensity * 300);

            // Modulate volume based on color density
            gain.gain.value = (colorDensity * 0.15) / frequencies.length;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            // Slight frequency wobble for movement
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 0.2 + idx * 0.05;
            lfoGain.gain.value = 2 + idx;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.start(now);
            lfo.start(now);

            this.backgroundOscillators.push(osc, lfo);
        });
    }

    /**
     * Feature 6: Symmetry Mode
     * Generate chord for mirrored drawing
     */
    playSymmetryChord(rootFreq, volume = 0.4) {
        const now = this.audioContext.currentTime;
        const duration = 0.3;
        // Play harmonic notes
        const intervals = [1, 1.25, 1.5, 2]; // Perfect intervals

        intervals.forEach(interval => {
            this.playColorNote('blue', rootFreq * interval, duration, volume / intervals.length);
        });
    }

    /**
     * Feature 7: Waveform Brush
     * Create audio-reactive visual feedback
     */
    getWaveformSample() {
        const analyser = this.audioContext.createAnalyser();
        this.masterVolume.connect(analyser);
        analyser.fftSize = 256;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        return data;
    }

    /**
     * Feature 9: Shake to Clear
     * Fade out sound effect
     */
    clearEffect() {
        const now = this.audioContext.currentTime;
        this.masterVolume.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        this.masterVolume.gain.setValueAtTime(0.3, now + 0.51);
    }

    cleanup() {
        this.activeOscillators.forEach(obj => {
            try {
                obj.osc.stop(this.audioContext.currentTime);
            } catch (e) {}
        });
        this.activeOscillators = [];
    }
}

// Global instance
window.audioEngine = new AudioEngine();
