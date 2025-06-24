from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Location
from .. import db

gps_bp = Blueprint('gps', __name__)

@gps_bp.route('/locations', methods=['POST'])
@jwt_required()
def save_location():
    user_id = get_jwt_identity()
    data = request.json
    loc = Location(user_id=user_id, latitude=data['lat'], longitude=data['lng'])
    db.session.add(loc)
    db.session.commit()
    return jsonify({"msg": "Location saved."})