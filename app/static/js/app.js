const weatherDiv = document.getElementById('weather');
const placeTypeSelect = document.getElementById('place-type');
const radiusSelect = document.getElementById('radius');
const nearbyButton = document.getElementById('nearby-button');
const searchingNearbyDiv = document.getElementById('nearby-places');
const selectedPlacesDiv = document.getElementById('selected-places');
const placeDetailsDiv = document.getElementById('place-details');
const addToListButton = document.getElementById('add-to-list-button');
const placeInput = document.getElementById('place-input');
const resultsDiv = document.getElementById('results');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const errorsDiv = document.getElementById('errors');
const searchButton = document.getElementById('search-button');
const listsButton = document.getElementById('lists-button');
const listErrorsDiv = document.getElementById('list-errors');
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

function displayMessage(targetElement, message, type = 'error') {
    let color = 'red';
    if (type === 'info') color = 'white';

    targetElement.innerHTML = `<p style="color: ${color};">${message}</p>`;
}

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

    marker.on('click', async () => {
        selectedPlacesDiv.classList.remove('hidden');
        await updateSelectedPlace(text);
    });
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

async function searchLocations() {
    const query = placeInput.value.trim();
    if (!query) {
        displayMessage(resultsDiv, 'Enter a place first!', 'error');
        return;
    }
    try {
        const response = await fetch(`/location/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        resultsDiv.innerHTML = '';
        searchingNearbyDiv.innerHTML = '';
        if (data.error) {
            displayMessage(resultsDiv, data.error, 'error');
        } else {
            data.forEach(location => {
                const div = document.createElement('div');
                div.className = 'location';
                div.textContent = `${location.display_name}`;
                div.dataset.location = JSON.stringify(location);
                div.addEventListener('click', () => {
                    clearSelectedPlace();
                    placeInput.value = location.display_name;
                    selectedLocation = location;
                    selectLocation(location);
                    resultsDiv.innerHTML = '';
                    initializeMap(location.latitude, location.longitude);

                    if (currentCustomMarker) {
                        map.removeLayer(currentCustomMarker);
                    }

                    currentCustomMarker = L.marker([location.latitude, location.longitude], { icon: customIcon }).addTo(map);
                    currentCustomMarker.bindPopup(location.display_name).openPopup();
                });
                resultsDiv.appendChild(div);
            });
        }
    } catch (error) {
        displayMessage(resultsDiv, 'Unable to load location data. Please try again later.', 'error');
    }
}

async function selectLocation(location) {
    try {
        const response = await fetch('/location/select_location', {
            method: 'POST',
            body: JSON.stringify(location),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.error) {
            displayMessage(resultsDiv, data.error, 'error');
        }
    } catch (error) {
        displayMessage(resultsDiv, 'Unable to select location. Please try again.', 'error');
    }
}

function setDateLimits() {

    const minDate = new Date('2024-10-01');
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
        const response = await fetch(`/weather/weather?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();
        if (data.error) {
            displayMessage(weatherDiv, data.error, 'error');
        } else {
            const forecast = data.forecast;
            let locationName = location.street ? `${location.street}, ${location.city}` : location.city;
            let html = `<h2>Weather forecast for ${locationName} (${startDate} to ${endDate})</h2><div class="forecast">`;
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
        displayMessage(weatherDiv, 'Unable to load weather data. Please try again.', 'error');
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

async function restoreSelectedLocation() {
    try {
        const response = await fetch('/location/get_saved_data');
        const data = await response.json();

        if (data.error || !data.selected_location) {
            console.log("No previous location.");
            return;
        }
        console.log("Restoring location:", data);

        selectedLocation = data.selected_location;
        placeInput.value = selectedLocation.display_name;

        initializeMap(selectedLocation.latitude, selectedLocation.longitude);
        currentCustomMarker = L.marker([selectedLocation.latitude, selectedLocation.longitude], { icon: customIcon }).addTo(map);
        currentCustomMarker.bindPopup(selectedLocation.display_name).openPopup();

        if (data.start_date && data.end_date) {
            startDateInput.value = data.start_date;
            endDateInput.value = data.end_date;
            weatherDiv.classList.remove('hidden');
            await displayWeather(selectedLocation, data.start_date, data.end_date);
        }

        if (data.selected_nearby_place) {
            selectedPlacesDiv.classList.remove('hidden');
            await updatePlacesNear();
            await updateSelectedPlace(data.selected_nearby_place);
        }
    } catch (error) {
        displayMessage(errorsDiv, 'Unable to load previous location.', 'error');
    }
}

async function updatePlacesNear(){
    if (!selectedLocation) {
        displayMessage(searchingNearbyDiv, 'Select a location first!', 'error');
        return;
    }
    const placeType = placeTypeSelect.value;
    const radius = radiusSelect.value;
    try {
        displayMessage(searchingNearbyDiv, 'Loading nearby places...', 'info');
        const response = await fetch(`/nearby/nearby_places?place_type=${encodeURIComponent(placeType)}&radius=${radius}`);
        const data = await response.json();

        clearMarkers();
        searchingNearbyDiv.innerHTML = '';

        if (data.error) {
            displayMessage(searchingNearbyDiv, data.error, 'error');
        } else {
            data.forEach(place => {
                addMarker(place.latitude, place.longitude, place.address);
            });
        }
    } catch (error) {
        displayMessage(searchingNearbyDiv, 'Unable to load nearby places. Please try again.', 'error');
    }
}

async function updateSelectedPlace(placeContent) {
    try {
        const response = await fetch('/nearby/select_nearby_place', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ placeContent })
        });

        const data = await response.json();

        if (data.error) {
            displayMessage(placeDetailsDiv, data.error, 'error');
        }
    } catch (error) {
        displayMessage(placeDetailsDiv, 'Unable to show place details. Please try again later.', 'error');
    }

    placeDetailsDiv.innerHTML = placeContent;

    addToListButton.classList.remove('hidden');
    addToListButton.onclick = async () => {
        const category = categoryMapping[placeTypeSelect.value];
        await addToList(category, placeContent);
    };

}

async function addToList(category, place) {
    if (!category || !place) {
        displayMessage(placeDetailsDiv, 'Missing category or place.', 'error');
        return;
    }
    try {
        const response = await fetch('/list_management/add_to_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, place })
        });

        const data = await response.json();

        if (data.error) {
            displayMessage(placeDetailsDiv, data.error, 'error');
        } else {
            await refreshLists();
            addToListButton.classList.add('hidden');
        }
    } catch (error) {
        displayMessage(placeDetailsDiv, 'Unable to add place to list. Please try again.', 'error');
    }
}

