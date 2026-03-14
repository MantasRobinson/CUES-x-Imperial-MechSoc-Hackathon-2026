/**
 * phonebox.ino — PhoneBox Arduino Firmware (buttonless)
 *
 * Session lifecycle is fully automatic via the HC-SR04:
 *   • Phone placed in box  (distance < PHONE_PRESENT_CM for PRESENT_TICKS polls)
 *       → SESSION_START
 *   • Phone briefly removed (< SESSION_END_TICKS polls) → disturbance counted
 *   • Phone gone for SESSION_END_TICKS consecutive polls  → SESSION_END
 *
 * MATLAB can also send 'START' or 'STOP' over Serial to override at any time.
 *
 * Hardware:
 *   HC-SR04  TRIG → D9  |  ECHO → D10   (D9/D10 use Timer1, avoids millis() clash)
 *   KY-037   AO   → A0
 *   LED            → D13 (built-in, ON during session)
 *
 * Serial protocol (9600 baud, newline-terminated):
 *   Arduino → PC   PHONEBOX_READY
 *   Arduino → PC   SESSION_START
 *   Arduino → PC   SESSION_END,<durationSec>,<disturbanceCount>,<noiseCode>
 *                  noiseCode: 0=Quiet  1=Moderate  2=Loud
 *   PC      → Arduino  START   (force-start a session)
 *   PC      → Arduino  STOP    (force-end a session)
 */

// ── Pin assignments ────────────────────────────────────────────────────────────
// D9/D10 are on Timer1 — avoids interference with millis() which uses Timer0
// Pins swapped here to match physical wiring (TRIG wire on D10, ECHO wire on D9)
#define TRIG_PIN     10
#define ECHO_PIN     9
#define SOUND_PIN    A0
#define LED_PIN      13

// ── Thresholds ────────────────────────────────────────────────────────────────
// Phone is considered PRESENT when distance is below this (cm)
#define PHONE_PRESENT_CM       10

// Consecutive polls needed to confirm phone placed (avoids false triggers)
#define PRESENT_TICKS           4   // 4 × 500 ms = 2 s

// Consecutive absent polls before a disturbance is logged
#define DISTURBANCE_TICKS       3   // 3 × 500 ms = 1.5 s

// Consecutive absent polls before the session automatically ends
#define SESSION_END_TICKS      10   // 10 × 500 ms = 5 s

// Sound peak-to-peak amplitude thresholds (0–1023 range).
// KY-037 AO is a raw AC mic signal centred ~512 — use peak-to-peak, not average.
// Calibrate by watching phonebox_debug output while making noise.
#define SOUND_SAMPLE_MS       200   // longer window → more stable peak-to-peak
#define SOUND_QUIET_MAX        20   // amplitude below this → Quiet
#define SOUND_LOUD_MIN         50   // amplitude above this → Loud (tune if needed)
#define SOUND_EMA_ALPHA         6   // EMA weight on new sample (out of 10); higher = faster response

// Poll interval (ms)
#define POLL_MS               500

// ── State machine ─────────────────────────────────────────────────────────────
enum State { WAITING, ACTIVE };
static State state = WAITING;

static unsigned long sessionStartMs   = 0;
static int           disturbanceCount = 0;

// Ticks counting consecutive present/absent sensor readings
static int           presentTicks     = 0;
static int           absentTicks      = 0;
static bool          disturbanceOpen  = false; // disturbance started, not yet closed

// Sound accumulator
static unsigned long soundSum         = 0;
static unsigned long soundSamples     = 0;

static unsigned long lastPollMs       = 0;
static bool          debugMode        = false;
static int           smoothedAmp      = 0;   // EMA-smoothed sound amplitude

// ── Helpers ───────────────────────────────────────────────────────────────────
float readDistanceCm() {
  // Ensure TRIG starts LOW
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);
  // Fire 10 µs pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Wait up to 38 ms for echo (covers ~650 cm max range)
  unsigned long us = pulseIn(ECHO_PIN, HIGH, 38000UL);
  return (us == 0) ? 999.0f : us * 0.01715f;
}

