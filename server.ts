import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

// Rate limiters for AI & external proxy routes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many plant analysis requests. Please wait a few minutes before trying again.' }
});

const weatherLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { available: false, reason: 'Too many weather requests. Please wait briefly.' }
});

// Shared server-side Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AgriSphere API' });
});

// Server-side AI Plant Health Analysis (Vision + Structured JSON)
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

app.post('/api/plant-health/analyze', aiLimiter, async (req, res) => {
  try {
    const body = req.body as {
      imageBase64?: unknown;
      mimeType?: unknown;
      cropType?: unknown;
      observedSymptoms?: unknown;
      language?: unknown;
    };

    const cropType = typeof body.cropType === 'string' ? body.cropType.trim().slice(0, 100) : '';
    const observedSymptoms = typeof body.observedSymptoms === 'string' ? body.observedSymptoms.trim().slice(0, 1000) : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const language = body.language === 'ta' ? 'ta' : 'en';

    if (!cropType) {
      res.status(400).json({ error: 'Crop type is required.' });
      return;
    }
    if (!imageBase64 || !ALLOWED_IMAGE_MIMES.has(mimeType)) {
      res.status(400).json({ error: 'A valid JPEG, PNG, or WebP crop photograph is required.' });
      return;
    }
    if (imageBase64.length > 9_000_000) {
      res.status(400).json({ error: 'Image size exceeds maximum allowed limit (6 MB).' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI analysis service is currently unconfigured. Please configure GEMINI_API_KEY in server secrets.'
      });
      return;
    }

    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    const responseLanguageInstruction =
      language === 'ta'
        ? 'Respond in clear, farmer-friendly Tamil Unicode (தமிழ்) for all text fields, keeping confidenceLevel strictly one of "Low", "Moderate", or "High".'
        : 'Respond in clear, plain, farmer-friendly English.';

    const promptText = [
      `Crop Type: ${cropType}`,
      `Farmer-described symptoms: ${observedSymptoms || 'None specified'}`,
      'Examine the uploaded crop photograph carefully.',
      'Explain the most plausible plant health issue(s) objectively without claiming a confirmed laboratory diagnosis.',
      'Never recommend hazardous, banned, or restricted chemical pesticides or unsafe dosages.',
      'Focus on visible observations, potential contributing environmental/biological factors, safe general preventive agricultural practices, and clear triggers for consulting a local agricultural expert or Krishi Vigyan Kendra (KVK).',
      responseLanguageInstruction
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime,
              data: imageBase64
            }
          },
          { text: promptText }
        ]
      },
      config: {
        systemInstruction:
          'You are an objective agricultural extension assistant supporting Indian farmers. You provide cautious, educational, image-assisted crop health observations. You never claim certainty or a confirmed diagnosis, never invent unseen symptoms, and never prescribe dangerous chemical pesticides.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleIssue: {
              type: Type.STRING,
              description: 'Most plausible plant health condition or stress observed, phrased cautiously.'
            },
            confidenceLevel: {
              type: Type.STRING,
              description: 'Must be strictly one of: Low, Moderate, High.'
            },
            uncertaintyNote: {
              type: Type.STRING,
              description: 'Honest explanation of image limitations and why visual inspection is not a confirmed lab diagnosis.'
            },
            visibleSymptoms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 6 concrete visible observations from the image.'
            },
            contributingFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 5 potential environmental, soil, water, or biological contributing factors.'
            },
            preventiveSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 6 safe, non-hazardous preventive or cultural management next steps.'
            },
            whenToConsultExpert: {
              type: Type.STRING,
              description: 'Clear guidance on when to contact a local agronomist or agricultural extension officer.'
            }
          },
          required: [
            'possibleIssue',
            'confidenceLevel',
            'uncertaintyNote',
            'visibleSymptoms',
            'contributingFactors',
            'preventiveSteps',
            'whenToConsultExpert'
          ]
        }
      }
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'The AI model returned an empty analysis response. Please retry with a clearer photograph.' });
      return;
    }

    const parsed = JSON.parse(rawText) as {
      possibleIssue?: string;
      confidenceLevel?: string;
      uncertaintyNote?: string;
      visibleSymptoms?: string[];
      contributingFactors?: string[];
      preventiveSteps?: string[];
      whenToConsultExpert?: string;
    };

    const validConfidence =
      parsed.confidenceLevel === 'High' || parsed.confidenceLevel === 'Moderate' || parsed.confidenceLevel === 'Low'
        ? parsed.confidenceLevel
        : 'Low';

    res.json({
      possibleIssue: String(parsed.possibleIssue || 'Uncertain plant stress').slice(0, 200),
      confidenceLevel: validConfidence,
      uncertaintyNote: String(
        parsed.uncertaintyNote || 'Visual photo analysis is preliminary and cannot confirm a laboratory diagnosis.'
      ).slice(0, 600),
      visibleSymptoms: Array.isArray(parsed.visibleSymptoms)
        ? parsed.visibleSymptoms.slice(0, 8).map((s) => String(s).slice(0, 200))
        : [],
      contributingFactors: Array.isArray(parsed.contributingFactors)
        ? parsed.contributingFactors.slice(0, 8).map((s) => String(s).slice(0, 200))
        : [],
      preventiveSteps: Array.isArray(parsed.preventiveSteps)
        ? parsed.preventiveSteps.slice(0, 8).map((s) => String(s).slice(0, 300))
        : [],
      whenToConsultExpert: String(
        parsed.whenToConsultExpert || 'Consult a local agricultural officer if symptoms spread across multiple plants.'
      ).slice(0, 600)
    });
  } catch (err) {
    console.error('Plant health analysis error:', err);
    const message = err instanceof Error ? err.message : 'Unable to analyze crop photograph at this time.';
    res.status(500).json({ error: message });
  }
});

