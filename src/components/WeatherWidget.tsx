"use client";

import { useEffect, useState } from "react";
import { Wind, Droplets } from "lucide-react";
import { WeatherSVG } from "@/components/icons";

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

interface WeatherInfo {
  label: string;
  mood: "sunny" | "cloudy" | "foggy" | "rainy" | "snowy" | "stormy";
}

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0) return { label: "Açık", mood: "sunny" };
  if (code <= 3) return { label: "Parçalı Bulutlu", mood: "cloudy" };
  if (code <= 48) return { label: "Sisli", mood: "foggy" };
  if (code <= 67) return { label: "Yağmurlu", mood: "rainy" };
  if (code <= 77) return { label: "Karlı", mood: "snowy" };
  if (code <= 82) return { label: "Sağanak", mood: "rainy" };
  return { label: "Fırtınalı", mood: "stormy" };
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m&timezone=Europe/Istanbul"
    )
      .then((r) => r.json())
      .then((data) => {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weathercode,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const info = weather ? getWeatherInfo(weather.weatherCode) : null;

  return (
    <div className={`weather-widget ${info ? `weather-${info.mood}` : ""}`}>
      <div className="weather-clock">
        {time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      {info && weather ? (
        <>
          <div className="weather-main">
            <span className="weather-icon">
              <WeatherSVG mood={info.mood} size={30} />
            </span>
            <span className="weather-temp">{weather.temp}°C</span>
          </div>
          <div className="weather-meta">
            <span className="weather-city">İstanbul · {info.label}</span>
            <div className="weather-stats">
              <span>
                <Droplets size={11} />
                {weather.humidity}%
              </span>
              <span>
                <Wind size={11} />
                {weather.windSpeed} km/h
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="weather-skeleton" />
      )}
    </div>
  );
}
