# Web Search, Weather & Conversational Tools Design

**Date:** 2026-02-20
**Scope:** Web search (Tavily) + Weather (WeatherAPI.com) tools for AI Chat and WhatsApp AYA, with rich weather UI component

## Overview

Add two native AI tools — web search and weather — to both AYA AI Chat and WhatsApp AYA agent. Users can search the web and check weather from either interface. AI Chat renders weather with a rich card component (current conditions + 3-day forecast); WhatsApp formats as emoji-rich text.

## Environment Variables

```env
TAVILY_API_KEY=<key>
WEATHERAPI_KEY=<key>
```

## Architecture

### 1. Web Search Tool (Tavily)

**File:** `lib/tools/web-search.ts`

- Uses Tavily Search API (free tier: 1000 searches/month)
- Tool parameters: `query` (string), `max_results` (number, default 5)
- Returns: `{ title, url, content }[]`
- AI presents results as numbered list with links (markdown in AI Chat, plain text in WhatsApp)

### 2. Weather Tool (WeatherAPI.com)

**File:** `lib/tools/weather.ts`

- Uses WeatherAPI.com (free tier: 1M calls/month, current + 3-day forecast)
- Tool parameters: `location` (string — city name, zip code, or lat/lon)
- Returns structured data: current conditions + 3-day forecast
- AI Chat: renders via `weather_card` component block
- WhatsApp: AI formats as text with emojis

### 3. Weather Card UI Component

**File:** `components/ai-chat/generative-ui/WeatherCard.tsx`

Added to `GenerativeUIRenderer.tsx` as `type="weather_card"`.

JSON schema:
```json
{
  "location": "New Delhi, India",
  "temp_c": 32,
  "condition": "Sunny",
  "condition_icon": "//cdn.weatherapi.com/...",
  "feelslike_c": 35,
  "humidity": 45,
  "wind_kph": 12,
  "forecast": [
    { "date": "2026-02-20", "day": "Thu", "maxtemp_c": 32, "mintemp_c": 18, "condition": "Sunny", "condition_icon": "..." },
    { "date": "2026-02-21", "day": "Fri", "maxtemp_c": 30, "mintemp_c": 17, "condition": "Partly Cloudy", "condition_icon": "..." },
    { "date": "2026-02-22", "day": "Sat", "maxtemp_c": 28, "mintemp_c": 16, "condition": "Light Rain", "condition_icon": "..." }
  ]
}
```

### 4. Tool Wiring

- **AI Chat (`stream/route.ts`):** Load `getWebSearchAndWeatherTools()` alongside Composio tools. Always available (no OAuth needed).
- **WhatsApp processor (`processor.ts`):** Load same tools on BOTH simple and complex paths so weather/search get instant responses.
- **System prompts:** Add instructions for weather_card component usage (AI Chat) and text formatting (WhatsApp).

### 5. Data Flow

**AI Chat:**
```
User: "What's the weather in Tokyo?"
→ Claude calls get_weather(location: "Tokyo")
→ Tool fetches from WeatherAPI.com
→ Claude returns :::component{type="weather_card"} with JSON
→ Frontend renders WeatherCard component
```

**WhatsApp:**
```
User: "What's the weather in Tokyo?"
→ classifyIntent → "simple" (default)
→ processMessage with tools loaded (weather + web search)
→ Claude calls get_weather, formats as WhatsApp text with emojis
→ Response sent via WAHA
```

**Web Search (both):**
```
User: "Search for latest Next.js 15 features"
→ Claude calls web_search(query: "latest Next.js 15 features")
→ Tavily returns structured results
→ Claude presents as numbered list with titles, snippets, and links
```

## Key Decisions

1. **Tavily** for web search — purpose-built for AI agents, clean structured results
2. **WeatherAPI.com** for weather — generous free tier, includes 3-day forecast
3. **Both WhatsApp paths** get tools — simple path now loads web search + weather for instant responses
4. **No Composio** needed — these are direct API tools, not OAuth integrations
5. **Rich UI** only in AI Chat — WhatsApp gets text-formatted weather
