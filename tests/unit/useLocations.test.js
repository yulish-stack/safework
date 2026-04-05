import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Must be declared before the import it mocks — Vitest hoists vi.mock calls
vi.mock('../../src/lib/api', () => ({
  fetchBusinesses: vi.fn(),
  fetchShelters:   vi.fn(),
}));

import { fetchBusinesses, fetchShelters } from '../../src/lib/api';
import { useLocations } from '../../src/hooks/useLocations';

const MOCK_BUSINESSES = [
  { id: 'b1', type: 'business', name: 'Café Test', lat: 32.05, lng: 34.78, address: 'דיזנגוף 50' },
  { id: 'b2', type: 'business', name: 'Another Café', lat: 32.06, lng: 34.79, address: 'אלנבי 30' },
];

const MOCK_SHELTERS = [
  { id: 's1', type: 'shelter', name: 'Shelter A', lat: 32.055, lng: 34.781, address: 'התבור 32' },
];

describe('useLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading:true and empty arrays', () => {
    // Never resolves — simulates pending fetch
    fetchBusinesses.mockReturnValue(new Promise(() => {}));
    fetchShelters.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useLocations());

    expect(result.current.loading).toBe(true);
    expect(result.current.businesses).toEqual([]);
    expect(result.current.shelters).toEqual([]);
  });

  it('populates businesses and shelters after fetch resolves', async () => {
    fetchBusinesses.mockResolvedValue(MOCK_BUSINESSES);
    fetchShelters.mockResolvedValue(MOCK_SHELTERS);

    const { result } = renderHook(() => useLocations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.businesses).toEqual(MOCK_BUSINESSES);
    expect(result.current.shelters).toEqual(MOCK_SHELTERS);
  });

  it('sets loading:false even when fetches return empty arrays', async () => {
    fetchBusinesses.mockResolvedValue([]);
    fetchShelters.mockResolvedValue([]);

    const { result } = renderHook(() => useLocations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.businesses).toEqual([]);
    expect(result.current.shelters).toEqual([]);
  });

  it('makes no Nominatim API calls (validateBusinessCoords was removed)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchBusinesses.mockResolvedValue(MOCK_BUSINESSES);
    fetchShelters.mockResolvedValue(MOCK_SHELTERS);

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const nominatimCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === 'string' && url.includes('nominatim')
    );
    expect(nominatimCalls).toHaveLength(0);

    fetchSpy.mockRestore();
  });

  it('calls fetchBusinesses and fetchShelters exactly once on mount', async () => {
    fetchBusinesses.mockResolvedValue([]);
    fetchShelters.mockResolvedValue([]);

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchBusinesses).toHaveBeenCalledTimes(1);
    expect(fetchShelters).toHaveBeenCalledTimes(1);
  });
});
