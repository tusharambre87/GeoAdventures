const VERIFICATION_REMINDER_EVENT = 'geoquest:verification-reminder';

interface ReminderData {
  email?: string;
  starsEarned?: number;
}

export function triggerVerificationReminder(data?: ReminderData) {
  const email = data?.email || localStorage.getItem('geoquest_email') || '';
  const verified = localStorage.getItem('geoquest_email_verified') === 'true';
  const dismissed = sessionStorage.getItem('verification_reminder_dismissed');
  const registrationSource = localStorage.getItem('geoquest_registration_source');
  
  if (registrationSource !== 'email') {
    return;
  }
  
  if (!verified && email && !dismissed) {
    const randomChance = Math.random() < 0.25;
    if (randomChance) {
      window.dispatchEvent(new CustomEvent(VERIFICATION_REMINDER_EVENT, {
        detail: { email, starsEarned: data?.starsEarned }
      }));
    }
  }
}

export function onVerificationReminderTriggered(callback: (data: ReminderData) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ReminderData>;
    callback(customEvent.detail);
  };
  
  window.addEventListener(VERIFICATION_REMINDER_EVENT, handler);
  
  return () => {
    window.removeEventListener(VERIFICATION_REMINDER_EVENT, handler);
  };
}

export function dismissVerificationReminder() {
  sessionStorage.setItem('verification_reminder_dismissed', 'true');
}

export function markEmailVerified() {
  localStorage.setItem('geoquest_email_verified', 'true');
}
