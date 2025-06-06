// src/utils/dateUtils.js
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export const getWeekDates = (date = new Date()) => {
  const week = [];
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - date.getDay());
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    week.push(day);
  }
  return week;
};