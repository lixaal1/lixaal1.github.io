# NeyralSync - Windows Quick Start

## 🚀 Get Running in 2 Minutes

### Step 1: Start the Server

Open **Command Prompt** (or PowerShell) and run:

```cmd
cd "c:\Users\user\Documents\NPMM25\My Work\uus kaust\NeyralSync"
python -m http.server 8000
```

You should see:
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

### Step 2: Open in Browser

Click this link or paste in your browser:
```
http://localhost:8000
```

### Step 3: Start Drawing! 🎨

That's it! You're ready to create.

---

## 🎮 Basic Controls

### Drawing
- **Left Mouse + Drag** → Draw and make sound
- **Right-Click** → Change color

### Keyboard Shortcuts
```
1 = Red (Bass)
2 = Blue (Piano)  
3 = Yellow (Synth)
S = Symmetry Mode
R = Record & Loop
C = Clear Canvas
G = Gravity Loops
```

### On-Screen Buttons
- ⏺ **Record & Loop** - Start recording
- ✨ **Clear** - Clear canvas
- ↔ **Symmetry** - Mirror mode
- 🎵 **Background Vibe** - Ambient sound

---

## ⚡ Keyboard Shortcuts Reference

| Key | What It Does |
|-----|-------------|
| **1** | Red instrument (aggressive bass) |
| **2** | Blue instrument (soft piano) |
| **3** | Yellow instrument (bright synth) |
| **R** | Start/stop 5-second recording |
| **C** | Clear canvas with animation |
| **S** | Toggle 4-way symmetry mode |
| **G** | Toggle gravity loops |

---

## 🎵 Three Awesome Ways to Use It

### 1. Quick Experiment (30 seconds)
1. Just draw on the canvas
2. Slow = quiet, Fast = loud
3. Top = high notes, Bottom = low notes
4. Enjoy the instant feedback!

### 2. Create a Loop (2 minutes)
1. Press **R** to start recording
2. Draw patterns for 5 seconds
3. It automatically loops!
4. Press **R** again to record a new layer

### 3. Build a Composition (5 minutes)
1. Enable Symmetry (**S** key)
2. Draw simple shapes
3. Enable Background Vibe (button)
4. Record layers (**R** key)
5. Mix and enjoy!

---

## 🎹 The 3 Instruments

### 🔴 RED - Bass (Digital & Aggressive)
- Square wave sound
- Perfect for: Punchy rhythms, bass lines
- How to use: Draw with red color selected
- Sound: Harsh, digital, like 8-bit music

### 🔵 BLUE - Piano (Soft & Musical)
- Sine wave sound
- Perfect for: Melodies, smooth lines
- How to use: Press **2** or right-click to select
- Sound: Pure, musical, like a piano or violin

### 🟡 YELLOW - Synth (Bright & Rich)
- Triangle wave sound
- Perfect for: High notes, bright accents
- How to use: Press **3** or right-click to select
- Sound: Bright, shiny, modern and electronic

---

## 🎨 Y-Position Controls Pitch

```
Top of Screen     → HIGH PITCHES (800 Hz - bright!)
                  → 
                  → 
Middle of Screen  → MEDIUM PITCHES (450 Hz - normal)
                  → 
                  → 
Bottom of Screen  → LOW PITCHES (100 Hz - deep bass!)
```

**Try This**: Draw a vertical line from top to bottom. You'll hear the pitch slide from high to low!

---

## 💨 Speed Controls Volume

```
Slow Drawing (1 inch/second)    → QUIET (volume 0.1-0.2)
Medium Drawing (3 inch/second)  → NORMAL (volume 0.4-0.6)
Fast Drawing (5+ inch/second)   → LOUD (volume 0.7-0.8)
```

**Try This**: Draw slowly for quiet tones, then quickly for loud punchy sounds!

---

## 🎯 Feature Highlights

### ↔ Symmetry Mode (Press S)
Draw one line → Automatically mirrors in 4 directions
Perfect for creating instant patterns!