// Peak-to-peak amplitude of the KY-037 mic signal over SOUND_SAMPLE_MS.
// Returns 0–1023; larger = louder. Works correctly because mic AO is AC.
int readSoundAmplitude() {
  unsigned long start = millis();
  int hi = 0, lo = 1023;
  while (millis() - start < SOUND_SAMPLE_MS) {
    int v = analogRead(SOUND_PIN);
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  int raw = hi - lo;
  // Exponential moving average to smooth out poll-to-poll noise
  // smoothed = (alpha * raw + (10 - alpha) * prev) / 10
  smoothedAmp = (SOUND_EMA_ALPHA * raw + (10 - SOUND_EMA_ALPHA) * smoothedAmp) / 10;
  return smoothedAmp;
}

void beginSession() {
  state             = ACTIVE;
  sessionStartMs    = millis();
  disturbanceCount  = 0;
  absentTicks       = 0;
  disturbanceOpen   = false;
  soundSum          = 0;
  soundSamples      = 0;
  digitalWrite(LED_PIN, HIGH);
  Serial.println("SESSION_START");
}

void finishSession() {
  state = WAITING;
  digitalWrite(LED_PIN, LOW);
  presentTicks = 0;

  unsigned long durationSec = (millis() - sessionStartMs) / 1000UL;

  int noiseCode = 1;
  if (soundSamples > 0) {
    unsigned long avg = soundSum / soundSamples;
    if      (avg < SOUND_QUIET_MAX) noiseCode = 0;
    else if (avg > SOUND_LOUD_MIN)  noiseCode = 2;
  }

  Serial.print("SESSION_END,");
  Serial.print(durationSec);
  Serial.print(",");
  Serial.print(disturbanceCount);
  Serial.print(",");
  Serial.println(noiseCode);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN,  OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("PHONEBOX_READY");
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  // ── Handle incoming serial commands from MATLAB ───────────────────────────
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("START") && state == WAITING) {
      presentTicks = 0;
      beginSession();
    } else if (cmd.equalsIgnoreCase("STOP") && state == ACTIVE) {
      finishSession();
    } else if (cmd.equalsIgnoreCase("DEBUG")) {
      debugMode = !debugMode;
      Serial.println(debugMode ? "DEBUG_ON" : "DEBUG_OFF");
    }
  }

  // ── Sensor polling ────────────────────────────────────────────────────────
  if (millis() - lastPollMs < POLL_MS) return;
  lastPollMs = millis();

  float dist    = readDistanceCm();
  int   sound   = analogRead(SOUND_PIN);
  bool  present = (dist < PHONE_PRESENT_CM);

  // Stream live readings when debug mode is on
  if (debugMode) {
    Serial.print("DEBUG,");
    Serial.print(dist, 1);        // distance in cm
    Serial.print(",");
    Serial.print(sound);          // raw ADC 0-1023
    Serial.print(",");
    Serial.println(present ? 1 : 0);
  }

  if (state == WAITING) {
    // Count consecutive present readings to avoid false triggers
    if (present) {
      presentTicks++;
      if (presentTicks >= PRESENT_TICKS) {
        presentTicks = 0;
        beginSession();
      }
    } else {
      presentTicks = 0;
    }

  } else { // ACTIVE
    // Accumulate sound (reuse the reading already taken above)
    soundSum     += (unsigned long)sound;
    soundSamples += 1;

    if (present) {
      // Phone back in box
      if (disturbanceOpen) {
        // Closed a disturbance event
        disturbanceOpen = false;
      }
      absentTicks = 0;
    } else {
      // Phone absent
      absentTicks++;

      if (absentTicks == DISTURBANCE_TICKS && !disturbanceOpen) {
        disturbanceCount++;
        disturbanceOpen = true;
      }

      if (absentTicks >= SESSION_END_TICKS) {
        finishSession();
      }
    }
  }
}
