from flask import Flask, render_template, request, jsonify
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from datetime import datetime
import requests

app = Flask(__name__)
geolocator = Nominatim(user_agent="TravelDestinationInfoApp", timeout=10)

selected_location = {}
saved_places = {}

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Empty query'}), 400
    try:
        locations = geolocator.geocode(query, exactly_one=False, limit=10, addressdetails=True)
        if locations:
            results = []
            for location in locations:
                address_details = location.raw.get("address", {})
                city = address_details.get("city") or address_details.get("town") or address_details.get("village")
                street = address_details.get("road")

                if not city:
                    continue

                results.append({
                    "display_name": location.address,
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                    "city": city,
                    "street": street
                })
            print("Search results:", results)
            return jsonify(results)
        else:
            return jsonify({"error": "Location not found"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/select_location', methods=['POST'])
def select_location():
    global selected_location

    data = request.json

    if not data or not data.get('latitude') or not data.get('longitude'):
        return jsonify({"error": "Invalid location data"}), 400
    print("Received data", data)

    city = data.get("city", "Unknown City")
    street = data.get("street", None)
    selected_location = {
        "latitude": data['latitude'],
        "longitude": data['longitude'],
        "display_name": data.get('display_name', 'Unknown location'),
        "city": city,
        "street": street
    }
    return jsonify({ "location": selected_location}), 200


@app.route('/api/weather', methods=['GET'])
def weather():
    global selected_location

    if not selected_location:
        return jsonify({"error": "Location not found"}), 400

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({"error": "Start date and end date are required"}), 400

    try:
        latitude = selected_location['latitude']
        longitude = selected_location['longitude']

        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        if (end - start).days > 14 or (end - start).days < 0:
            return jsonify({"error": "Date range must be within 14 days"}), 400

        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date={start_date}&end_date={end_date}"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            daily = data.get("daily", {})
            daily_result = []
            for i in range(len(daily["time"])):
                daily_result.append({
                    "date": daily["time"][i],
                    "temp_day": daily["temperature_2m_max"][i],
                    "temp_night": daily["temperature_2m_min"][i],
                    "weathercode": daily["weathercode"][i]
                })
            return jsonify({"forecast": daily_result})
        else:
            return jsonify({"error": "Weather forecast not found"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/nearby_places', methods=['GET'])
def nearby_places():
    global selected_location

    if not selected_location:
        return jsonify({"error": "Location not found"}), 400

    place_type = request.args.get('place_type')
    radius = request.args.get('radius')
    radius = float(radius)

    if radius is None:
        return jsonify({"error": "Radius not provided"}), 400

    if place_type is None:
        return jsonify({"error": "Place type not provided"}), 400

    try:
        latitude = selected_location['latitude']
        longitude = selected_location['longitude']
        query = f"{place_type} near {latitude}, {longitude}"
        locations = geolocator.geocode(query, exactly_one=False, limit=100)
        if locations:
            places_near_location = []
            for location in locations:
                place_coords = (location.latitude, location.longitude)
                distance = geodesic((float(latitude), float(longitude)), place_coords).kilometers
                if distance <= radius / 1000:
                    places_near_location.append({
                        "address": location.address,
                        "latitude": location.latitude,
                        "longitude": location.longitude,
                        "distance": round(distance, 2)
                    })
            return jsonify(places_near_location)
        else:
            return jsonify({"error": "Location not found"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/add_to_list', methods=['POST'])
def add_to_list():
    global selected_location

    data = request.json

    category = data.get("category")
    place = data.get("place")

    if not category or not place:
        return jsonify({"error": "Category and place are required"}), 400

    city = selected_location.get("city")
    street = selected_location.get("street")

    if not city:
        return jsonify({"error": "City is required"}), 400

    list_name = f"{street}, {city}" if street else city
    print("Generated list name:", list_name)

    if list_name not in saved_places:
        saved_places[list_name] = {}

    if category not in saved_places[list_name]:
        saved_places[list_name][category] = []

    saved_places[list_name][category].append(place)


@app.route('/api/get_all_lists', methods=['GET'])
def get_all_lists():
    result = []
    for list_name, categories in saved_places.items():
        entry = {
            "name": list_name,
            "categories": []
        }
        for category, places in categories.items():
            category_entry = {"name": category, "places": places}
            entry["categories"].append(category_entry)
        result.append(entry)
    return jsonify(result), 200


@app.route('/')
def home():
    return render_template('index.html')


if __name__ == "__main__":
    app.run(debug=True)
