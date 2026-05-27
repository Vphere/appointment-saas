// src/hooks/usePincode.js
// Uses India Post / Postalpincode.in API — free, no auth needed

import { useState, useCallback } from 'react';

export function usePincode() {
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError]     = useState('');

  // Returns { city, state, country } or null on failure
  const lookupPincode = useCallback(async (pincode) => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setPincodeError('Enter a valid 6-digit pincode');
      return null;
    }
    setPincodeError('');
    setPincodeLoading(true);
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();

      if (!data?.[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length) {
        setPincodeError('Pincode not found');
        return null;
      }

      const po = data[0].PostOffice[0];
      return {
        city:    po.District || po.Name || '',
        state:   po.State    || '',
        country: 'India',
      };
    } catch {
      setPincodeError('Failed to fetch pincode details');
      return null;
    } finally {
      setPincodeLoading(false);
    }
  }, []);

  return { lookupPincode, pincodeLoading, pincodeError };
}