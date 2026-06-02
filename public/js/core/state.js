import { getTodayInputValue } from './utils.js';

let selectedFecha = getTodayInputValue();

export const getSelectedFecha = () => selectedFecha;

export const setSelectedFecha = (fecha) => {
  selectedFecha = fecha || getTodayInputValue();
};
