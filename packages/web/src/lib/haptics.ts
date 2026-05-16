export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (style === 'light') navigator.vibrate(10)
    else if (style === 'medium') navigator.vibrate(20)
    else if (style === 'heavy') navigator.vibrate([30, 50, 30])
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([15, 30, 25])
  }
}

export function hapticError() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([50, 50, 50])
  }
}
