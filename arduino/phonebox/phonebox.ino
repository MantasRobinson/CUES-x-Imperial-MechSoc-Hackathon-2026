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
 *   HC-SR04  TRIG → D9   |  ECHO → D10  (Timer1 pins, avoids millis() clash)
 *            VCC must be 5V — sensor will not respond at 3.3V
 *   KY-037   AO   → A0   (analog output, peak-to-peak amplitude measurement)
 *   RGB LED  R → D11 |  G → D6  |  B → D5  (common-anode, common pin → 5V)
 *            ⚠ R must be on D11 (PWM) for smooth colour gradient — move wire from D7.
 *   LED            → D13 (built-in, ON during session)
 *
 * RGB status:
 *   Off          — idle, waiting for phone
 *   Red → Green  — session active; colour gradient shows progress toward target
 *   Blue strobe  — session just ended
 *
 * Serial protocol (9600 baud, newline-terminated):
 *   Arduino → PC   PHONEBOX_READY
 *   Arduino → PC   SESSION_START
 *   Arduino → PC   SESSION_END,<durationSec>,<disturbanceCount>,<noiseCode>
 *                  noiseCode: 0=Quiet  1=Moderate  2=Loud
 *   PC      → Arduino  START              (force-start a session)
 *   PC      → Arduino  STOP               (force-end a session)
 *   PC      → Arduino  SETTARGET,<min>    (set target session length in minutes)
 *   PC      → Arduino  DEBUG              (toggle live sensor stream)
 */

// ── Pin assignments ────────────────────────────────────────────────────────────
#define TRIG_PIN      9    // HC-SR04 trigger (Timer1)
#define ECHO_PIN      10   // HC-SR04 echo    (Timer1)
#define SOUND_PIN     A0   // KY-037 analog output (AO)
#define LED_PIN       13   // Built-in LED

// RGB LED — common-anode (common pin → 5V).
// All three pins must support analogWrite (PWM) for smooth colour mixing.
// D11 = Timer2 PWM,  D6 = Timer0 PWM,  D5 = Timer0 PWM.
#define RGB_R_PIN     11
#define RGB_G_PIN     6
#define RGB_B_PIN     5
#define VIBRATOR_PIN  2

// ── Session-length target ─────────────────────────────────────────────────────
// Default 30 minutes; overridden at runtime via SETTARGET,<min> from MATLAB.
static unsigned long targetSec = 30UL * 60UL;

// ── Distance thresholds ───────────────────────────────────────────────────────
#define PHONE_PRESENT_CM       10
#define PRESENT_TICKS           2   // 2 × 600 ms = 1.2 s to confirm placement
#define DISTURBANCE_TICKS       3
#define SESSION_END_TICKS      10   // 10 × 600 ms = 6 s absence → session over

// ── Sound thresholds ─────────────────────────────────────────────────────────
#define SOUND_SAMPLE_MS       500
#define SOUND_QUIET_MAX        10
#define SOUND_LOUD_MIN         40

// ── Poll interval ─────────────────────────────────────────────────────────────
#define POLL_MS               600

// ── State ─────────────────────────────────────────────────────────────────────
enum State { WAITING, ACTIVE };
static State state = WAITING;

static unsigned long sessionStartMs   = 0;
static int           disturbanceCount = 0;
static int           presentTicks     = 0;
static int           absentTicks      = 0;
static bool          disturbanceOpen  = false;

static unsigned int soundQuietPolls = 0;
static unsigned int soundLoudPolls  = 0;
static unsigned int soundModPolls   = 0;

static unsigned long lastPollMs = 0;
static bool          debugMode  = false;

// ── RGB LED helpers ───────────────────────────────────────────────────────────
// r, g, b: 0 (off) … 255 (full brightness).
// Common-anode inverts: analogWrite value = 255 - brightness.
void setRGBpwm(int r, int g, int b) {
  analogWrite(RGB_R_PIN, 255 - constrain(r, 0, 255));
  analogWrite(RGB_G_PIN, 255 - constrain(g, 0, 255));
  analogWrite(RGB_B_PIN, 255 - constrain(b, 0, 255));
}

