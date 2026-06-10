// tokenStore.js
let inMemoryToken  = null;
let tokenExpiry    = null; // ms timestamp when the access token expires

export const getInMemoryToken  = ()  => inMemoryToken;
export const setInMemoryToken  = (t) => { inMemoryToken = t; };
export const clearInMemoryToken= ()  => { inMemoryToken = null; };

export const getTokenExpiry    = ()  => tokenExpiry;
export const setTokenExpiry    = (t) => { tokenExpiry = t; };