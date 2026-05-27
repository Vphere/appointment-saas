// Pure utility — no React, no components
let inMemoryToken = null;

export const getInMemoryToken = () => inMemoryToken;
export const setInMemoryToken = (t) => { inMemoryToken = t; };
export const clearInMemoryToken = () => { inMemoryToken = null; };