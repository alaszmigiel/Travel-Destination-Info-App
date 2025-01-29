from flask import Blueprint, request, jsonify, session
from geopy.geocoders import Nominatim

location_bp = Blueprint('location', __name__)
geolocator = Nominatim(user_agent="TravelDestinationInfoApp", timeout=10)

@location_bp.route('/search', methods=['GET'])
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
            return jsonify(results)
        else:
            return jsonify({"error": "Location not found"}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred: " + str(e)}), 400


@location_bp.route('/select_location', methods=['POST'])
def select_location():
    data = request.json
    if not data or not data.get('latitude') or not data.get('longitude'):
        return jsonify({"error": "Invalid location data"}), 400

    session['selected_location'] = {
        "latitude": data['latitude'],
        "longitude": data['longitude'],
        "display_name": data.get('display_name', 'Unknown location'),
        "city": data.get("city", "Unknown City"),
        "street": data.get("street", None)
    }

    return jsonify({"location": session['selected_location']}), 200


@location_bp.route('/get_saved_data', methods=['GET'])
def get_saved_data():
    return jsonify({
        "selected_location": session.get('selected_location'),
        "start_date": session.get('start_date'),
        "end_date": session.get('end_date'),
        "selected_nearby_place": session.get('selected_nearby_place')
    })
