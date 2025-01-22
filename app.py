from flask import Flask, render_template, request, jsonify
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import requests

app = Flask(__name__)
geolocator = Nominatim(user_agent="TravelDestinationInfoApp", timeout=10)

selected_location = {}


@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Empty query'}), 400
    try:
        locations = geolocator.geocode(query, exactly_one=False, limit=10)
        if locations:
            results = [{"display_name": loc.address, "latitude": loc.latitude, "longitude": loc.longitude}
                       for loc in locations]
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
    selected_location = {"latitude": data['latitude'], "longitude": data['longitude'],
                         "display_name": data.get('display_name', 'Unknown location')}
    return jsonify({"message": "Location selected", "location": selected_location}), 200


@app.route('/api/weather', methods=['GET'])
def weather():
    global selected_location
    if not selected_location:
        return jsonify({"error": "Location not found"}), 400
    try:
        latitude = selected_location['latitude']
        longitude = selected_location['longitude']
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto"
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
    try:
        radius = float(radius) if radius else 5000
    except ValueError:
        return jsonify({"error": "Invalid radius"}), 400
    if not place_type:
        return jsonify({"error": "Invalid place type"}), 400
    try:
        latitude = selected_location['latitude']
        longitude = selected_location['longitude']
        query = f"{place_type} near {latitude}, {longitude}"
        locations = geolocator.geocode(query, exactly_one=False, limit=100)
        if locations:
            places_near_location = []
            for loc in locations:
                place_coords = (loc.latitude, loc.longitude)
                distance = geodesic((float(latitude), float(longitude)), place_coords).kilometers
                if distance <= radius / 1000:
                    places_near_location.append({
                        "address": loc.address,
                        "latitude": loc.latitude,
                        "longitude": loc.longitude,
                        "distance": round(distance, 2)
                    })
            return jsonify(places_near_location)
        else:
            return jsonify({"error": "Location not found"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/')
def home():
    return render_template('index.html')


if __name__ == "__main__":
    app.run(debug=True)
