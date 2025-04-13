const apiKey = 'eaadd53ed10cdef309b952113af9b8d7';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';
const geoApiUrl = 'https://api.openweathermap.org/geo/1.0/direct';
const locationInput = document.getElementById('locationInput');
const searchButton = document.getElementById('searchButton');
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
let abortController = null;
const MIN_CHARS = 2;
const DEBOUNCE_TIME = 300;
locationInput.addEventListener('input', debounce(handleInput, DEBOUNCE_TIME));
locationInput.addEventListener('focus', () => {
    if (locationInput.value.length >= MIN_CHARS && suggestionsDropdown.children.length > 0) {
        suggestionsDropdown.style.display = 'block';
    }
});
searchButton.addEventListener('click', () => {
    const location = locationInput.value;
    if (location) {
        fetchWeather(location);
        suggestionsDropdown.style.display = 'none';
    }
});
document.addEventListener('click', (e) => {
    if (!locationInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
        suggestionsDropdown.style.display = 'none';
    }
});
async function handleInput(e) {
    const query = e.target.value.trim();
    suggestionsDropdown.innerHTML = '';
    suggestionsDropdown.style.display = 'none';
    if (abortController) {
        abortController.abort();
    } 
    if (query.length < MIN_CHARS) {
        return;
    }   
    suggestionsDropdown.innerHTML = '<li style="padding: 10px; color: #666; font-style: italic;">Searching for cities...</li>';
    suggestionsDropdown.style.display = 'block';
    
    try {
        abortController = new AbortController();
        const suggestions = await getCitySuggestions(query, abortController.signal);
        
        if (suggestions.length > 0) {
            suggestionsDropdown.innerHTML = '';
            suggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = `${suggestion.name}, ${suggestion.country}`;
                li.style.padding = '10px';
                li.style.cursor = 'pointer';
                li.style.textAlign = 'left';
                li.style.borderBottom = '1px solid #eee';
                
                li.addEventListener('click', () => {
                    locationInput.value = `${suggestion.name}, ${suggestion.country}`;
                    suggestionsDropdown.style.display = 'none';
                    fetchWeather(suggestion.name, suggestion.country);
                });
                
                li.addEventListener('mouseover', () => {
                li.style.backgroundColor = '#f5f5f5';
                });
                
                li.addEventListener('mouseout', () => {
                    li.style.backgroundColor = 'white';
                });
                
                suggestionsDropdown.appendChild(li);
            });
        } else {
            suggestionsDropdown.innerHTML = '<li style="padding: 10px;">No cities found</li>';
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error fetching suggestions:', error);
            suggestionsDropdown.innerHTML = '<li style="padding: 10px; color: #d9534f;">Failed to load suggestions</li>';
        }
    }
}
function fetchWeather(city, country = '') {
    const location = country ? `${city},${country}` : city;
    const url = `${apiUrl}?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
    locationElement.textContent = 'Loading...';
    temperatureElement.textContent = '';
    descriptionElement.textContent = '';
    document.getElementById('humidity').textContent = '-';
    document.getElementById('wind').textContent = '-';
    document.getElementById('feels-like').textContent = '-';
    document.getElementById('precipitation').textContent = '-';
    document.getElementById('pressure').textContent = '-';
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`City not found (${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            locationElement.textContent = `${data.name}, ${data.sys.country}`;
            temperatureElement.textContent = `${Math.round(data.main.temp)}°C`;
            descriptionElement.textContent = data.weather[0].description.charAt(0).toUpperCase() + 
                                          data.weather[0].description.slice(1);
            document.getElementById('humidity').textContent = `${data.main.humidity}%`;
            document.getElementById('wind').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
            document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
            document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
            let precipitation = '0 mm';
            if (data.rain && data.rain['1h']) {
                precipitation = `${data.rain['1h']} mm`;
            } else if (data.snow && data.snow['1h']) {
                precipitation = `${data.snow['1h']} mm`;
            } else if (data.rain && data.rain['3h']) {
                precipitation = `${data.rain['3h']} mm`;
            } else if (data.snow && data.snow['3h']) {
                precipitation = `${data.snow['3h']} mm`;
            }
            document.getElementById('precipitation').textContent = precipitation;
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            locationElement.textContent = 'Error loading weather data';
            temperatureElement.textContent = '';
            descriptionElement.textContent = error.message;
        });
}
async function getCitySuggestions(query, signal) {
    const url = `${geoApiUrl}?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
    
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
}
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}