/**
 * Feature 9: Shake to Clear
 * Detect device shake (or button press) to trigger "magic slate" effect
 */

class ShakeDetector {
    constructor() {
        this.isSupported = 'DeviceMotionEvent' in window;
        this.threshold = 25; // Acceleration threshold
        this.lastShakeTime = 0;
        this.shakeDebounce = 1000; // ms between shakes
        this.onShake = null;

        if (this.isSupported) {
            window.addEventListener('devicemotion', (e) => this.handleDeviceMotion(e));
        }
    }

    /**
     * Handle device motion for shake detection
     */
    handleDeviceMotion(event) {
        const acc = event.acceleration;
        if (!acc) return;

        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        const acceleration = Math.sqrt(x * x + y * y + z * z);

        if (acceleration > this.threshold) {
            this.triggerShake();
        }
    }

    /**
     * Trigger shake effect
     */
    triggerShake() {
        const now = Date.now();
        if (now - this.lastShakeTime < this.shakeDebounce) {
            return;
        }

        this.lastShakeTime = now;

        if (this.onShake) {
            this.onShake();
        }
    }

    /**
     * Request permission for iOS 13+
     */
    requestPermission() {
        if (typeof DeviceMotionEvent === 'undefined') {
            console.log('DeviceMotionEvent not supported');
            return Promise.resolve(false);
        }

        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            return DeviceMotionEvent.requestPermission()
                .then(permission => {
                    return permission === 'granted';
                })
                .catch(() => false);
        } else {
            // Non-iOS 13+ devices
            return Promise.resolve(true);
        }
    }
}

window.ShakeDetector = ShakeDetector;
