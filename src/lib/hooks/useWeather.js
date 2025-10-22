// useWeather.js
import { useEffect, useState } from "react"

const KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;




export function useWeather() {
    const [weather, setWeather] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const cached = sessionStorage.getItem("weatherData")
        if (cached) {
            setWeather(JSON.parse(cached))
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                try {
                    const res = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${KEY}&units=imperial`);
                    const data = await res.json()
                    setWeather(data)
                    sessionStorage.setItem("weatherData", JSON.stringify(data))
                } catch (err) {
                    console.error("Weather fetch failed:", err)
                    setError("Unable to fetch weather data.")
                }
            },
            () => setError("Location permission denied.")
        )
    }, [])

    return { weather, error }
}

