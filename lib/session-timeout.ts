export const SESSION_TIMEOUT = 3600000 // 1 hour
export const WARNING_TIME = 60000 // 1 minute before timeout

export function setupSessionTimeout(onWarning: () => void, onTimeout: () => void) {
  let warningTimeout: NodeJS.Timeout
  let logoutTimeout: NodeJS.Timeout
  let lastActivity = Date.now()

  function resetTimers() {
    clearTimeout(warningTimeout)
    clearTimeout(logoutTimeout)
    
    lastActivity = Date.now()
    
    warningTimeout = setTimeout(() => {
      onWarning()
    }, SESSION_TIMEOUT - WARNING_TIME)
    
    logoutTimeout = setTimeout(() => {
      onTimeout()
    }, SESSION_TIMEOUT)
  }

  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, resetTimers)
  })

  resetTimers()

  return () => {
    clearTimeout(warningTimeout)
    clearTimeout(logoutTimeout)
    events.forEach(event => {
      document.removeEventListener(event, resetTimers)
    })
  }
}
