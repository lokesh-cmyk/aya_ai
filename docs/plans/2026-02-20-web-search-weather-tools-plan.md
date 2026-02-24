# Web Search, Weather & Conversational Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add web search (Tavily) and weather (WeatherAPI.com) tools to AYA AI Chat and WhatsApp AYA agent, with a rich weather card UI component in AI Chat.

**Architecture:** Two native AI SDK tools (`web_search`, `get_weather`) created in `lib/tools/`, wired into both AI Chat stream route and WhatsApp processor (simple + complex paths). A new `weather_card` generative UI component renders weather data in AI Chat. System prompts updated to instruct the AI on tool usage and weather card formatting.

**Tech Stack:** Vercel AI SDK `tool()`, Zod schemas, Tavily Search API, WeatherAPI.com, React (generative UI), Next.js API routes

---

### Task 1: Create web search tool

**Files:**
- Create: `lib/tools/web-search.ts`

**Implementation:**

```typescript
import { tool } from "ai";
import { z } from "zod";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export function isWebSearchConfigured(): boolean {
  return !!TAVILY_API_KEY;
}

export function getWebSearchTool() {
  if (!TAVILY_API_KEY) return {};

  return {
    web_search: tool({
      description:
        "Search the web for current information. Use this when the user asks about recent events, news, facts, or anything you don't have knowledge about. Returns titles, URLs, and content snippets.",
      parameters: z.object({
        query: z.string().describe("The search query"),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("Maximum number of results to return (default 5)"),
      }),
      execute: async ({ query, max_results }) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            max_results: max_results ?? 5,
            include_answer: true,
          }),
        });

        if (!response.ok) {
          return { error: "Search failed. Please try again." };
        }

        const data = await response.json();

        return {
          answer: data.answer || null,
          results: (data.results || []).map(
            (r: { title: string; url: string; content: string }) => ({
              title: r.title,
              url: r.url,
              snippet: r.content?.substring(0, 300) || "",
            })
          ),
        };
      },
    }),
  };
}
```

**Commit:**
```
feat: add Tavily web search tool
```

---

### Task 2: Create weather tool

**Files:**
- Create: `lib/tools/weather.ts`

**Implementation:**

```typescript
import { tool } from "ai";
import { z } from "zod";

const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

export function isWeatherConfigured(): boolean {
  return !!WEATHERAPI_KEY;
}

export function getWeatherTool() {
  if (!WEATHERAPI_KEY) return {};

  return {
    get_weather: tool({
      description:
        "Get current weather and 3-day forecast for a location. Use this when the user asks about weather, temperature, or conditions for any city or place.",
      parameters: z.object({
        location: z
          .string()
          .describe(
            "City name, zip code, or coordinates (e.g. 'London', '10001', '48.8566,2.3522')"
          ),
      }),
      execute: async ({ location }) => {
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no`;

        const response = await fetch(url);
        if (!response.ok) {
          return { error: "Could not fetch weather for that location. Please check the city name and try again." };
        }

        const data = await response.json();

        return {
          location: `${data.location.name}, ${data.location.country}`,
          temp_c: data.current.temp_c,
          condition: data.current.condition.text,
          condition_icon: data.current.condition.icon,
          feelslike_c: data.current.feelslike_c,
          humidity: data.current.humidity,
          wind_kph: data.current.wind_kph,
          forecast: data.forecast.forecastday.map(
            (day: {
              date: string;
              day: {
                maxtemp_c: number;
                mintemp_c: number;
                condition: { text: string; icon: string };
              };
            }) => {
              const dateObj = new Date(day.date + "T00:00:00");
              return {
                date: day.date,
                day: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
                maxtemp_c: day.day.maxtemp_c,
                mintemp_c: day.day.mintemp_c,
                condition: day.day.condition.text,
                condition_icon: day.day.condition.icon,
              };
            }
          ),
        };
      },
    }),
  };
}
```

**Commit:**
```
feat: add WeatherAPI.com weather tool
```

---

### Task 3: Create combined tool export

**Files:**
- Create: `lib/tools/index.ts`

This barrel file combines web search and weather tools into a single loader used by both AI Chat and WhatsApp.

**Implementation:**

```typescript
import { getWebSearchTool } from "./web-search";
import { getWeatherTool } from "./weather";

/**
 * Get web search + weather tools.
 * Returns an empty object for each if the corresponding API key is not configured.
 * Used by both AI Chat stream route and WhatsApp processor.
 */
export function getSearchAndWeatherTools() {
  return {
    ...getWebSearchTool(),
    ...getWeatherTool(),
  };
}

