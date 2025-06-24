from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import supabase

gps_bp = Blueprint('gps', __name__)

@gps_bp.route('/locations', methods=['POST'])
@jwt_required()
def save_location():
    user_id = get_jwt_identity()
    data = request.json
    loc_data = {
        "user_id": user_id,
        "latitude": data['lat'],
        "longitude": data['lng']
    }
    try:
        supabase.table('Location').insert(loc_data).execute()
    except Exception as e:
        return jsonify({"msg": "Failed to save location.", "error": str(e)}), 500
    return jsonify({"msg": "Location saved."})