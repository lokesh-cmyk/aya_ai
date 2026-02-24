/* eslint-disable @typescript-eslint/no-explicit-any */
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
      execute: async ({ location }: { location: string }) => {
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
