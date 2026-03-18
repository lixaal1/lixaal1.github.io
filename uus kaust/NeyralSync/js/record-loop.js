/**
 * Feature 8: Record & Loop
 * Record 5 seconds of drawing and replay it in a loop
 */

class RecordLoop {
    constructor() {
        this.isRecording = false;
        this.recordedEvents = [];
        this.recordDuration = 5000; // 5 seconds in milliseconds
        this.isPlaying = false;
        this.playbackStartTime = 0;
        this.recordStartTime = 0;
    }

    /**
     * Start recording
     */
    startRecording() {
        this.recordedEvents = [];
        this.isRecording = true;
        this.recordStartTime = Date.now();
        this.isPlaying = false;

        // Auto-stop after duration
        setTimeout(() => {
            if (this.isRecording) {
                this.stopRecording();
            }
        }, this.recordDuration);
    }

    /**
     * Stop recording
     */
    stopRecording() {
        this.isRecording = false;
        if (this.recordedEvents.length > 0) {
            this.startPlayback();
        }
    }

    /**
     * Record a drawing event
     */
    recordEvent(event) {
        if (!this.isRecording) return;

        const elapsed = Date.now() - this.recordStartTime;
        if (elapsed > this.recordDuration) {
            this.stopRecording();
            return;
        }

        this.recordedEvents.push({
            ...event,
            timestamp: elapsed
        });
    }

    /**
     * Start playback loop
     */
    startPlayback() {
        this.isPlaying = true;
        this.playbackStartTime = Date.now();
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.isPlaying = false;
    }

    /**
     * Get current playback events
     */
    getPlaybackEvents() {
        if (!this.isPlaying || this.recordedEvents.length === 0) {
            return [];
        }

        const elapsed = (Date.now() - this.playbackStartTime) % this.recordDuration;
        const currentEvents = this.recordedEvents.filter(e => {
            return e.timestamp <= elapsed && e.timestamp > (elapsed - 16); // ~16ms frame
        });

        return currentEvents;
    }

    /**
     * Check if currently recording
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * Get recording progress (0-1)
     */
    getRecordingProgress() {
        if (!this.isRecording) return 0;

        const elapsed = Date.now() - this.recordStartTime;
        return Math.min(elapsed / this.recordDuration, 1);
    }

    /**
     * Clear recorded events
     */
    clear() {
        this.recordedEvents = [];
        this.isPlaying = false;
    }
}

window.RecordLoop = RecordLoop;
