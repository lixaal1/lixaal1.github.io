/**
 * NeyralSync - Main Application
 * Integrates all audio and visual features
 */

class NeyralSync {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize all features
        this.echoTrails = new EchoTrails();
        this.waveformBrush = new WaveformBrush(this.canvas);
        this.waveformBrush.initAnalyzer();
        this.shakeDetector = new ShakeDetector();
        this.backgroundVibe = new BackgroundVibe();
        this.gravityLoops = new GravityLoops(this.canvas);
        this.symmetryMode = new SymmetryMode(this.canvas);
        this.recordLoop = new RecordLoop();

        // State
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentColor = '#0000ff';
        this.symmetryEnabled = false;
        this.gravityLoopsEnabled = false;

        // Input handling
        this.setupEventListeners();

        // Animation loop
        this.animate();
    }

    /**
     * Resize canvas to fill available space
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());

        // Control buttons
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('symmetryToggle').addEventListener('click', () => this.toggleSymmetry());
        document.getElementById('vibeToggle').addEventListener('click', () => this.toggleBackgroundVibe());

        // Slider controls
        document.getElementById('delayAmount').addEventListener('change', (e) => {
            const decayValue = document.getElementById('decayAmount').value;
            audioEngine.setEchoTrail(parseFloat(e.target.value), parseFloat(decayValue));
            document.getElementById('delayValue').textContent = Math.round(parseFloat(e.target.value) * 100) + '%';
        });

        document.getElementById('decayAmount').addEventListener('change', (e) => {
            const delayValue = document.getElementById('delayAmount').value;
            audioEngine.setEchoTrail(parseFloat(delayValue), parseFloat(e.target.value));
            document.getElementById('decayValue').textContent = parseFloat(e.target.value).toFixed(1) + 's';
        });

        // Shake to clear
        this.shakeDetector.onShake = () => this.shake();

        // Request motion permission for iOS
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            this.canvas.addEventListener('click', () => {
                this.shakeDetector.requestPermission().then(() => {
                    console.log('Motion permission granted');
                });
            }, { once: true });
        }

        // Right-click for color selection
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.selectColor();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') this.currentColor = '#ff0000'; // Red bass
            if (e.key === '2') this.currentColor = '#0000ff'; // Blue piano
            if (e.key === '3') this.currentColor = '#ffff00'; // Yellow synth
            if (e.key === 'r' || e.key === 'R') this.toggleRecording();
            if (e.key === 'c' || e.key === 'C') this.clearCanvas();
            if (e.key === 's' || e.key === 'S') this.toggleSymmetry();
            if (e.key === 'g' || e.key === 'G') this.toggleGravityLoops();
        });
    }

    /**
     * Start drawing
     */
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    /**
     * Draw line and generate sound
     */
    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Feature 1: Pitch-on-Y
        const frequency = audioEngine.getPitchFromY(y, this.canvas.height);

        // Feature 4: Speed-Volume
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const volume = audioEngine.getVolumeFromSpeed(speed);

        // Apply waveform visualization
        const color = this.waveformBrush.getReactiveColor(this.currentColor);

        // Feature 7: Waveform Brush - Draw with vibration
        this.waveformBrush.drawWaveformStroke(this.ctx, this.lastX, this.lastY, x, y, color, 3);

        // Feature 3: Echo Trails
        const audioData = { frequency, volume, color: this.getColorName() };
        this.echoTrails.addTrail(this.lastX, this.lastY, x, y, color, audioData);

        // Feature 2: Color-Instrument - Play based on color
        audioEngine.playColorNote(this.getColorName(), frequency, 0.05, volume);

        // Feature 6: Symmetry Mode
        if (this.symmetryEnabled) {
            const mirroredLines = this.symmetryMode.mirrorLine(this.lastX, this.lastY, x, y);
            this.symmetryMode.drawMirroredLines(this.ctx, mirroredLines, color, 2);
            this.symmetryMode.playSymmetrySound(frequency, this.getColorName());
        }

        // Record event for looping
        this.recordLoop.recordEvent({
            type: 'draw',
            x1: this.lastX,
            y1: this.lastY,
            x2: x,
            y2: y,
            color: this.currentColor,
            frequency,
            volume
        });

        this.lastX = x;
        this.lastY = y;
    }

    /**
     * Stop drawing
     */
    stopDrawing() {
        this.isDrawing = false;
    }

    /**
     * Clear canvas with particles effect
     */
    clearCanvas() {
        // Feature 9: Shake to Clear - Particle effect
        this.shakeEffect();
    }

    /**
     * Shake effect - fade out and clear
     */
    shake() {
        // Create particle effect
        this.createParticleEffect();

        // Sound effect
        audioEngine.clearEffect();

        // Clear canvas
        setTimeout(() => {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.echoTrails.clear();
            this.gravityLoops.clear();
        }, 300);
    }

    /**
     * Create particle effect for clearing
     */
    createParticleEffect() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const particles = [];

        // Sample pixels and create particles
        for (let i = 0; i < 50; i++) {
            const randomIdx = Math.floor(Math.random() * (imageData.data.length / 4)) * 4;
            if (imageData.data[randomIdx + 3] > 50) {
                const pixelIdx = randomIdx / 4;
                const x = (pixelIdx % this.canvas.width);
                const y = Math.floor(pixelIdx / this.canvas.width);

                particles.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 2,
                    life: 1.0
                });
            }
        }

        // Draw particles falling
        this.drawParticles = particles;
    }

    /**
     * Toggle recording mode
     */
    toggleRecording() {
        const btn = document.getElementById('recordBtn');
        const status = document.getElementById('recordStatus');

        if (this.recordLoop.isRecording) {
            this.recordLoop.stopRecording();
            btn.classList.remove('recording');
            status.classList.add('hidden');
        } else {
            this.recordLoop.startRecording();
            btn.classList.add('recording');
            status.classList.remove('hidden');

            // Update status
            const interval = setInterval(() => {
                if (!this.recordLoop.isRecording) {
                    clearInterval(interval);
                    return;
                }
                const progress = this.recordLoop.getRecordingProgress();
                const remaining = Math.ceil((1 - progress) * 5);
                status.textContent = `Recording... ${remaining}s`;
            }, 100);
        }
    }

    /**
     * Toggle symmetry mode
     */
    toggleSymmetry() {
        this.symmetryEnabled = !this.symmetryEnabled;
        const btn = document.getElementById('symmetryToggle');
        btn.classList.toggle('active', this.symmetryEnabled);
    }

    /**
     * Toggle gravity loops
     */
    toggleGravityLoops() {
        this.gravityLoopsEnabled = !this.gravityLoopsEnabled;
        if (this.gravityLoopsEnabled) {
            // Add test magnetic point
            this.gravityLoops.addMagneticPoint(this.canvas.width / 2, this.canvas.height / 2);
        } else {
            this.gravityLoops.clear();
        }
    }

    /**
     * Toggle background vibe
     */
    toggleBackgroundVibe() {
        const isActive = this.backgroundVibe.toggle();
        const btn = document.getElementById('vibeToggle');
        btn.classList.toggle('active', isActive);
    }

    /**
     * Select color (cycle through options)
     */
    selectColor() {
        const colors = ['#0000ff', '#ff0000', '#ffff00'];
        const currentIdx = colors.indexOf(this.currentColor);
        this.currentColor = colors[(currentIdx + 1) % colors.length];
    }

    /**
     * Get color instrument name
     */
    getColorName() {
        if (this.currentColor === '#ff0000') return 'red';
        if (this.currentColor === '#ffff00') return 'yellow';
        return 'blue';
    }

    /**
     * Main animation loop
     */
    animate() {
        // Clear background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update features
        this.echoTrails.update(parseFloat(document.getElementById('decayAmount').value));
        this.backgroundVibe.update(this.ctx, this.canvas);

        // Draw features
        this.echoTrails.draw(this.ctx);

        // Draw gravity loops if enabled
        if (this.gravityLoopsEnabled) {
            this.gravityLoops.update();
            this.gravityLoops.draw(this.ctx);
        }

        // Draw particle effect
        if (this.drawParticles) {
            this.drawParticles = this.drawParticles.filter(p => {
                this.ctx.fillStyle = `rgba(255, 200, 100, ${p.life * 0.8})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.3; // Gravity
                p.life -= 0.02;

                return p.life > 0;
            });
        }

        // Replay recorded events if playing
        if (this.recordLoop.isPlaying) {
            const events = this.recordLoop.getPlaybackEvents();
            events.forEach(event => {
                if (event.type === 'draw') {
                    const color = this.waveformBrush.getReactiveColor(event.color);
                    this.waveformBrush.drawWaveformStroke(
                        this.ctx,
                        event.x1,
                        event.y1,
                        event.x2,
                        event.y2,
                        color,
                        2
                    );
                }
            });
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NeyralSync();
    window.neyralSync = app;
});
