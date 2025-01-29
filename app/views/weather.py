from flask import Blueprint, request, jsonify, session
from datetime import datetime
import requests

weather_bp = Blueprint('weather', __name__)

@weather_bp.route('/weather', methods=['GET'])
def weather():
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not latitude or not longitude:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    if not start_date or not end_date:
        return jsonify({"error": "Start date and end date are required"}), 400

    session['start_date'] = start_date
    session['end_date'] = end_date

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        if (end - start).days > 14 or (end - start).days < 0:
            return jsonify({"error": "Max date range 14 days"}), 400

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
            return jsonify({"error": "Weather forecast not available. Please try again later."}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred: " + str(e)}), 400