export { isWebSearchConfigured } from "./web-search";
export { isWeatherConfigured } from "./weather";
```

**Commit:**
```
feat: add combined search & weather tools barrel export
```

---

### Task 4: Create WeatherCard generative UI component

**Files:**
- Create: `components/ai-chat/generative-ui/WeatherCard.tsx`
- Modify: `components/ai-chat/generative-ui/index.ts`
- Modify: `components/ai-chat/GenerativeUIRenderer.tsx`

**Step 1: Create WeatherCard.tsx**

```tsx
"use client";

import React, { memo } from "react";
import { Droplets, Wind, Thermometer } from "lucide-react";

interface ForecastDay {
  date: string;
  day: string;
  maxtemp_c: number;
  mintemp_c: number;
  condition: string;
  condition_icon: string;
}

interface WeatherData {
  location: string;
  temp_c: number;
  condition: string;
  condition_icon: string;
  feelslike_c: number;
  humidity: number;
  wind_kph: number;
  forecast?: ForecastDay[];
}

interface WeatherCardProps {
  data: WeatherData;
}

export const WeatherCard = memo(function WeatherCard({ data }: WeatherCardProps) {
  if (!data || !data.location) return null;

  const iconUrl = data.condition_icon?.startsWith("//")
    ? `https:${data.condition_icon}`
    : data.condition_icon;

  return (
    <div className="my-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
      {/* Current Weather */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{data.location}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-bold text-gray-900">
                {Math.round(data.temp_c)}
              </span>
              <span className="text-xl text-gray-400">&deg;C</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{data.condition}</p>
          </div>
          {iconUrl && (
            <img
              src={iconUrl}
              alt={data.condition}
              className="w-16 h-16 -mt-1"
            />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5" />
            Feels {Math.round(data.feelslike_c)}&deg;C
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5" />
            {data.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5" />
            {Math.round(data.wind_kph)} km/h
          </span>
        </div>
      </div>

      {/* 3-Day Forecast */}
      {data.forecast && data.forecast.length > 0 && (
        <div className="border-t border-gray-200/60 bg-white/40 px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {data.forecast.map((day, i) => {
              const dayIconUrl = day.condition_icon?.startsWith("//")
                ? `https:${day.condition_icon}`
                : day.condition_icon;

              return (
                <div
                  key={i}
                  className="flex flex-col items-center text-center py-1"
                >
                  <span className="text-xs font-medium text-gray-500">
                    {i === 0 ? "Today" : day.day}
                  </span>
                  {dayIconUrl && (
                    <img
                      src={dayIconUrl}
                      alt={day.condition}
                      className="w-8 h-8 my-0.5"
                    />
                  )}
                  <div className="text-xs">
                    <span className="font-medium text-gray-800">
                      {Math.round(day.maxtemp_c)}&deg;
                    </span>
                    <span className="text-gray-400 ml-1">
                      {Math.round(day.mintemp_c)}&deg;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
```

**Step 2: Update `components/ai-chat/generative-ui/index.ts`**

Add export:
```typescript
export { WeatherCard } from './WeatherCard';
```

**Step 3: Update `components/ai-chat/GenerativeUIRenderer.tsx`**

Add import:
```typescript
import {
  TaskTable,
  CalendarEventCard,
  EmailSummaryCard,
  MeetingSummaryCard,
  SocialPostCard,
  WeatherCard,
} from './generative-ui';
```

Add case in `renderComponent()`:
```typescript
case 'weather_card':
  return <WeatherCard data={data as any} />;
```

**Commit:**
```
feat: add WeatherCard generative UI component
```

---

### Task 5: Wire tools into AI Chat stream route

**Files:**
- Modify: `app/api/ai-chat/stream/route.ts`

**Changes:**

1. Add import at top:
```typescript
import { getSearchAndWeatherTools } from '@/lib/tools';
```

2. After loading Composio tools (around line 400-405), merge in search & weather tools:
```typescript
// Load web search & weather tools (always available, no OAuth needed)
const searchWeatherTools = getSearchAndWeatherTools();
composioTools = { ...composioTools, ...searchWeatherTools };
```

3. Add `weather_card` to the system prompt's component types section (after `social_post` documentation around line 779):
```
### weather_card
Use when presenting weather data. Single object:
{"location": "string", "temp_c": "number", "condition": "string", "condition_icon": "URL string", "feelslike_c": "number", "humidity": "number", "wind_kph": "number", "forecast": [{"date": "YYYY-MM-DD", "day": "short weekday", "maxtemp_c": "number", "mintemp_c": "number", "condition": "string", "condition_icon": "URL string"}]}
```

4. Add web search and weather to the integration tools section of system prompt (around line 713):
```
When a user asks you to search the web, use the web_search tool. Present results as a numbered list with **title**, snippet, and [link](url).

When a user asks about weather, use the get_weather tool. In the AI Chat interface, ALWAYS present weather data using the weather_card component block.
```

**Commit:**
```
feat: wire web search & weather tools into AI Chat
```

---

### Task 6: Wire tools into WhatsApp processor (both paths)

**Files:**
- Modify: `lib/whatsapp/processor.ts`

**Changes:**

1. Add import at top:
```typescript
import { getSearchAndWeatherTools } from "@/lib/tools";
```

2. Change the tool loading section (around line 102-116). Currently tools only load on `includeTools === true`. We need to ALWAYS load search & weather tools, and only load Composio + notes/reminders on the complex path:

Replace:
```typescript
// Load tools if complex path
let tools: any = {};
if (includeTools) {
  // Always add notes & reminders tools on complex path
  const customTools = getNotesAndReminderTools(user.id, user.timezone);
  tools = { ...customTools };

  // Add Composio tools (external integrations)
  try {
    const sessionTools = await getComposioSessionTools(user.id);
    tools = { ...sessionTools.tools, ...tools };
  } catch (e) {
    console.warn("[whatsapp] Failed to load Composio tools:", e);
  }
}
```

With:
```typescript
// Always load web search & weather tools (both simple + complex paths)
let tools: any = { ...getSearchAndWeatherTools() };

if (includeTools) {
  // Add notes & reminders tools on complex path
  const customTools = getNotesAndReminderTools(user.id, user.timezone);
  tools = { ...tools, ...customTools };

  // Add Composio tools (external integrations)
  try {
    const sessionTools = await getComposioSessionTools(user.id);
    tools = { ...sessionTools.tools, ...tools };
  } catch (e) {
    console.warn("[whatsapp] Failed to load Composio tools:", e);
  }
}
```

3. Update the WhatsApp system prompt `buildWhatsAppSystemPrompt()` to mention web search and weather capabilities. In the `## Your Capabilities` section (around line 425), add:
```
- Web search (search the internet for current information, news, facts)
- Weather (get current weather and forecast for any location)
```

And add formatting instructions:
```
## Web Search & Weather
- When user asks to search the web, use the web_search tool and present results as a numbered list
- When user asks about weather, use the get_weather tool and format the response with emojis:
  Example: *Tokyo, Japan* \u2600\ufe0f
  Temperature: 28\u00b0C (feels like 31\u00b0C)
  \ud83d\udca7 Humidity: 65% | \ud83d\udca8 Wind: 15 km/h

  _3-Day Forecast:_
  1. Today: \u2600\ufe0f 28\u00b0C / 20\u00b0C
  2. Fri: \u26c5 25\u00b0C / 19\u00b0C
  3. Sat: \ud83c\udf27\ufe0f 22\u00b0C / 18\u00b0C
```

**Commit:**
```
feat: wire web search & weather tools into WhatsApp processor
```

---

### Task 7: Add tool display names for web search & weather

**Files:**
- Modify: `lib/tool-display-names.ts`

**Changes:**

Add to `TOOL_DISPLAY_NAMES`:
```typescript
// Web Search & Weather
web_search: "Web Search",
get_weather: "Get Weather",
```

Add to `itemLabelForTool`:
```typescript
if (lower.includes("search")) return "results";
if (lower.includes("weather")) return "weather data";
```

Note: Add the `"search"` check BEFORE the existing `"tool"` fallback but be careful — "search" should not conflict with existing entries. Place it after `"registrant"` and before `"tool"`.

**Commit:**
```
feat: add display names for web search & weather tools
```

---

### Task 8: Update WhatsApp classifier keywords

**Files:**
- Modify: `lib/whatsapp/classifier.ts`

**Changes:**

Add to `COMPLEX_KEYWORDS` array:
```typescript
// Weather & Web search (also handled on simple path but complex path is fine too)
"weather", "forecast", "temperature",
"search", "look up", "find out", "google",
```

Wait — actually these should NOT be in COMPLEX_KEYWORDS. The design says weather and web search should work on the simple path too (for instant responses). Since the simple path will now have tools loaded, messages like "what's the weather?" will work on the simple path WITHOUT being routed to Inngest.

However, "search" as a keyword could conflict — "search my tasks" should still go complex. So do NOT add "weather", "search", etc. to COMPLEX_KEYWORDS. The simple path with tools will handle them naturally. No changes to classifier needed for this task.

**Result: No changes needed.** The simple path now loads web search + weather tools, so weather/search queries get handled inline. The classifier already routes these to "simple" by default (no matching keywords), which is the desired behavior.

**Commit:** N/A — skip this task.

---

### Task 9: Build verification

**Steps:**

1. Run TypeScript check:
```bash
npx tsc --noEmit 2>&1 | grep -v "whatsapp/tools"
```
Expected: No new errors from the files we modified.

2. Verify all new files exist:
```bash
ls lib/tools/web-search.ts lib/tools/weather.ts lib/tools/index.ts components/ai-chat/generative-ui/WeatherCard.tsx
```

3. Commit all changes:
```
feat: add web search & weather tools for AI Chat and WhatsApp AYA
```
