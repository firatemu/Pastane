const ORDER_NUMBER_TIME_ZONE = 'Europe/Istanbul';

export function orderNumberDatePrefix(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: ORDER_NUMBER_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now);
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `ORD-${value('year')}${value('month')}${value('day')}`;
}

export function createOrderNumber(sequence: number, now = new Date()): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new Error('Order number sequence must be between 1 and 999.');
  }
  return `${orderNumberDatePrefix(now)}${String(sequence).padStart(3, '0')}`;
}
