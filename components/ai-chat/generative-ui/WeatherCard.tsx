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