// Update the LED to show session progress: red (start) → green (target reached).
void updateSessionLED() {
  float frac = min(1.0f, (float)(millis() - sessionStartMs) / ((float)targetSec * 1000.0f));
  setRGBpwm((int)(255.0f * (1.0f - frac)),   // R fades out
            (int)(255.0f * frac),              // G fades in
            0);
}

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
  soundQuietPolls   = 0;
  soundLoudPolls    = 0;
  soundModPolls     = 0;
  digitalWrite(LED_PIN, HIGH);
  setRGBpwm(255, 0, 0);   // Start red
  Serial.println("SESSION_START");
  // Single vibration pulse on session start
  digitalWrite(VIBRATOR_PIN, HIGH); delay(600); digitalWrite(VIBRATOR_PIN, LOW);
}

void finishSession() {
  state = WAITING;
  digitalWrite(LED_PIN, LOW);
  presentTicks = 0;

  unsigned long durationSec = (millis() - sessionStartMs) / 1000UL;

  int noiseCode = 1;
  unsigned int totalPolls = soundQuietPolls + soundLoudPolls + soundModPolls;
  if (totalPolls > 0) {
    if      (soundQuietPolls * 100 > totalPolls * 65) noiseCode = 0;
    else if (soundLoudPolls  * 100 > totalPolls * 65) noiseCode = 2;
  }

  Serial.print("SESSION_END,");
  Serial.print(durationSec);
  Serial.print(",");
  Serial.print(disturbanceCount);
  Serial.print(",");
  Serial.println(noiseCode);

  // Two vibration pulses + blue strobe × 4, then off (idle)
  for (int i = 0; i < 2; i++) {
    digitalWrite(VIBRATOR_PIN, HIGH); delay(500); digitalWrite(VIBRATOR_PIN, LOW); delay(200);
  }
  for (int i = 0; i < 4; i++) {
    setRGBpwm(0, 0, 255);
    delay(200);
    setRGBpwm(0, 0, 0);
    delay(150);
  }
  // Idle: LED off
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN,  OUTPUT);
  pinMode(ECHO_PIN,  INPUT);
  pinMode(SOUND_PIN, INPUT);
  pinMode(LED_PIN,   OUTPUT);
  pinMode(RGB_R_PIN, OUTPUT);
  pinMode(RGB_G_PIN, OUTPUT);
  pinMode(RGB_B_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  digitalWrite(VIBRATOR_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  setRGBpwm(0, 0, 0);   // Off on startup (idle)
  Serial.println("PHONEBOX_READY");
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if      (cmd.equalsIgnoreCase("START") && state == WAITING) { presentTicks = 0; beginSession(); }
    else if (cmd.equalsIgnoreCase("STOP")  && state == ACTIVE)  { finishSession(); }
    else if (cmd.equalsIgnoreCase("DEBUG"))                      { debugMode = !debugMode; Serial.println(debugMode ? "DEBUG_ON" : "DEBUG_OFF"); }
    else if (cmd.startsWith("SETTARGET")) {
      int comma = cmd.indexOf(',');
      if (comma >= 0) {
        int mins = cmd.substring(comma + 1).toInt();
        if (mins == 0) {
          targetSec = 30UL;                          // 0 = demo mode: 30-second gradient
          Serial.println("TARGET_SET,DEMO_30S");
        } else if (mins > 0) {
          targetSec = (unsigned long)mins * 60UL;
          Serial.print("TARGET_SET,"); Serial.println(mins);
        }
      }
    }
  }

  if (millis() - lastPollMs < POLL_MS) return;
  lastPollMs = millis();

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

  if (state == WAITING) {
    presentTicks = present ? presentTicks + 1 : 0;
    if (presentTicks >= PRESENT_TICKS) {
      presentTicks = 0;
      beginSession();
    }

  } else { // ACTIVE
    if      (amp <= SOUND_QUIET_MAX) soundQuietPolls++;
    else if (amp >= SOUND_LOUD_MIN)  soundLoudPolls++;
    else                             soundModPolls++;

    // Update colour gradient each poll; end session when target is reached
    updateSessionLED();
    if (millis() - sessionStartMs >= targetSec * 1000UL) {
      finishSession();
      return;
    }

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
