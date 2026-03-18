# Getting Started with NeyralSync

## Quick Start

### Option 1: Direct File Opening (Not Recommended)
Simply opening `index.html` in a browser may have limitations with Web Audio API due to browser security restrictions.

### Option 2: Local HTTP Server (Recommended)

#### Using Python 3:
```bash
cd "path/to/NeyralSync"
python -m http.server 8000
```
Then open: `http://localhost:8000`

#### Using Python 2:
```bash
cd "path/to/NeyralSync"
python -m SimpleHTTPServer 8000
```
Then open: `http://localhost:8000`

#### Using Node.js:
```bash
npm install -g http-server
cd "path/to/NeyralSync"
http-server
```
Then open: `http://localhost:8080`

#### Using PHP:
```bash
cd "path/to/NeyralSync"
php -S localhost:8000
```
Then open: `http://localhost:8000`

## First Time Using NeyralSync

1. **Allow Motion Permission** (Mobile only)
   - Click the canvas once
   - Grant accelerometer/motion permission when prompted

2. **Explore Colors**
   - Right-click or long-press to cycle through colors
   - Try drawing with each: Red (bass), Blue (piano), Yellow (synth)

3. **Experience Pitch-on-Y**
   - Draw at the top = high notes
   - Draw at the bottom = low bass notes

4. **Try Speed Control**
   - Draw slowly = soft, gentle tones
   - Draw quickly = loud, bright sounds

5. **Enable Symmetry Mode**
   - Press `S` or click the symmetry button
   - Draw one line and watch it mirror in 4 directions
   - Hear the harmonic chord generated

6. **Record & Loop**
   - Press `R` or click record button
   - Draw or interact with the canvas
   - After 5 seconds, your creation loops!

## Troubleshooting

### No Sound?
- Check browser DevTools console for errors (F12)
- Ensure volume is on and not muted
- Try a different browser
- Some browsers restrict audio - try Chrome or Firefox

### Motion/Shake Not Working?
- Event is mobile-only (iOS/Android)
- Must grant permission when prompted
- Works best on newer devices

### Performance Issues?
- Reduce decay slider value (shorter trails)
- Disable Background Vibe
- Disable Gravity Loops
- Clear canvas more frequently
- Close other browser tabs

### Canvas Not Responsive?
- Try refreshing the page
- Check that server is running (HTTP, not file://)
- Try a different browser

## Advanced Tips

### Audio Synthesis
- Red color = square wave (digital, harsh)
- Blue color = sine wave (smooth, pure)
- Yellow color = triangle wave (bright, rich)

### Creating Patterns
1. Enable Symmetry Mode (`S`)
2. Slowly draw diagonal lines from center
3. Adjust Decay slider for effect length
4. Record the results (`R`)
5. Layer multiple loops

### Ambient Sound Design
- Keep canvas mostly empty = deep, sparse tones
- Fill canvas gradually = richer, fuller ambient sound
- Watch the "Background Vibe" update in real-time

## Browser Recommendations

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ | Best support |
| Firefox | ✅ | ✅ | Good performance |
| Safari | ✅ | ✅ | iOS 14.1+ required |
| Edge | ✅ | - | Chromium-based |

## File Sizes

- index.html: ~5 KB
- styles.css: ~4 KB
- JS modules: ~30 KB total
- **Total**: ~40 KB (very lightweight!)

## Customization Ideas

### Modify Colors
Edit `js/audio-engine.js` `colorInstruments` object:
```javascript
this.colorInstruments = {
    red: { type: 'square', freq: 110 },
    blue: { type: 'sine', freq: 440 },
    yellow: { type: 'triangle', freq: 880 }
};
```

### Change Record Duration
In `js/record-loop.js`, modify:
```javascript
this.recordDuration = 5000; // milliseconds
```

### Adjust Shake Sensitivity
In `js/shake-detector.js`:
```javascript
this.threshold = 25; // Higher = less sensitive
```

## Support

For issues or questions:
1. Check the main README.md
2. Review console errors (F12 in browser)
3. Test in a different browser
4. Ensure server is running (not file:// protocol)

Enjoy making music with NeyralSync! 🎵✨
