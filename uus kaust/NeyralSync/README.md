# NeyralSync - Interactive Audio-Visual Instrument

An interactive web application that combines drawing with real-time sound generation, creating a unique audio-visual experience.

## Features

### 1. **Pitch-on-Y** 🎵
Draw higher on the screen for higher pitches, lower for deeper bass notes. The Y-position directly controls the frequency of generated sound.

### 2. **Color-Instrument** 🎹
Each color is a different instrument:
- **🔴 Red** - Aggressive bass (square wave)
- **🔵 Blue** - Soft piano sound (sine wave)
- **🟡 Yellow** - Bright synthesizer (triangle wave)

Switch colors with:
- Right-click / long-press on canvas
- Keyboard: `1` (Red), `2` (Blue), `3` (Yellow)

### 3. **Echo Trails** 🌊
Lines on your screen fade slowly and beautifully. The sound delay and echo decay together with the visual trails. Adjust with the "Decay" slider.

### 4. **Speed-Volume** 💨
The faster you move your cursor, the louder and sharper the sound becomes. Quick gestures create punchy sounds!

### 5. **Gravity Loops** 🌀
*Magnetic points with orbiting audio particles* (Activate with `G` key)
- Place "magnetic points" on the canvas
- Particles orbit around them in rhythmic patterns
- Each particle generates synchronized sound

### 6. **Symmetry Mode** ↔️
*Mirror your drawing in 4 directions* (Toggle with `S` or "↔ Symmetry" button)
- Draw one line, it automatically mirrors horizontally, vertically, and diagonally
- Creates complex visual patterns
- Generates harmonic chords from the mirrored positions

### 7. **Waveform Brush** 〰️
The brush stroke itself visualizes a live audio oscillogram. The stroke vibrates along with the sound you're creating, creating a unique reactive drawing experience.

### 8. **Record & Loop** ⏺️
*Capture and loop your creation* (Click "⏺ Record & Loop" or press `R`)
- Records 5 seconds of your drawing and sound
- Automatically plays back in a continuous loop
- Perfect for building up complex layered pieces

### 9. **Shake to Clear** ✨
*Magic slate effect* - Everything falls apart!
- **Mobile**: Shake your device to clear
- **Desktop**: Click the "✨ Clear" button or press `C`
- Animated particle effect with sound fade

### 10. **Background Vibe** 🎵
*Atmospheric ambient sound* (Toggle with "🎵 Background Vibe" button)
- Generates atmospheric background sound
- Sound evolves based on how much "color" is on the screen
- More drawings = richer, fuller sound

## Controls

### Drawing
- **Mouse/Touch**: Click and drag to draw
- **Right-click**: Change color

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1` | Red instrument (Bass) |
| `2` | Blue instrument (Piano) |
| `3` | Yellow instrument (Synth) |
| `R` | Toggle Record & Loop |
| `C` | Clear canvas |
| `S` | Toggle Symmetry Mode |
| `G` | Toggle Gravity Loops |

### UI Controls
- **⏺ Record & Loop** - Start/stop recording (5 seconds)
- **✨ Clear** - Clear canvas with particle effect
- **↔ Symmetry** - Toggle 4-way mirror mode
- **🎵 Background Vibe** - Toggle ambient sound
- **Delay slider** - Control echo delay amount (0-100%)
- **Decay slider** - Control how long trails fade (0.5-3s)

## Audio Effects

### Delay (Echo Trails)
Adjust how much the sound echoes and bounces around. Higher values create more atmosphere.

### Decay
Control how quickly the visual trails and sound echo fade away. Higher values = longer trails.

## Technical Details

- **Language**: Vanilla JavaScript
- **Audio API**: Web Audio API
- **Graphics**: HTML5 Canvas
- **Responsive**: Works on desktop and mobile browsers
- **Touch Support**: Full touch support + device motion (shake detection)

## Browser Compatibility

- Chrome/Edge 40+
- Firefox 25+
- Safari 14.1+
- Mobile browsers (iOS Safari, Chrome Mobile)

### On iOS
Grant motion permission when prompted to use shake-to-clear feature.

## Performance Tips

1. Use lower decay values for longer trails with better performance
2. Reduce symmetry mode layering if performance suffers
3. Clear canvas regularly to maintain smooth animation
4. Disable Background Vibe if running on lower-end devices

## Tips for Creating Interesting Sounds

1. **Slow, deliberate movements** = musical, sustained notes
2. **Fast, jerky movements** = punchy, loud sounds
3. **Bottom half of screen** = deep bass tones
4. **Top half of screen** = high-pitched melodies
5. **Use Symmetry Mode** = create complex chords instantly
6. **Record & Loop** = layer multiple loops for complex compositions

## File Structure

```
NeyralSync/
├── index.html                 # Main HTML file
├── styles.css                 # Styling
└── js/
    ├── main.js               # Application core
    ├── audio-engine.js       # Web Audio API wrapper
    ├── echo-trails.js        # Echo Trails feature
    ├── symmetry-mode.js      # Symmetry Mode feature
    ├── gravity-loops.js      # Gravity Loops feature
    ├── waveform-brush.js     # Waveform Brush visualization
    ├── background-vibe.js    # Background ambient sound
    ├── record-loop.js        # Record & Loop feature
    └── shake-detector.js     # Shake detection
```

## License

Open source - feel free to modify and share!

## Credits

Created as an experimental audio-visual instrument combining generative sound with interactive drawing.
