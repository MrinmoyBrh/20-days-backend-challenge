const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AuditLogger extends EventEmitter {
    constructor(logFilePath) {
        super();
        this.logFile = logFilePath || path.join(__dirname, 'audit.log');

        //Create an append-only writable stream
        this.logStream = fs.createWriteStream(this.logFile, {flags: 'a', encoding: 'utf-8'});

        //Register internal listners for log events
        this.on('log', this.writeLog.bind(this));
    }

    writeLog({ level, action,details, ip}) {
        const timestamp = new Date().toISOString();
        const formattedEntry = JSON.stringify({
            timestamp,
            level: level.toUpperCase(),
            action,
            ip: ip || '127.0.0.1',
            details: details ||{}
        }) + '\n';

        //Write diectly to file stream without blocking
        this.logStream.write(formattedEntry);

        //Also output color-coded preview to console
        const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
        console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${timestamp} - ${action}`);

    }

    //Convenient trigger methods
    info(action, details, ip) {
        this.emit('log', { level: 'INFO', action, details, ip});
    }

    warn(action, details, ip) {
        this.emit('log', { level: 'WARN', action, details, ip});
    }
    error(action, details, ip) {
        this.emit('log', { level: 'ERROR', action, details, ip});
    }

}
module.exports = AuditLogger;