async function refreshLists() {
    try {
        const response = await fetch('/list_management/get_all_lists');
        const data = await response.json();

        if (data.error) {
            displayMessage(listErrorsDiv, data.error, 'error');
        } else {
            generateList(data);
        }
    } catch (error) {
        displayMessage(placeDetailsDiv, 'Unable to refresh list. Please try again.', 'error');
    }
}

function generateList(data) {
    listsContainer.innerHTML = '';

    data.forEach((list) => {
        const listItem = document.createElement('div');
        listItem.classList.add('list-item');

        const locationName = list.street ? `${list.street}, ${list.city}` : list.city;
        listItem.textContent = `${locationName} (${list.start_date} - ${list.end_date})`;

        const categoryList = document.createElement('div');
        categoryList.classList.add('nested-list');

        list.categories.forEach((category) => {
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
        listItem.addEventListener('click', () => {
            categoryList.classList.toggle('active');
        });
        listsContainer.appendChild(listItem);
        listsContainer.appendChild(categoryList);
    });
}

async function clearSelectedPlace() {
    selectedPlacesDiv.classList.add('hidden');
    placeDetailsDiv.innerHTML = '';
    addToListButton.classList.add('hidden');
    clearMarkers();

    if (sessionStorage.getItem('selectedPlace')) {
        sessionStorage.removeItem('selectedPlace');

        try {
            await fetch('/nearby/clear_selected_place', { method: 'POST' });
        } catch (error) {
            console.error('Failed to clear selected place:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setDateLimits();

    await restoreSelectedLocation();

    if (!selectedLocation) {
        initializeMap(52.2531944, 20.900499999999997);
    }

    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            const nestedList = item.nextElementSibling;
            if (nestedList && nestedList.classList.contains('nested-list')) {
                nestedList.classList.toggle('active');
            }
        });
    });
});

placeInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        displayMessage(resultsDiv, 'Searching...', 'info');
        await searchLocations();
    }
});

searchButton.addEventListener('click', async() => {
    errorsDiv.innerHTML = '';
    if (!selectedLocation) {
        if (placeInput.value === '')
            displayMessage(resultsDiv, 'Select a location first!', 'error');
        else
            displayMessage(resultsDiv, 'Press enter after filling location.', 'error');
        return;
    }

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        displayMessage(errorsDiv, 'Select both dates.', 'error');
        return;
    }
    try {
        await displayWeather(selectedLocation, startDate, endDate);
        weatherDiv.classList.remove('hidden');
        selectedPlacesDiv.classList.remove('hidden');
        searchingNearbyDiv.innerHTML = '';
        placeDetailsDiv.innerHTML = '';
    } catch (error) {
        displayMessage(errorsDiv, 'Unable to load weather data. Please try again later.', 'error');
    }
});

nearbyButton.addEventListener('click', async () => {
    await updatePlacesNear();
});

listsButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/list_management/get_all_lists');
        const data = await response.json();

        if (data.error) {
            displayMessage(listErrorsDiv, data.error, 'error');
        } else if (data.length === 0) {
            displayMessage(listErrorsDiv, 'No list found.', 'info');
        } else {
            listErrorsDiv.innerHTML = '';
            generateList(data);
            listsContainer.classList.remove('hidden');
        }
    } catch (error) {
        displayMessage(listErrorsDiv, 'Unable to load lists. Please try again.', 'error');
    }
});
