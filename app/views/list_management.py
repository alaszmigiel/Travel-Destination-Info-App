from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from app.models import db, UserList, Category, Place

list_management_bp = Blueprint('list_management', __name__)

@list_management_bp.route('/add_to_list', methods=['POST'])
@login_required
def add_to_list():
    try:
        selected_location = session.get('selected_location')
        start_date = session.get('start_date')
        end_date = session.get('end_date')

        if not selected_location:
            return jsonify({"error": "Location not found"}), 400
        if not start_date or not end_date:
            return jsonify({"error": "Date range not found"}), 400

        data = request.json
        category_name = data.get("category")
        place_data = data.get("place")

        if not category_name or not place_data:
            return jsonify({"error": "Category and place are required"}), 400

        city = selected_location.get("city")
        street = selected_location.get("street")
        if not city:
            return jsonify({"error": "City is required"}), 400

        user_list = UserList.query.filter_by(
            street=street,
            city=city,
            start_date=start_date,
            end_date=end_date,
            user_id=current_user.id
        ).first()

        if not user_list:
            user_list = UserList(street=street, city=city, start_date=start_date, end_date=end_date,
                                 user_id=current_user.id)
            db.session.add(user_list)

        category = Category.query.filter_by(name=category_name, list_id=user_list.id).first()
        if not category:
            category = Category(name=category_name, list_id=user_list.id)
            db.session.add(category)

        place_name = place_data.get("name") if isinstance(place_data, dict) else place_data
        if not place_name:
            return jsonify({"error": "Invalid place data"}), 400

        existing_place = Place.query.filter_by(name=place_name, category_id=category.id).first()
        if existing_place:
            return jsonify({"error": "Place already exists in this category"}), 400

        new_place = Place(name=place_name, category_id=category.id)
        db.session.add(new_place)
        db.session.commit()

        return jsonify({"message": "Place added successfully"}), 200

    except Exception as e:
        return jsonify({"error": "An unexpected error occurred: " + str(e)}), 400


@list_management_bp.route('/get_all_lists', methods=['GET'])
@login_required
def get_all_lists():
    user_lists = UserList.query.filter_by(user_id=current_user.id).all()

    result = []
    for user_list in user_lists:
        categories = []
        for category in user_list.categories:
            places = [{'id': place.id, 'name': place.name} for place in category.places]
            categories.append({'id': category.id, 'name': category.name, 'places': places})

        result.append({
            'id': user_list.id,
            'street': user_list.street,
            'city': user_list.city,
            'start_date': user_list.start_date,
            'end_date': user_list.end_date,
            'categories': categories
        })

    return jsonify(result), 200