// Genuine Live Agricultural Weather Proxy (Open-Meteo or configured OpenWeather)
function weatherCodeToSummary(code: number): { label: string; alert?: string } {
  if (code === 0) return { label: 'Clear sky' };
  if (code <= 3) return { label: 'Partly cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog / Mist', alert: 'High morning moisture may elevate fungal blight risk; monitor leaf canopy.' };
  if (code >= 51 && code <= 57) return { label: 'Light drizzle' };
  if (code >= 61 && code <= 65) return { label: 'Rain', alert: 'Rainfall expected — pause scheduled irrigation to conserve water.' };
  if (code >= 80 && code <= 82) return { label: 'Rain showers', alert: 'Showers forecast — avoid foliar spraying and verify field drainage.' };
  if (code >= 95) return { label: 'Thunderstorm', alert: 'Severe weather alert — secure loose equipment and postpone field spraying.' };
  return { label: 'Variable conditions' };
}

app.get('/api/weather', weatherLimiter, async (req, res) => {
  try {
    const queryLocation = typeof req.query.location === 'string' ? req.query.location.trim().slice(0, 120) : '';
    const latParam = typeof req.query.lat === 'string' ? Number(req.query.lat) : NaN;
    const lonParam = typeof req.query.lon === 'string' ? Number(req.query.lon) : NaN;

    let lat = Number.isFinite(latParam) && latParam >= -90 && latParam <= 90 ? latParam : NaN;
    let lon = Number.isFinite(lonParam) && lonParam >= -180 && lonParam <= 180 ? lonParam : NaN;
    let resolvedLocationName = queryLocation || 'Selected Farm Location';

    // Resolve location name via Open-Meteo Geocoding API if coordinates aren't provided
    if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && queryLocation) {
      const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geoUrl.searchParams.set('name', queryLocation);
      geoUrl.searchParams.set('count', '1');
      geoUrl.searchParams.set('language', 'en');
      geoUrl.searchParams.set('format', 'json');

      const geoResponse = await fetch(geoUrl.toString(), { signal: AbortSignal.timeout(7000) });
      if (!geoResponse.ok) {
        res.json({
          available: false,
          reason: 'Weather geocoding service returned an error. Live weather data is currently unavailable.'
        });
        return;
      }
      const geoJson = (await geoResponse.json()) as {
        results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }>;
      };
      const first = geoJson.results?.[0];
      if (!first) {
        res.json({
          available: false,
          reason: `Could not locate "${queryLocation}". Please enter a valid district, town, or latitude/longitude.`
        });
        return;
      }
      lat = first.latitude;
      lon = first.longitude;
      resolvedLocationName = [first.name, first.admin1, first.country].filter(Boolean).join(', ');
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({
        available: false,
        reason: 'Please configure your farm location (city/district or coordinates) to fetch live weather.'
      });
      return;
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', String(lat));
    forecastUrl.searchParams.set('longitude', String(lon));
    forecastUrl.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m'
    );
    forecastUrl.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'
    );
    forecastUrl.searchParams.set('timezone', 'auto');
    forecastUrl.searchParams.set('forecast_days', '5');

    const weatherResp = await fetch(forecastUrl.toString(), { signal: AbortSignal.timeout(8000) });
    if (!weatherResp.ok) {
      res.json({
        available: false,
        reason: 'Live weather provider is currently unreachable. Please try again later.'
      });
      return;
    }

    const weatherData = (await weatherResp.json()) as {
      timezone?: string;
      current?: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        precipitation: number;
        rain: number;
        weather_code: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        precipitation_probability_max: number[];
        wind_speed_10m_max: number[];
      };
    };

    if (!weatherData.current || !weatherData.daily) {
      res.json({
        available: false,
        reason: 'Incomplete weather payload received from meteorological provider.'
      });
      return;
    }

    const currentInfo = weatherCodeToSummary(weatherData.current.weather_code);
    const alerts: string[] = [];
    if (currentInfo.alert) alerts.push(currentInfo.alert);
    if (weatherData.current.temperature_2m >= 38) {
      alerts.push('High heat stress threshold (>= 38°C): consider early-morning or dusk irrigation.');
    }
    if (weatherData.current.wind_speed_10m >= 25) {
      alerts.push('Elevated wind speed (>= 25 km/h): avoid foliar applications to prevent spray drift.');
    }

    const forecast = weatherData.daily.time.map((date, idx) => {
      const code = weatherData.daily!.weather_code[idx] ?? 0;
      const info = weatherCodeToSummary(code);
      return {
        date,
        condition: info.label,
        tempMaxC: weatherData.daily!.temperature_2m_max[idx],
        tempMinC: weatherData.daily!.temperature_2m_min[idx],
        precipitationMm: weatherData.daily!.precipitation_sum[idx],
        rainProbability: weatherData.daily!.precipitation_probability_max[idx],
        maxWindKmh: weatherData.daily!.wind_speed_10m_max[idx]
      };
    });

    res.json({
      available: true,
      provider: 'Open-Meteo Meteorological API',
      locationName: resolvedLocationName,
      latitude: lat,
      longitude: lon,
      observedAt: weatherData.current.time,
      current: {
        temperatureC: weatherData.current.temperature_2m,
        humidityPercent: weatherData.current.relative_humidity_2m,
        rainfallMm: weatherData.current.rain ?? weatherData.current.precipitation ?? 0,
        windSpeedKmh: weatherData.current.wind_speed_10m,
        windDirectionDeg: weatherData.current.wind_direction_10m,
        condition: currentInfo.label
      },
      forecast,
      alerts
    });
  } catch (err) {
    console.error('Weather API error:', err);
    res.json({
      available: false,
      reason: 'Live weather service is currently unreachable from this network. No synthetic readings are shown.'
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriSphere server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AgriSphere server:', err);
  process.exit(1);
});
