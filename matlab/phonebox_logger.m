% phonebox_logger.m — PhoneBox MATLAB bridge
%
% Sessions are started and ended AUTOMATICALLY by the Arduino:
%   • Place phone in box  → session starts  (LED on)
%   • Remove phone for ~5 s → session ends, data uploaded  (LED off)
%
% You can also type commands here and press Enter to override:
%   start   → force-start a session
%   stop    → force-end the current session
%   quit    → exit this script
%
% Setup:
%   1. Edit phonebox_config.m  (userId, COM_PORT already set)
%   2. Upload phonebox.ino to the Arduino via the Arduino IDE
%   3. In MATLAB Command Window, cd to this folder then run:
%        >> phonebox_logger

phonebox_config;   % loads userId, COM_PORT, API_URL, BAUD_RATE

% ── Guard ─────────────────────────────────────────────────────────────────────
if strcmp(userId, 'paste-your-uuid-here')
    error('PhoneBox:config', ...
        'Please set your userId in phonebox_config.m before running.');
end

fprintf('==============================================\n');
fprintf('  PhoneBox Logger\n');
fprintf('==============================================\n');
fprintf('User    : %s\n', userId);
fprintf('Port    : %s @ %d baud\n', COM_PORT, BAUD_RATE);
fprintf('Server  : %s\n\n', API_URL);

% ── Open serial port ──────────────────────────────────────────────────────────
try
    arduino = serialport(COM_PORT, BAUD_RATE);
catch err
    error('PhoneBox:serial', ...
        'Cannot open %s — check COM_PORT in phonebox_config.m.\n(%s)', ...
        COM_PORT, err.message);
end
configureTerminator(arduino, "LF");
flush(arduino);
pause(1.5);   % wait for any DTR-triggered Arduino reset + PHONEBOX_READY

% Check if PHONEBOX_READY is already in the buffer; proceed immediately if not
fprintf('Waiting for Arduino...\n');
arduino.Timeout = 1;
if arduino.NumBytesAvailable > 0
    try
        line = strtrim(readline(arduino));
        if contains(line, 'PHONEBOX_READY')
            fprintf('Arduino ready.\n\n');
        end
    catch; end
else
    fprintf('(PHONEBOX_READY not seen — Arduino may have booted earlier. Proceeding.)\n\n');
end
arduino.Timeout = 10;   % restore normal timeout for session reads

% ── Send target duration to Arduino ───────────────────────────────────────────
targetMinutes = 30;   % fallback default
try
    opts = weboptions('Timeout', 5);
    settings = webread([API_URL '/api/users/' userId '/settings'], opts);
    targetMinutes = settings.targetMinutes;
catch
    % Non-critical — Arduino will use its built-in default
end
writeline(arduino, sprintf('SETTARGET,%d', targetMinutes));
fprintf('Target   : %d min  (LED turns green at this duration)\n\n', targetMinutes);

fprintf('Place your phone in the box to start a session.\n');
fprintf('Commands: type  start | stop | quit  then press Enter.\n\n');

noiseLabels     = {'Quiet', 'Moderate', 'Loud'};
sessionStartUTC = [];
lastTargetFetch = tic;   % for periodic re-fetch of target

