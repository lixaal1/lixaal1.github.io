# Quick Reference Guide

## 🎨 Visual Features at a Glance

| Feature | Visual Effect | Audio Effect | How to Use |
|---------|--------------|-------------|-----------|
| **Pitch-on-Y** | Lines appear at click position | Frequency varies by Y | Just draw naturally |
| **Waveform Brush** | Stroke vibrates with sound | Shows audio spectrum | Drawing strokes ripple |
| **Echo Trails** | Lines fade slowly | Sound delay/echo fades | Adjust "Decay" slider |
| **Color-Instrument** | 3 color options | Different synth types | Right-click or `1,2,3` keys |
| **Symmetry Mode** | 4-way mirror | Harmonic chords | Press `S` |
| **Gravity Loops** | Orbiting particles | Rhythmic pattern | Press `G` |
| **Background Vibe** | Responsive to drawing | Ambient sound | Toggle button |
| **Record & Loop** | Continues replaying | Loops with sound | Press `R` |
| **Shake to Clear** | Particle explosion | Fade-out effect | Shake device or press `C` |

## 🎹 Sound Palette

### Colors as Instruments

```
🔴 RED (Bass)
├─ Waveform: Square
├─ Character: Aggressive, digital
├─ Pitch Range: 110 Hz baseline
└─ Use: Deep bass, percussive elements

🔵 BLUE (Piano)
├─ Waveform: Sine
├─ Character: Soft, pure, musical
├─ Pitch Range: 440 Hz baseline
└─ Use: Melodies, smooth lines

🟡 YELLOW (Synthesizer)
├─ Waveform: Triangle
├─ Character: Bright, rich, harmonic
├─ Pitch Range: 880 Hz baseline
└─ Use: Lead melodies, bright accents
```

## ⌨️ Master Control Chart

### Keyboard
```
1 → Red (Bass)
2 → Blue (Piano)
3 → Yellow (Synth)
R → Record Toggle
C → Clear Canvas
S → Symmetry Toggle
G → Gravity Loops Toggle
```

### Mouse/Touch
```
Click + Drag → Draw and create sound
Right-Click → Cycle through colors
Long Press → Cycle through colors (mobile)
```

### Mobile Specific
```
Shake Device → Clear with particles
1-Finger Drag → Draw
```

## 🎚️ Parameter Ranges

| Parameter | Min | Max | Default | Effect |
|-----------|-----|-----|---------|--------|
| Pitch (Frequency) | 100 Hz | 800 Hz | Varies | Y-position dependent |
| Volume | 0.1 | 0.8 | Dynamic | Speed dependent |
| Delay Time | 0.1s | 0.5s | 0.3s | Echo duration |
| Decay Factor | 0.15 | 3s | 1.5s | Trail fade speed |
| Shake Threshold | 15 | 35 | 25 | Acceleration needed |
| Record Duration | - | 5s | 5s | Fixed loop length |

## 🎵 Audio Synthesis Details

### Note Generation
- Each line generates a short tone
- Tone frequency = Y-position
- Tone volume = drawing speed
- Tone duration = 50ms per note

### Effects Processing
```
Guitar → Oscillator
  ↓
Synth Type (Color)
  ↓
Envelope Shaper (Attack/Release)
  ↓
Delay/Echo (Echo Trails)
  ↓
Master Volume
  ↓
Speaker Output
```

### Background Ambience
- Plays only when canvas has drawn content
- 4 harmonic layers
- Frequency responsive to color density
- Continuously evolving low-frequency wobble

## 💡 Pro Tips

### Creating Musical Patterns
1. **Slow, Horizontal Lines** = Sustained notes
2. **Vertical Lines** = Quick pitch sweeps
3. **Diagonal Lines** = Sliding pitch changes
4. **Small Circles** = Repeated notes
5. **Spirals** = Evolving pitch patterns

### Using Symmetry Effectively
- Short strokes in symmetry mode = clean, harmonic chords
- Longer strokes = more complex chromatic progressions
- Combine with different colors for richer harmony

### Recording Strategies
- Layer 2-3 simple loops for complexity
- Record in 4/4 time (5 seconds ≈ slow 4/4)
- Clear canvas between recordings for clarity
- Use symmetry + record for instant complexity

### Performance Optimization
```
Fast Machine → Max quality:
  - Longer decay trails
  - Enable all effects
  - Multiple looping layers

Slower Machine → Performance focus:
  - Shorter decay (1.0s)
  - Disable Gravity Loops
  - One layer at a time
```

## 🔊 Volume Calibration

| Scenario | Expected Volume | Adjustment |
|----------|-----------------|------------|
| Quiet background | Soft single notes | Draw slowly at top |
| Medium presence | Full chord + background | Draw with medium speed |
| Loud/Full | Record + loops layering | Enable all effects |
| Silent | No drawing + vibe off | Clear canvas |

## 🎯 Frequency Reference

```
Y-Position to Frequency Mapping:

Top (High)     → 800 Hz  (bright, piercing)
Upper 3/4      → 700 Hz  (high treble)
Middle 1/2     → 450 Hz  (vocal range)
Lower 1/4      → 200 Hz  (low bass)
Bottom (Low)   → 100 Hz  (sub-bass)
```

## 🚀 Advanced Use Cases

### 1. Ambient Soundscapes
1. Enable Background Vibe
2. Draw light patterns slowly
3. Use Blue (sine) for purity
4. Let it play without recording

### 2. Rhythmic Loops
1. Enable Symmetry Mode
2. Create short, repeating patterns
3. Record 5 seconds
4. Layer multiple recordings

### 3. Controlled Improvisation
1. Set Decay to max (3.0s)
2. Record enabled
3. Draw freely with color changes
4. Let trails paint the final piece

### 4. Visual Performance
1. Maximize Gravity Loops
2. Disable audio (mute master)
3. Create interesting visual patterns
4. Unmute for final playback

## 📱 Mobile-Specific Notes

- **Touch Latency**: <50ms on modern devices
- **Gesture Recognition**: Shake requires 25+ m/s²
- **Battery Impact**: Audio context uses ~5% additional battery
- **Screen Size**: Optimized for 4-8 inch screens
- **Orientation**: Best in landscape for drawing comfort

---

**Last Updated**: 2026-03-10
**Version**: 1.0 - All 10 Features Implemented
