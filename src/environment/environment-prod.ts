// src/environment/environment-prod.ts
export const environment = {
  production: true,
  finnhubApiKey: process.env['FINNHUB_API_KEY'],
  apiUrl: process.env['API_URL']
};