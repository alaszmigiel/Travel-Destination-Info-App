const weatherDiv = document.getElementById('weather');
const placeTypeSelect = document.getElementById('place-type');
const radiusSelect = document.getElementById('radius');
const nearbyButton = document.getElementById('nearby-button');
const nearbyPlacesDiv = document.getElementById('nearby-places');
const placeDetailsDiv = document.getElementById('place-details');

const placeInput = document.getElementById('place-input');
const resultsDiv = document.getElementById('results');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const searchButton = document.getElementById('search-button');
const listsButton = document.getElementById('lists-button');
const listsContainer = document.getElementById('lists-container');

let selectedLocation = null;
let map;
let markers = [];
let currentCustomMarker = null;

const categoryMapping = {
    restaurant: "Restaurants",
    hotel: "Hotels",
    museum: "Museums",
    monument: "Monuments",
    park: "Parks"
};

const customIcon = L.icon({
iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673221.png',
iconSize: [30, 30],
iconAnchor: [15, 30],
popupAnchor: [0, -30]
});

function initializeMap(latitude, longitude) {
    if (!map) {
        map = L.map('map').setView([latitude, longitude], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    } else {
        map.setView([latitude, longitude], 13);
    }

    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function addMarker(latitude, longitude, text) {
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindPopup(text).openPopup();
    markers.push(marker);

    marker.on('click', () => {
        updateSelectedPlace(text);
    });
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

async function searchLocations() {
    const query = placeInput.value.trim();
    if (!query) {
        resultsDiv.innerHTML = '<p style="color: red;">Enter a place</p>';
        return;
    }
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        resultsDiv.innerHTML = '';
        if (data.error) {
            resultsDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
        } else {
            data.forEach(location => {
                const div = document.createElement('div');
                div.className = 'location';
                div.textContent = `${location.display_name}`;
                div.dataset.location = JSON.stringify(location);
                div.addEventListener('click', () => {
                    placeInput.value = location.display_name;
                    selectedLocation = location;
                    selectLocation(location);
                    resultsDiv.innerHTML = '';
                });
                resultsDiv.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<p style="color: red;">Error, try again.</p>';
    }
}

async function selectLocation(location) {
    try {
        const response = await fetch('/api/select_location', {
            method: 'POST',
            body: JSON.stringify(location),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.error) {
            resultsDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<p style="color: red;">Error, try again.</p>';
    }
}

function setDateLimits() {

    const minDate = new Date('2024-01-01');
    const today = new Date();
    const maxGlobalDate = new Date();
    maxGlobalDate.setDate(today.getDate() + 15);

    const formatDate = (date) => date.toISOString().split('T')[0];

    const minDateStr = formatDate(minDate);
    const maxGlobalDateStr = formatDate(maxGlobalDate);

    startDateInput.setAttribute('min', minDateStr);
    startDateInput.setAttribute('max', maxGlobalDateStr);

    endDateInput.setAttribute('min', minDateStr);
    endDateInput.setAttribute('max', maxGlobalDateStr);

    startDateInput.addEventListener('change', () => {
        const startDateValue = new Date(startDateInput.value);

        if (startDateValue) {
            const maxEndDate = new Date(startDateValue);
            maxEndDate.setDate(startDateValue.getDate() + 13);

            const finalMaxEndDate = maxEndDate > maxGlobalDate ? maxGlobalDate : maxEndDate;

            const finalMaxEndDateStr = formatDate(finalMaxEndDate);
            endDateInput.setAttribute('min', startDateInput.value);
            endDateInput.setAttribute('max', finalMaxEndDateStr);

            if (endDateInput.value && (endDateInput.value < startDateInput.value || endDateInput.value > finalMaxEndDateStr)) {
                endDateInput.value = startDateInput.value;
            }
        }
    });

    endDateInput.addEventListener('change', () => {
        const endDateValue = new Date(endDateInput.value);

        if (endDateValue) {
            const minStartDate = new Date(endDateValue);
            minStartDate.setDate(endDateValue.getDate() - 13);

            const minStartDateStr = formatDate(minStartDate);
            startDateInput.setAttribute('min', minDateStr > minStartDateStr ? minDateStr : minStartDateStr);
            startDateInput.setAttribute('max', endDateInput.value);

            if (startDateInput.value && (startDateInput.value > endDateInput.value || startDateInput.value < minStartDateStr)) {
                startDateInput.value = endDateInput.value;
            }
        }
    });
}

async function displayWeather(location, startDate, endDate) {
    try {
        const response = await fetch(`/api/weather?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();
        if (data.error) {
            weatherDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
        } else {
            const forecast = data.forecast;
            let html = `<h2>Weather forecast for ${location.display_name} (${startDate} to ${endDate})</h2><div class="forecast">`;
            forecast.forEach(day => {
                html += `
                    <div class="day">
                        <img src="/static/icons/${getWeatherIcon(day.weathercode)}" alt="Weather icon" />
                        <p><strong>${day.date}</strong></p>
                        <p>Day: ${day.temp_day}°C</p>
                        <p>Night: ${day.temp_night}°C</p>
                        <p>${getWeatherDescription(day.weathercode)}</p>
                    </div>
                `;
            });
            html += `</div>`;
            weatherDiv.innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
        weatherDiv.innerHTML = '<p style="color: red;">Error failed to fetch weather data, try again.</p>';
    }
}

function getWeatherIcon(code) {
    const iconMapping = {
        sunny: [0],
        partly_cloudy: [1, 2],
        cloudy: [3],
        rain: [51, 53, 55, 56, 57],
        rain_shower: [61, 63, 65, 80, 81, 82],
        snow_rain: [66, 67],
        snow: [71, 73, 75, 77, 85, 86],
        fog: [45, 48],
        storm: [95, 96, 99],
    };
    for (const [icon, codes] of Object.entries(iconMapping)) {
        if (codes.includes(code)) {
            return `${icon}.png`;
        }
    }
    return 'unknown.png';
}

function getWeatherDescription(code) {
    const descriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Drizzle: Light intensity",
        53: "Drizzle: Moderate intensity",
        55: "Drizzle: Dense intensity",
        56: "Freezing Drizzle: Light intensity",
        57: "Freezing Drizzle: Dense intensity",
        61: "Rain: Slight intensity",
        63: "Rain: Moderate intensity",
        65: "Rain: Heavy intensity",
        66: "Freezing Rain: Light intensity",
        67: "Freezing Rain: Heavy intensity",
        71: "Snow fall: Slight intensity",
        73: "Snow fall: Moderate intensity",
        75: "Snow fall: Heavy intensity",
        77: "Snow grains",
        80: "Rain showers: Slight",
        81: "Rain showers: Moderate",
        82: "Rain showers: Violent",
        85: "Snow showers: Slight",
        86: "Snow showers: Heavy",
        95: "Thunderstorm: Slight or moderate",
        96: "Thunderstorm with hail: Slight",
        99: "Thunderstorm with hail: Heavy",
    };
    return descriptions[code] || "Unknown weather";
}

function updateSelectedPlace(content) {
    placeDetailsDiv.innerHTML = `
        <div>
            ${content}
            <button id="add-to-list-button">Add to List</button>
        </div>
    `;

    document.getElementById('add-to-list-button').addEventListener('click', () => {
        const category = categoryMapping[placeTypeSelect.value];
        console.log("Adding to list:", { category, content });
        addToList(category, content);
    });
}

async function addToList(category, place) {
    try {
        const response = await fetch('/api/add_to_list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                category: category || "Unknown Category",
                place: { name: place }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error(`Error adding to list: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function generateList(data) {
    listsContainer.innerHTML = '';

    data.forEach((city) => {
        const cityItem = document.createElement('div');
        cityItem.classList.add('list-item');
        cityItem.textContent = city.name;

        const categoryList = document.createElement('div');
        categoryList.classList.add('nested-list');

        city.categories.forEach((category) => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('list-item');
            categoryItem.textContent = category.name;

            const placesList = document.createElement('div');
            placesList.classList.add('nested-list');

            category.places.forEach((place) => {
                const placeItem = document.createElement('div');
                placeItem.classList.add('list-item');
                placeItem.textContent = place.name;
                placesList.appendChild(placeItem);
            });

            categoryItem.addEventListener('click', () => {
                placesList.classList.toggle('active');
            });

            categoryList.appendChild(categoryItem);
            categoryList.appendChild(placesList);
        });

        cityItem.addEventListener('click', () => {
            categoryList.classList.toggle('active');
        });

        listsContainer.appendChild(cityItem);
        listsContainer.appendChild(categoryList);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setDateLimits();
});

placeInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        await searchLocations();
    }
});

searchButton.addEventListener('click', async() => {
    if (!selectedLocation) {
        weatherDiv.innerHTML = '<p style="color: red;">Select a location first!</p>';
        return;
    }

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        weatherDiv.innerHTML = '<p style="color: red;">Select both dates.</p>';
        return;
    }
    await displayWeather(selectedLocation, startDate, endDate);
    clearMarkers();
    initializeMap(selectedLocation.latitude, selectedLocation.longitude);
    if (currentCustomMarker) {
        map.removeLayer(currentCustomMarker);
        currentCustomMarker = null;
    }
    currentCustomMarker = L.marker([selectedLocation.latitude, selectedLocation.longitude], { icon: customIcon }).addTo(map);

});

nearbyButton.addEventListener('click', async () => {
    if (!selectedLocation) {
        nearbyPlacesDiv.innerHTML = '<p style="color: red;">Select a location first!</p>';
        return;
    }
    const placeType = placeTypeSelect.value;
    const radius = radiusSelect.value;
    try {
        const response = await fetch(`/api/nearby_places?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&place_type=${encodeURIComponent(placeType)}&radius=${radius}`);
        const data = await response.json();
        clearMarkers();
        nearbyPlacesDiv.innerHTML = '';
        if (data.error) {
            nearbyPlacesDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
        } else {
            data.forEach(place => {
                addMarker(place.latitude, place.longitude, place.address);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        nearbyPlacesDiv.innerHTML = '<p style="color: red;">Error, try again.</p>';
    }
});

listsButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/get_all_lists');
        const data = await response.json();
        generateList(data);
    } catch (error) {
        console.error('Error fetching lists:', error);
    }
});
