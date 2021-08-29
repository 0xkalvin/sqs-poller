const LEVELS = {
  nothing: 0,
  error: 1,
  warn: 2,
  info: 4,
  debug: 5
}

const logWithLevel = (loggerLevel, level) => (data = {}) => {
  const loggerLevelValue = LEVELS[loggerLevel]
  const levelValue = LEVELS[level]

  if (levelValue && loggerLevelValue >= levelValue) {
    const message = JSON.stringify(
      { ...data, level }
    )

    console[level](message)
  }
}

function makeLogger (loggerLevel) {
  return {
    nothing: logWithLevel(loggerLevel, 'nothing'),
    error: logWithLevel(loggerLevel, 'error'),
    warn: logWithLevel(loggerLevel, 'warn'),
    info: logWithLevel(loggerLevel, 'info'),
    debug: logWithLevel(loggerLevel, 'debug')
  }
}

module.exports = makeLogger