### ⏺ Record & Loop (Press R)
Records everything for 5 seconds → Loops forever
Layer multiple recordings for complex music!

### 🌊 Echo Trails
Lines fade away slowly
Sound echo also fades
Adjust with "Decay" slider

### ✨ Clear Canvas (Press C)
Deletes everything with cool particle effect
Sound fades smoothly too!

### 🎵 Background Vibe (Click Button)
Atmospheric background sound
More drawing = Richer sound
Perfect for ambient vibes!

---

## 🔧 If You Have Problems

### No Sound?
1. Check Windows volume (bottom right corner)
2. Unmute browser in Volume Mixer (if it's muted)
3. Refresh page (F5)
4. Try different browser (Chrome is best)

### Drawing Lags?
1. Make sure using http://localhost (not file://)
2. Close other browser tabs
3. Clear canvas (press C)
4. Refresh page

### Server Won't Start?
1. Make sure Python is installed: `python --version`
2. Check folder path is correct
3. Try: `cd C:\Users\%USERNAME%\Documents\NPMM25\My Work\uus kaust\NeyralSync`
4. If still stuck → Try Node.js method below

### Alternative: Using Node.js
If Python isn't working:

1. Install Node.js from nodejs.org (if you don't have it)
2. Open Command Prompt and run:
```cmd
npm install -g http-server
cd "c:\Users\user\Documents\NPMM25\My Work\uus kaust\NeyralSync"
http-server
```

---

## 📋 Full Feature List

✅ **Pitch-on-Y** - Frequency follows Y position
✅ **Color-Instrument** - 3 different synth types
✅ **Echo Trails** - Fading lines with delay
✅ **Speed-Volume** - Faster = Louder
✅ **Gravity Loops** - Orbiting particles
✅ **Symmetry Mode** - 4-way mirror drawing
✅ **Waveform Brush** - Strokes react to audio
✅ **Record & Loop** - 5-second looping
✅ **Shake to Clear** - Particle clearing effect
✅ **Background Vibe** - Ambient atmosphere

---

## 🎓 Tips for Great Sounds

### Beautiful Melodies
1. Use **Blue** color (sine wave)
2. Draw smooth, curved lines
3. Don't move too fast
4. Try drawing in the middle height area

### Powerful Bass Lines
1. Use **Red** color (square wave)
2. Draw in the **bottom half** of screen
3. Make a steady rhythm
4. Draw fast for impact

### Bright, Shiny Sounds
1. Use **Yellow** color (triangle wave)
2. Draw in the **top half** of screen
3. Make quick, sharp movements
4. Perfect for accents and highlights

### Complex Compositions
1. Enable **Symmetry Mode** (Press S)
2. Draw simple shapes
3. Press **R** to record
4. Draw different shapes on top
5. Layer 2-3 recordings for richness

---

## 🎮 Keyboard Shortcut Cheat Sheet

Pin this or screencap it!

```
COLORS:     1=Red  2=Blue  3=Yellow
FEATURES:   S=Symmetry  R=Record  C=Clear  G=Gravity
```

---

## 📖 More Documentation

For more details:
- **README.md** - Full feature guide
- **QUICK_REFERENCE.md** - All commands
- **GETTING_STARTED.md** - Detailed setup
- **TESTING_CHECKLIST.md** - Verify everything works

---

## 🚨 Common Issues Chart

| Problem | Solution |
|---------|----------|
| No sound | Check volume, refresh, try Chrome |
| Lag/stuttering | Close tabs, lower decay, clear canvas |
| Server won't start | Check Python installed, correct path |
| Motion library not found | Make sure index.html imports all js files |
| Blank/white canvas | Wait 2 seconds for load, refresh page |

---

## 🎉 You're Ready!

Everything is installed and working. Just:

1. Run: `python -m http.server 8000`
2. Visit: `http://localhost:8000`
3. Start Drawing! 🎨🎵

---

**Happy Creating! 🎵✨**

**Version**: Windows Quick Start
**Updated**: March 10, 2026
