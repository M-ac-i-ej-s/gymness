export const formatKg = (value: number) => `${value.toFixed(1)} kg`;

export const formatDate = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Dzisiaj';
  if (sameDay(date, yesterday)) return 'Wczoraj';

  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
