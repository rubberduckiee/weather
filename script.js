document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const cityInput = document.getElementById('citySearch');
    const searchBtn = document.getElementById('searchBtn');
    const suggestionsList = document.getElementById('suggestions');
    const weatherResults = document.getElementById('weatherResults');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loader = document.getElementById('loader');

    // Weather Display Elements
    const cityNameEl = document.getElementById('cityName');
    const currentDateEl = document.getElementById('currentDate');
    const currentTempEl = document.getElementById('currentTemp');
    const weatherDescEl = document.getElementById('weatherDesc');
    const humidityValEl = document.getElementById('humidityVal');
    const windValEl = document.getElementById('windVal');
    const feelsLikeValEl = document.getElementById('feelsLikeVal');
    const currentIconEl = document.getElementById('currentIcon');
    const dailyForecastEl = document.getElementById('dailyForecast');
    const hourlyForecastEl = document.getElementById('hourlyForecast');

    let debounceTimer;

    // Open-Meteo Weather Codes Mapping to Phosphor Icons
    const weatherIcons = {
        0: { icon: 'ph-sun', name: 'Clear sky', color: ['#fde047', '#f59e0b'] },
        1: { icon: 'ph-cloud-sun', name: 'Mainly clear', color: ['#fde047', '#94a3b8'] },
        2: { icon: 'ph-cloud', name: 'Partly cloudy', color: ['#cbd5e1', '#94a3b8'] },
        3: { icon: 'ph-cloud', name: 'Overcast', color: ['#94a3b8', '#64748b'] },
        45: { icon: 'ph-cloud-fog', name: 'Fog', color: ['#e2e8f0', '#94a3b8'] },
        48: { icon: 'ph-cloud-fog', name: 'Depositing rime fog', color: ['#e2e8f0', '#94a3b8'] },
        51: { icon: 'ph-cloud-rain', name: 'Light drizzle', color: ['#7dd3fc', '#38bdf8'] },
        53: { icon: 'ph-cloud-rain', name: 'Moderate drizzle', color: ['#7dd3fc', '#38bdf8'] },
        55: { icon: 'ph-cloud-rain', name: 'Dense drizzle', color: ['#7dd3fc', '#38bdf8'] },
        61: { icon: 'ph-cloud-rain', name: 'Slight rain', color: ['#38bdf8', '#0284c7'] },
        63: { icon: 'ph-cloud-rain', name: 'Moderate rain', color: ['#38bdf8', '#0284c7'] },
        65: { icon: 'ph-cloud-rain', name: 'Heavy rain', color: ['#0284c7', '#0369a1'] },
        71: { icon: 'ph-snowflake', name: 'Slight snow', color: ['#e0f2fe', '#bae6fd'] },
        73: { icon: 'ph-snowflake', name: 'Moderate snow', color: ['#e0f2fe', '#bae6fd'] },
        75: { icon: 'ph-snowflake', name: 'Heavy snow', color: ['#bae6fd', '#7dd3fc'] },
        77: { icon: 'ph-snowflake', name: 'Snow grains', color: ['#e0f2fe', '#bae6fd'] },
        80: { icon: 'ph-cloud-rain', name: 'Slight rain showers', color: ['#38bdf8', '#0284c7'] },
        81: { icon: 'ph-cloud-rain', name: 'Moderate rain showers', color: ['#38bdf8', '#0284c7'] },
        82: { icon: 'ph-cloud-lightning', name: 'Violent rain showers', color: ['#6366f1', '#4338ca'] },
        95: { icon: 'ph-cloud-lightning', name: 'Thunderstorm', color: ['#fef08a', '#6366f1'] },
        96: { icon: 'ph-cloud-lightning', name: 'Thunderstorm with hail', color: ['#fef08a', '#6366f1'] },
        99: { icon: 'ph-cloud-lightning', name: 'Thunderstorm with heavy hail', color: ['#fef08a', '#6366f1'] }
    };

    function getIconDetails(code) {
        return weatherIcons[code] || weatherIcons[0]; // Default to clear sky
    }

    // Event Listeners
    cityInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            suggestionsList.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchCitySuggestions(query);
        }, 500);
    });

    searchBtn.addEventListener('click', () => {
        const query = cityInput.value.trim();
        if (query) {
            // Fetch first suggestion automatically
            fetchCitySuggestions(query, true);
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsList.classList.add('hidden');
        }
    });

    // API Calls
    async function fetchCitySuggestions(query, autoSelectFirst = false) {
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                if (autoSelectFirst) {
                    suggestionsList.classList.add('hidden');
                    fetchWeather(data.results[0]);
                } else {
                    renderSuggestions(data.results);
                }
            } else if (autoSelectFirst) {
                showError("City not found. Please try a different name.");
            } else {
                suggestionsList.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error fetching city data:", error);
            if (autoSelectFirst) showError("Failed to reach Geocoding API.");
        }
    }

    async function fetchWeather(cityObj) {
        hideError();
        weatherResults.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const { latitude, longitude, name, admin1, country } = cityObj;
            const title = admin1 ? `${name}, ${admin1}` : `${name}, ${country}`;

            // Get current, hourly, and daily weather
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

            const response = await fetch(url);
            const data = await response.json();

            updateUI(title, data);
        } catch (error) {
            console.error("Error fetching weather data:", error);
            showError("Failed to fetch weather data. Please try again.");
            loader.classList.add('hidden');
        }
    }

    // UI Updates
    function renderSuggestions(cities) {
        suggestionsList.innerHTML = '';
        cities.forEach(city => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="ph ph-map-pin"></i>
                <div>
                    <span class="suggestion-city">${city.name}</span>
                    <span class="suggestion-country">${city.admin1 ? city.admin1 + ', ' : ''}${city.country}</span>
                </div>
            `;
            li.addEventListener('click', () => {
                cityInput.value = city.name;
                suggestionsList.classList.add('hidden');
                fetchWeather(city);
            });
            suggestionsList.appendChild(li);
        });
        suggestionsList.classList.remove('hidden');
    }

    function updateUI(locationName, weatherData) {
        loader.classList.add('hidden');
        if (!weatherData.current) return;

        const current = weatherData.current;
        const hourly = weatherData.hourly;
        const daily = weatherData.daily;

        // Update Current Weather
        cityNameEl.textContent = locationName;

        // Format Date
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.textContent = today.toLocaleDateString('en-US', options);

        currentTempEl.textContent = Math.round(current.temperature_2m);
        humidityValEl.textContent = `${current.relative_humidity_2m}%`;
        windValEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        feelsLikeValEl.textContent = `${Math.round(current.apparent_temperature)}°C`;

        // Icon and Description
        const codeDetails = getIconDetails(current.weather_code);
        weatherDescEl.textContent = codeDetails.name;

        // Update Icon with gradient logic
        currentIconEl.className = `ph-fill ${codeDetails.icon}`;
        currentIconEl.style.background = `linear-gradient(135deg, ${codeDetails.color[0]}, ${codeDetails.color[1]})`;
        currentIconEl.style.webkitBackgroundClip = 'text';
        currentIconEl.style.backgroundClip = 'text';
        currentIconEl.style.webkitTextFillColor = 'transparent';

        // Update Hourly Forecast (next 24 hours)
        hourlyForecastEl.innerHTML = '';
        if (hourly && hourly.time) {
            const nowTime = new Date().getTime();
            let startIndex = 0;

            for (let i = 0; i < hourly.time.length; i++) {
                const hourTime = new Date(hourly.time[i]).getTime();
                if (hourTime >= nowTime - 3600000) {
                    startIndex = i;
                    break;
                }
            }

            for (let i = startIndex; i < startIndex + 6 && i < hourly.time.length; i++) {
                const timeObj = new Date(hourly.time[i]);
                let hourStr = timeObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                if (i === startIndex) hourStr = 'Now';

                const temp = Math.round(hourly.temperature_2m[i]);
                const icon = getIconDetails(hourly.weather_code[i]);

                const itemTemplate = `
                    <div class="hourly-item">
                        <span class="hourly-time">${hourStr}</span>
                        <i class="ph-fill ${icon.icon} hourly-icon" style="background: linear-gradient(135deg, ${icon.color[0]}, ${icon.color[1]}); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;"></i>
                        <span class="hourly-temp">${temp}°</span>
                    </div>
                `;
                hourlyForecastEl.insertAdjacentHTML('beforeend', itemTemplate);
            }
        }

        // Update Daily Forecast (skipping today)
        dailyForecastEl.innerHTML = '';
        if (daily && daily.time) {
            // Open-Meteo gives 7 days. Start from index 1 (tomorrow)
            const numDaysToDisplay = Math.min(6, daily.time.length - 1);
            for (let i = 1; i <= numDaysToDisplay; i++) {
                const dateObj = new Date(daily.time[i]);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const maxTemp = Math.round(daily.temperature_2m_max[i]);
                const minTemp = Math.round(daily.temperature_2m_min[i]);
                const dailyIcon = getIconDetails(daily.weather_code[i]);

                const itemTemplate = `
                    <div class="forecast-item">
                        <span class="forecast-day">${dayName}</span>
                        <div class="forecast-condition">
                            <i class="ph-fill ${dailyIcon.icon}" style="background: linear-gradient(135deg, ${dailyIcon.color[0]}, ${dailyIcon.color[1]}); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;"></i>
                            <span class="forecast-desc">${dailyIcon.name}</span>
                        </div>
                        <div class="forecast-temp">
                            <span class="temp-high">${maxTemp}°</span>
                            <span class="temp-low">${minTemp}°</span>
                        </div>
                    </div>
                `;
                dailyForecastEl.insertAdjacentHTML('beforeend', itemTemplate);
            }
        }

        // Show Results
        weatherResults.classList.remove('hidden');
        cityInput.value = ''; // clear input
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            hideError();
        }, 5000); // Hide error after 5s
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Default load (optional, e.g., London)
    // fetchCitySuggestions('London', true);
});