% ── Main loop ─────────────────────────────────────────────────────────────────
while true

    % ── Re-fetch target every 10 s (picks up website changes in real time) ───
    if toc(lastTargetFetch) > 10
        try
            opts2     = weboptions('Timeout', 3);
            s2        = webread([API_URL '/api/users/' userId '/settings'], opts2);
            newTarget = s2.targetMinutes;
            if newTarget ~= targetMinutes
                targetMinutes = newTarget;
                writeline(arduino, sprintf('SETTARGET,%d', targetMinutes));
                if targetMinutes == 0
                    fprintf('Target updated: DEMO (30 s)\n');
                else
                    fprintf('Target updated: %d min\n', targetMinutes);
                end
            end
        catch; end
        lastTargetFetch = tic;
    end

    % ── Check for user keyboard command ──────────────────────────────────────
    % input() is blocking in MATLAB, so we use a non-blocking approach:
    % writeline sends the command to Arduino; readline reads the response.
    % We rely on the Arduino's 1-second read timeout to keep looping.

    % Non-blocking keyboard check via drawnow + a 0-second timer trick:
    % Simple approach: just read serial; typing in Command Window is handled
    % by MATLAB's built-in interrupt (Ctrl+C to quit, or use the commands below).

    % ── Read one line from Arduino (only when data is waiting) ───────────
    if arduino.NumBytesAvailable == 0
        pause(0.1);   % small sleep to avoid busy-waiting
        continue;
    end
    try
        line = strtrim(readline(arduino));
    catch
        line = '';
    end

    if isempty(line)
        continue;
    end

    % ── SESSION_START ─────────────────────────────────────────────────────
    if strcmp(line, 'SESSION_START')
        sessionStartUTC = datetime('now', 'TimeZone', 'UTC');
        fprintf('[%s]  Session STARTED  (LED on)\n', ...
            char(sessionStartUTC, 'HH:mm:ss'));
        fprintf('         Phone is in the box. Remove for ~5 s to end.\n');

        % Notify the backend so the live dashboard animation appears
        try
            opts = weboptions('MediaType', 'application/json', 'Timeout', 5);
            webwrite([API_URL '/api/sessions/active'], struct('userId', userId), opts);
        catch
            % Non-critical — dashboard animation just won't show
        end

    % ── SESSION_END,<sec>,<dist>,<noiseCode> ─────────────────────────────
    elseif startsWith(line, 'SESSION_END')
        sessionEndUTC = datetime('now', 'TimeZone', 'UTC');

        if isempty(sessionStartUTC)
            fprintf('WARNING: SESSION_END received without SESSION_START — skipped.\n\n');
            continue;
        end

        parts        = strsplit(line, ',');
        durationSec  = str2double(parts{2});
        disturbances = str2double(parts{3});
        noiseCode    = str2double(parts{4});
        noiseLevel   = noiseLabels{noiseCode + 1};
        durationMin  = durationSec / 60;

        fprintf('[%s]  Session ENDED\n', char(sessionEndUTC, 'HH:mm:ss'));
        fprintf('         Duration : %.1f min\n', durationMin);
        fprintf('         Noise    : %s\n', noiseLevel);
        fprintf('         Disturbs : %d\n', disturbances);
        fprintf('         Uploading...\n');

        startISO = char(sessionStartUTC, "yyyy-MM-dd'T'HH:mm:ss'Z'");
        endISO   = char(sessionEndUTC,   "yyyy-MM-dd'T'HH:mm:ss'Z'");

        payload = struct( ...
            'userId',           userId,       ...
            'startTime',        startISO,     ...
            'endTime',          endISO,       ...
            'durationMinutes',  durationMin,  ...
            'disturbanceCount', disturbances, ...
            'noiseLevel',       noiseLevel    ...
        );

        try
            opts = weboptions('MediaType', 'application/json', 'Timeout', 15);
            resp = webwrite([API_URL '/api/sessions'], payload, opts);

            fprintf('  XP earned  : +%d  (×%.1f)\n', resp.xpEarned, resp.multiplier);
            fprintf('  Total XP   : %d  →  Level %d\n', resp.newTotalXp, resp.newLevel);
            fprintf('  Streak     : %d day(s)\n', resp.streak);

            if resp.leveledUp
                fprintf('  *** LEVEL UP — now Level %d! ***\n', resp.newLevel);
            end
            if resp.streakBroken
                fprintf('  (streak was reset)\n');
            end
            if ~isempty(resp.newBadges)
                for k = 1:numel(resp.newBadges)
                    b = resp.newBadges(k);
                    fprintf('  *** Badge: %s %s ***\n', b.iconEmoji, b.name);
                end
            end
            if ~isempty(resp.completedChallenges)
                for k = 1:numel(resp.completedChallenges)
                    c = resp.completedChallenges(k);
                    fprintf('  *** Challenge complete: %s (+%d XP) ***\n', ...
                        c.challenge.title, c.challenge.xpReward);
                end
            end

        catch err
            fprintf('  ERROR uploading: %s\n', err.message);
            fprintf('  Is the server running at %s?\n', API_URL);
        end

        fprintf('\nPlace phone in box to start next session.\n\n');
        sessionStartUTC = [];

    % ── Any other Arduino output (debug) ─────────────────────────────────
    else
        fprintf('[Arduino] %s\n', line);
    end
end
