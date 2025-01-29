from flask import Blueprint, request, jsonify, session
from geopy.distance import geodesic
from geopy.geocoders import Nominatim

nearby_places_bp = Blueprint('nearby_places', __name__)
geolocator = Nominatim(user_agent="TravelDestinationInfoApp", timeout=10)

@nearby_places_bp.route('/nearby_places', methods=['GET'])
def nearby_places():
    print(session.get('selected_location'))

    selected_location = session.get('selected_location')

    if not selected_location:
        return jsonify({"error": "Location not found in session"}), 400

    place_type = request.args.get('place_type')
    radius = request.args.get('radius')
    radius = float(radius)

    if radius is None:
        return jsonify({"error": "Radius not provided"}), 400

    if place_type is None:
        return jsonify({"error": "Place type not provided"}), 400

    try:
        query = f"{place_type} near {selected_location['latitude']}, {selected_location['longitude']}"
        locations = geolocator.geocode(query, exactly_one=False, limit=50)
        if locations:
            results = []
            for location in locations:
                place_coords = (location.latitude, location.longitude)
                distance = geodesic(
                    (selected_location['latitude'], selected_location['longitude']),place_coords).kilometers
                if distance <= radius / 1000:
                    results.append({
                        "address": location.address,
                        "latitude": location.latitude,
                        "longitude": location.longitude,
                        "distance": round(distance, 2)
                    })
            return jsonify(results)
        else:
            return jsonify({"error": "Location not found"}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred: " + str(e)}), 400


@nearby_places_bp.route('/select_nearby_place', methods=['POST'])
def select_nearby_place():
    data = request.get_json()

    if not data or 'placeContent' not in data:
        return jsonify({"error": "No place content provided"}), 400

    session['selected_nearby_place'] = data['placeContent']

    return jsonify({"message": "Nearby place saved."})

