% phonebox_config.m — Edit this file before running phonebox_logger.m
%
% How to find your userId:
%   1. Open the PhoneBox web app and log in.
%   2. Click your name / Profile in the top-right.
%   3. Your UUID is shown under "Account ID".
%   (Or copy it from the browser Network tab after logging in: GET /api/auth/me)

% ── Required settings ─────────────────────────────────────────────────────────

% Your account UUID (paste from the web app profile page)
userId = '9f875b15-368c-456e-8485-0eee8437f50f';

% Serial port the Arduino is connected to.
%   Windows  → 'COM3', 'COM4', … (check Device Manager → Ports)
%   macOS    → '/dev/tty.usbmodem…' or '/dev/tty.usbserial…'
%   Linux    → '/dev/ttyACM0' or '/dev/ttyUSB0'
COM_PORT = 'COM7';

% ── Optional settings ─────────────────────────────────────────────────────────

% PhoneBox backend URL.  Change only if running the server on a different host.
API_URL = 'http://localhost:3001';

% Serial baud rate — must match the value in phonebox.ino
BAUD_RATE = 9600;
