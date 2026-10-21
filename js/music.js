'use strict';
// Chiptune arena tracks. 16 steps per bar; each part loops on its own length.
// Notes like A3 / C#4, '-' sustains, '.' rests. Drums: k kick, s snare, h hat, o open hat.
(function (KF) {
  const bar = (s) => s;
  KF.Music = {
    // Title / door select: temple courtyard, steady and a little mysterious (D minor pentatonic).
    temple: {
      bpm: 96,
      parts: [
        { wave: 'triangle', vol: 0.32, seq: bar('D2 - . D2 . . A1 - D2 - . D2 . . C2 -') + ' ' + bar('Bb1 - . Bb1 . . F1 - Bb1 - . C2 . . A1 -') },
        { wave: 'square', vol: 0.07, seq: 'D4 . F4 . A4 . F4 . D4 . F4 . G4 . A4 . C5 - A4 - G4 - F4 - G4 - - - . . . . D5 - C5 - A4 - G4 . A4 - F4 - G4 - D4 - . . . . . . . .' },
        { wave: 'square', vol: 0.035, seq: 'A4 D5 F5 D5 A4 D5 F5 D5 A4 D5 F5 D5 A4 D5 G5 D5 F4 Bb4 D5 Bb4 F4 Bb4 D5 Bb4 E4 A4 C5 A4 E4 A4 C#5 A4' },
        { drum: true, seq: 'k . h . s . h . k . h k s . h h' },
      ],
    },
    // Door 1: rooftop at dusk, driving E minor.
    rooftop: {
      bpm: 142,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'E2 E2 . E2 E3 . E2 . E2 E2 . E2 D3 . B2 . C2 C2 . C2 C3 . C2 . D2 D2 . D2 D3 . F#2 .' },
        { wave: 'square', vol: 0.075, seq: 'E4 - G4 - B4 - A4 G4 F#4 - - - D4 - E4 - G4 - B4 - E5 - D5 B4 A4 - - - . . . . C5 - B4 - G4 - E4 - G4 - A4 - B4 - D5 - E5 - - - F#5 - D5 - B4 - . . . . . .' },
        { wave: 'square', vol: 0.03, seq: 'B4 E5 G5 E5 B4 E5 G5 E5 B4 E5 G5 E5 B4 E5 A5 E5 C5 E5 G5 E5 C5 E5 G5 E5 D5 F#5 A5 F#5 D5 F#5 B5 F#5' },
        { drum: true, seq: 'k . h . s . h k k . h . s . h h k . h . s . h k k . k . s h s s' },
      ],
    },
    // Door 2: harbour at night, swinging G dorian.
    harbour: {
      bpm: 124,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'G2 - . G2 . D3 . G2 F2 - . F2 . C3 . F2 Eb2 - . Eb2 . Bb2 . Eb2 D2 - . A2 . D3 . F#2' },
        { wave: 'square', vol: 0.07, seq: 'G4 . Bb4 . D5 - C5 Bb4 A4 - F4 - . . . . F4 . A4 . C5 - Bb4 A4 G4 - D4 - . . . . Eb4 . G4 . Bb4 - A4 G4 F4 - G4 - A4 - Bb4 - A4 - - - F#4 - - - D4 - . . E4 F#4' },
        { wave: 'square', vol: 0.03, seq: 'D5 . G5 . D5 . G5 . C5 . F5 . C5 . F5 . Bb4 . Eb5 . Bb4 . Eb5 . A4 . D5 . F#5 . D5 .' },
        { drum: true, seq: 'k . . h s . . h k . k h s . . o' },
      ],
    },
    // Door 3: neon night market, fast C# minor arps.
    neon: {
      bpm: 156,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 A1 A2 A1 A2 A1 A2 A1 A2 E2 E3 E2 E3 E2 E3 E2 E3 B1 B2 B1 B2 G#1 G#2 G#1 G#2' },
        { wave: 'square', vol: 0.065, seq: 'G#4 - - - E4 - C#4 - E4 - G#4 - B4 - A4 - . . E4 - A4 - C#5 - B4 - A4 - G#4 - - - . . B4 - G#4 - E4 - G#4 - B4 - E5 - D#5 - - - C#5 - D#5 - E5 - D#5 - B4 - G#4 - - - . .' },
        { wave: 'square', vol: 0.035, seq: 'C#5 E5 G#5 E5 C#5 E5 G#5 E5 A4 C#5 E5 C#5 A4 C#5 E5 C#5 B4 E5 G#5 E5 B4 E5 G#5 E5 B4 D#5 F#5 D#5 G#4 C5 D#5 C5' },
        { drum: true, seq: 'k h h h s h k h k h k h s h h o' },
      ],
    },
    // Door 4: temple courtyard, koto-like A minor pentatonic over a taiko pulse.
    shrine: {
      bpm: 112,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'A1 . . A1 . . E2 . A1 . . A1 . . G1 . F1 . . F1 . . C2 . G1 . . G1 . . D2 .' },
        { wave: 'square', vol: 0.065, seq: 'A4 - C5 - E5 - D5 C5 A4 - - - G4 - A4 - C5 - D5 - E5 - G5 E5 D5 - - - . . . . F5 - E5 - D5 - C5 - D5 - E5 - A4 - - - . . G4 - A4 - C5 - D5 - C5 - A4 - - - . . . .' },
        { wave: 'square', vol: 0.03, seq: 'E5 A5 C6 A5 E5 A5 C6 A5 C5 F5 A5 F5 D5 G5 B5 G5' },
        { drum: true, seq: 'k . . k s . . . k . k . s . h h' },
      ],
    },
    // Door 5: the sky train, fast and relentless in D minor.
    train: {
      bpm: 168,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 F2 F3 G2 G3 G2 G3 A1 A2 C#2 C#3' },
        { wave: 'square', vol: 0.065, seq: 'D5 - A4 - D5 - F5 - E5 - D5 - C5 - A4 - Bb4 - - - C5 - - - D5 - E5 - F5 - G5 - A5 - - - G5 F5 E5 - D5 - E5 - F5 - - - E5 - C#5 - A4 - - - . . . . . .' },
        { wave: 'square', vol: 0.03, seq: 'A5 F5 D5 F5 A5 F5 D5 F5 F5 D5 Bb4 D5 G5 E5 C5 E5' },
        { drum: true, seq: 'k h s h k k s h k h s h k k s s' },
      ],
    },
    // Street fights: punchy and up-tempo.
    fight: {
      bpm: 150,
      parts: [
        { wave: 'triangle', vol: 0.34, seq: 'A1 A1 A2 A1 . A1 G2 A1 A1 A1 A2 A1 C2 . D2 E2 F1 F1 F2 F1 . F1 E2 F1 G1 G1 G2 G1 B1 . D2 E2' },
        { wave: 'square', vol: 0.06, seq: 'E5 - - A4 C5 - E5 - D5 - C5 - A4 - - - E5 - - A4 C5 - G5 - F5 - E5 - D5 - - - F5 - - C5 E5 - A5 - G5 - F5 - E5 - D5 - G5 - - D5 G5 - B5 - A5 - G5 - E5 - - -' },
        { drum: true, seq: 'k h s h k k s h k h s h k h s s' },
      ],
    },
    // Bosses: heavier, minor, relentless.
    boss: {
      bpm: 138,
      parts: [
        { wave: 'sawtooth', vol: 0.12, seq: 'D2 D2 D3 D2 D2 D3 C3 D3 D2 D2 D3 D2 F2 E2 C2 A1 Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 A2 Bb2 A1 A1 A2 A1 C#2 E2 A2 C#3' },
        { wave: 'square', vol: 0.06, seq: 'D5 - - - A4 - D5 - F5 - E5 - D5 - C5 - D5 - - - A4 - F5 - G5 - A5 - G5 - F5 - Bb5 - - - A5 - G5 - F5 - - - E5 - - - A5 - - - G5 - E5 - C#5 - - - A4 - - -' },
        { drum: true, seq: 'k k s h k k s h k k s h k s s s' },
      ],
    },
    // Realm 6: spring valley, gentle and bright (D major pentatonic).
    sakura: {
      bpm: 104,
      parts: [
        { wave: 'triangle', vol: 0.32, seq: 'D2 . A2 . D3 . A2 . B1 . F#2 . B2 . F#2 . G1 . D2 . G2 . D2 . A1 . E2 . A2 . C#3 .' },
        { wave: 'square', vol: 0.06, seq: 'F#5 - E5 - D5 - B4 - A4 - - - B4 - D5 - E5 - F#5 - A5 - F#5 - E5 - - - . . D5 - E5 - F#5 - E5 - D5 - B4 - A4 - B4 - D5 - - - E5 - - - . . . .' },
        { wave: 'square', vol: 0.028, seq: 'A5 D6 F#5 A5 D6 F#5 A5 D6 B5 F#5 D6 B5 F#5 D6 B5 F#5' },
        { drum: true, seq: 'k . h . s . h . k h . . s . h .' },
      ],
    },
    // Realm 7: the frozen north, a stomping war march in E minor.
    viking: {
      bpm: 118,
      parts: [
        { wave: 'sawtooth', vol: 0.11, seq: 'E2 . E2 . E2 . G2 . D2 . D2 . D2 . F#2 . C2 . C2 . C2 . E2 . B1 . B1 . D2 . F#2 .' },
        { wave: 'square', vol: 0.065, seq: 'E4 - - - G4 - B4 - A4 - G4 - F#4 - - - D4 - - - F#4 - A4 - G4 - F#4 - E4 - - - C5 - - - B4 - A4 - G4 - - - F#4 - - - B4 - - - A4 - G4 - F#4 - - - . . . .' },
        { drum: true, seq: 'k . . . s . k . k . . . s . s s' },
      ],
    },
  };
})(window.KF);
