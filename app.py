from flask import Flask, render_template, request, jsonify
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import requests

app = Flask(__name__)
geolocator = Nominatim(user_agent="TravelDestinationInfoApp", timeout=10)


@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query not found"}), 400
    try:
        locations = geolocator.geocode(query, exactly_one=False, limit=10)
        if locations:
            results = [{"display_name": loc.address, "latitude": loc.latitude, "longitude": loc.longitude}
                       for loc in locations]
            return jsonify(results)
        else:
            return jsonify({"error": "Place not found"}), 400
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"})


@app.route('/api/weather', methods=['GET'])
def weather():
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')
    if not latitude or not longitude:
        return jsonify({"error": "Latitude/longitude not found"}), 400
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            daily = data.get("daily", {})
            result = []
            for i in range(len(daily["time"])):
                result.append({
                    "date": daily["time"][i],
                    "temp_day": daily["temperature_2m_max"][i],
                    "temp_night": daily["temperature_2m_min"][i],
                    "weathercode": daily["weathercode"][i]
                })
            return jsonify({"forecast": result})
        else:
            return jsonify({"error": "Weather forecast not found"}), 400
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"})


@app.route('/')
def home():
    return render_template('index.html')


if __name__ == "__main__":
    app.run(debug=True)
