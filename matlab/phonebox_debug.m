% phonebox_debug.m — live sensor monitor
%
% Shows distance (cm) and sound level (0-1023) every 500 ms so you can
% verify the sensors are working and tune the thresholds.
%
% Usage:  >> phonebox_debug
% Press Ctrl+C to stop.

phonebox_config;   % loads COM_PORT, BAUD_RATE

s = serialport(COM_PORT, BAUD_RATE);
s.Timeout = 5;
configureTerminator(s, "LF");
flush(s);

% Wait for Arduino ready
for i = 1:10
    try
        line = strtrim(readline(s));
        if contains(line, 'PHONEBOX_READY'), break; end
    catch; end
end

% Enable debug stream
writeline(s, 'DEBUG');
pause(0.2);
if s.NumBytesAvailable > 0
    fprintf('%s\n', strtrim(readline(s)));  % prints DEBUG_ON
end

fprintf('\n%-12s  %-12s  %-10s\n', 'Distance(cm)', 'Sound(0-1023)', 'Phone in box?');
fprintf('%s\n', repmat('-', 1, 38));
fprintf('Thresholds:  distance < 10 cm = present  |  sound < 300 = Quiet, > 650 = Loud\n\n');

while true
    if s.NumBytesAvailable == 0
        pause(0.05);
        continue;
    end
    try
        line = strtrim(readline(s));
    catch
        continue;
    end

    if startsWith(line, 'DEBUG,')
        parts   = strsplit(line, ',');
        dist    = str2double(parts{2});
        sound   = str2double(parts{3});
        present = str2double(parts{4});

        % Noise label
        if sound < 300,      noise = 'Quiet   ';
        elseif sound < 650,  noise = 'Moderate';
        else,                noise = 'Loud    ';
        end

        presStr = 'NO ';
        if present, presStr = 'YES'; end

        fprintf('%-12.1f  %-7d %-5s  %s\n', dist, sound, noise, presStr);
    end
end
