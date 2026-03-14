% phonebox_send.m — send a manual START or STOP command to the Arduino
%
% Run this in a SECOND MATLAB Command Window while phonebox_logger is running
% in the first window.
%
% Usage:
%   >> phonebox_send('start')
%   >> phonebox_send('stop')

function phonebox_send(cmd)
    phonebox_config;   % loads COM_PORT, BAUD_RATE

    if ~ismember(lower(cmd), {'start','stop'})
        error('Command must be ''start'' or ''stop''.');
    end

    s = serialport(COM_PORT, BAUD_RATE);
    configureTerminator(s, "LF");
    writeline(s, upper(cmd));
    fprintf('Sent: %s\n', upper(cmd));
    pause(0.5);
    clear s;
end
