import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWeather } from '../services/firestoreService';
import type { WeatherResponse } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard } from '../components/UI';

export function WeatherPage() {
  const { userDoc } = useAuth();
  const [locationInput, setLocationInput] = useState(
    [userDoc?.district, userDoc?.state].filter(Boolean).join(', ') || 'Thanjavur, Tamil Nadu'
  );
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWeather = async (loc: string) => {
    if (!loc.trim()) return;
    setLoading(true);
    try {
      const data = await fetchWeather({ location: loc.trim() });
      setWeather(data);
    } catch {
      setWeather({
        available: false,
        reason: 'Live meteorological service could not be reached. AgriSphere never displays synthetic weather data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWeather(locationInput);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadWeather(locationInput);
  };

  return (
    <div>
      <PageHeader
        title="Agricultural Weather"
        subtitle="Live meteorological conditions, 5-day rainfall & temperature forecast, and field-level weather advisories."
        action={
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#525B56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="District or town..."
                className="pl-9 pr-3 py-2 text-sm bg-white border border-[#D3D9CE] rounded-lg w-56 sm:w-64"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325] disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Update</span>
            </button>
          </form>
        }
      />

      {loading && !weather && (
        <div className="bg-white border border-[#E2E5DF] rounded-xl p-12 text-center text-sm text-[#525B56]">
          Fetching live meteorological observations...
        </div>
      )}

      {weather && !weather.available && (
        <SectionCard title="Weather Data Currently Unavailable">
          <EmptyState
            title="Unable to retrieve live weather readings"
            description={
              weather.reason ||
              'The external weather API is unavailable or could not resolve this location. Verify your district name or retry shortly.'
            }
          />
        </SectionCard>
      )}

      {weather?.available && weather.current && (
        <>
          {weather.alerts && weather.alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {weather.alerts.map((alert, idx) => (
                <FeedbackBanner key={idx} type="info" message={`Agricultural Weather Alert: ${alert}`} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
              <p className="text-xs text-[#525B56]">Current Temperature</p>
              <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">
                {weather.current.temperatureC.toFixed(1)}°C
              </p>
              <p className="text-xs text-[#2D6A4F] mt-1">{weather.current.condition}</p>
            </div>
            <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
              <p className="text-xs text-[#525B56]">Relative Humidity</p>
              <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">
                {weather.current.humidityPercent}%
              </p>
              <p className="text-xs text-[#525B56] mt-1">Observed at {weather.observedAt?.slice(11, 16) || 'Now'}</p>
            </div>
            <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
              <p className="text-xs text-[#525B56]">Current Rainfall</p>
              <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">
                {weather.current.rainfallMm} <span className="text-sm font-sans font-normal">mm</span>
              </p>
              <p className="text-xs text-[#525B56] mt-1">{weather.locationName}</p>
            </div>
            <div className="bg-white border border-[#E2E5DF] rounded-xl p-5">
              <p className="text-xs text-[#525B56]">Wind Speed</p>
              <p className="text-3xl font-mono font-semibold tabular-nums text-[#1C1F1D] mt-2">
                {weather.current.windSpeedKmh} <span className="text-sm font-sans font-normal">km/h</span>
              </p>
              <p className="text-xs text-[#525B56] mt-1">Direction: {weather.current.windDirectionDeg}°</p>
            </div>
          </div>

          <SectionCard
            title="5-Day Agricultural Forecast"
            subtitle={`Source: ${weather.provider} · Coordinates ${weather.latitude?.toFixed(2)}, ${weather.longitude?.toFixed(2)}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E5DF] text-left text-xs text-[#525B56]">
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Condition</th>
                    <th className="py-2.5 font-medium text-right">Min / Max (°C)</th>
                    <th className="py-2.5 font-medium text-right">Rain Prob.</th>
                    <th className="py-2.5 font-medium text-right">Rainfall (mm)</th>
                    <th className="py-2.5 font-medium text-right">Max Wind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0EB]">
                  {weather.forecast?.map((day) => (
                    <tr key={day.date}>
                      <td className="py-3 font-mono text-xs tabular-nums">{day.date}</td>
                      <td className="py-3 font-medium">{day.condition}</td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {day.tempMinC.toFixed(1)}° / {day.tempMaxC.toFixed(1)}°
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">{day.rainProbability}%</td>
                      <td className="py-3 text-right font-mono tabular-nums">{day.precipitationMm.toFixed(1)} mm</td>
                      <td className="py-3 text-right font-mono tabular-nums">{day.maxWindKmh.toFixed(0)} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
