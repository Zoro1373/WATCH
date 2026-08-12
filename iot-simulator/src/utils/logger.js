'use strict';

const winston = require('winston');
const path = require('path');
const config = require('../config');

const logFilePath = path.join(__dirname, '../../logs/app.log');

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  })
);

const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: customFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level}]: ${message}`;
        })
      )
    }),
    new winston.transports.File({
      filename: logFilePath,
      level: config.logLevel || 'info'
    })
  ]
});

module.exports = logger;
