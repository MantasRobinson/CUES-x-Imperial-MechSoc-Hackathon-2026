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
 *   HC-SR04  TRIG → D10  |  ECHO → D9   (Timer1 pins, avoids millis() clash)
 *            VCC must be 5V — sensor will not respond at 3.3V
 *   KY-037   DO   → D7   (digital trigger output — more reliable than AO)
 *            Adjust trimmer until DO barely triggers in silence
 *   LED            → D13 (built-in, ON during session)
 *
 * Serial protocol (9600 baud, newline-terminated):
 *   Arduino → PC   PHONEBOX_READY
 *   Arduino → PC   SESSION_START
 *   Arduino → PC   SESSION_END,<durationSec>,<disturbanceCount>,<noiseCode>
 *                  noiseCode: 0=Quiet  1=Moderate  2=Loud
 *   PC      → Arduino  START   (force-start a session)
 *   PC      → Arduino  STOP    (force-end a session)
 *   PC      → Arduino  DEBUG   (toggle live sensor stream)
 */

// ── Pin assignments ────────────────────────────────────────────────────────────
#define TRIG_PIN      9    // HC-SR04 trigger (Timer1, avoids millis() clash)
#define ECHO_PIN      10   // HC-SR04 echo
#define SOUND_PIN     A0   // KY-037 analog output (AO)
#define LED_PIN       13

// ── Distance thresholds ───────────────────────────────────────────────────────
#define PHONE_PRESENT_CM       10   // below → phone in box
#define PRESENT_TICKS           2   // 2 × 600 ms = 1.2 s to confirm placement
#define DISTURBANCE_TICKS       3   // 3 × 500 ms = 1.5 s absence → disturbance
#define SESSION_END_TICKS      10   // 10 × 500 ms = 5 s absence → session over

// ── Sound thresholds ─────────────────────────────────────────────────────────
// KY-037 AO is a raw AC mic signal. We measure peak-to-peak amplitude over a
// 500 ms window — larger = louder. Observed range at a hackathon: ~0–34.
// Adjust SOUND_LOUD_MIN if needed — watch DEBUG output while making noise.
#define SOUND_SAMPLE_MS       500   // sampling window per poll (ms)
#define SOUND_QUIET_MAX        10   // amplitude ≤ this → Quiet
#define SOUND_LOUD_MIN         40   // amplitude ≥ this → Loud

// ── Poll interval ─────────────────────────────────────────────────────────────
// Must be > SOUND_SAMPLE_MS so sound sampling fits inside each poll cycle
#define POLL_MS               600

// ── State ─────────────────────────────────────────────────────────────────────
enum State { WAITING, ACTIVE };
static State state = WAITING;

static unsigned long sessionStartMs   = 0;
static int           disturbanceCount = 0;
static int           presentTicks     = 0;
static int           absentTicks      = 0;
static bool          disturbanceOpen  = false;

// Sound: accumulate trigger counts across the session
static unsigned long soundAmpSum  = 0;
static unsigned long soundAmpCount   = 0;

static unsigned long lastPollMs       = 0;
static bool          debugMode        = false;

// ── Distance helper ───────────────────────────────────────────────────────────
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long us = pulseIn(ECHO_PIN, HIGH, 38000UL);
  return (us == 0) ? 999.0f : us * 0.01715f;
}

// ── Sound helper ──────────────────────────────────────────────────────────────
// Peak-to-peak amplitude of the KY-037 AO signal over SOUND_SAMPLE_MS.
// AO is an AC mic signal centred ~512 — averaging gives ~512 regardless of
// noise, so we measure the swing (max - min) instead. Returns 0–1023.
int readSoundAmplitude() {
  unsigned long start = millis();
  int hi = 0, lo = 1023;
  while (millis() - start < SOUND_SAMPLE_MS) {
    int v = analogRead(SOUND_PIN);
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  return hi - lo;
}

// ── Session control ───────────────────────────────────────────────────────────
void beginSession() {
  state             = ACTIVE;
  sessionStartMs    = millis();
  disturbanceCount  = 0;
  absentTicks       = 0;
  disturbanceOpen   = false;
  soundAmpSum   = 0;
  soundAmpCount    = 0;
  digitalWrite(LED_PIN, HIGH);
  Serial.println("SESSION_START");
}

void finishSession() {
  state = WAITING;
  digitalWrite(LED_PIN, LOW);
  presentTicks = 0;

  unsigned long durationSec = (millis() - sessionStartMs) / 1000UL;

  // Average amplitude per poll → classify noise level
  int noiseCode = 1; // default Moderate
  if (soundAmpCount > 0) {
    unsigned long avgAmp = soundAmpSum / soundAmpCount;
    if      (avgAmp <= SOUND_QUIET_MAX) noiseCode = 0;
    else if (avgAmp >= SOUND_LOUD_MIN)  noiseCode = 2;
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
  pinMode(TRIG_PIN,     OUTPUT);
  pinMode(ECHO_PIN,     INPUT);
  pinMode(SOUND_PIN,    INPUT);
  pinMode(LED_PIN,      OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("PHONEBOX_READY");
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  // Handle incoming serial commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if      (cmd.equalsIgnoreCase("START") && state == WAITING) { presentTicks = 0; beginSession(); }
    else if (cmd.equalsIgnoreCase("STOP")  && state == ACTIVE)  { finishSession(); }
    else if (cmd.equalsIgnoreCase("DEBUG"))                      { debugMode = !debugMode; Serial.println(debugMode ? "DEBUG_ON" : "DEBUG_OFF"); }
  }

  if (millis() - lastPollMs < POLL_MS) return;
  lastPollMs = millis();

  // Read sound first (blocking for SOUND_SAMPLE_MS — must fit within POLL_MS)
  int   amp     = readSoundAmplitude();
  float dist    = readDistanceCm();
  bool  present = (dist < PHONE_PRESENT_CM);

  if (debugMode) {
    Serial.print("DEBUG,");
    Serial.print(dist, 1);
    Serial.print(",");
    Serial.print(amp);
    Serial.print(",");
    Serial.println(present ? 1 : 0);
  }

  // ── State machine ────────────────────────────────────────────────────────
  if (state == WAITING) {
    presentTicks = present ? presentTicks + 1 : 0;
    if (presentTicks >= PRESENT_TICKS) {
      presentTicks = 0;
      beginSession();
    }

  } else { // ACTIVE
    soundAmpSum += amp;
    soundAmpCount  += 1;

    if (present) {
      if (disturbanceOpen) disturbanceOpen = false;
      absentTicks = 0;
    } else {
      absentTicks++;
      if (absentTicks == DISTURBANCE_TICKS && !disturbanceOpen) {
        disturbanceCount++;
        disturbanceOpen = true;
      }
      if (absentTicks >= SESSION_END_TICKS) finishSession();
    }
  }
}
