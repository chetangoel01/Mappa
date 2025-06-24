from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User
from .. import db

user_bp = Blueprint('users', __name__)

@user_bp.route('/settings', methods=['GET', 'POST'])
@jwt_required()
def user_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if request.method == 'POST':
        user.settings = request.json
        db.session.commit()
        return jsonify({"msg": "Settings updated."})

    return jsonify(user.settings or {})