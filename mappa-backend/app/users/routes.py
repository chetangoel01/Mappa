from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import supabase

user_bp = Blueprint('users', __name__)

@user_bp.route('/settings', methods=['GET', 'POST'])
@jwt_required()
def user_settings():
    user_id = get_jwt_identity()
    if request.method == 'POST':
        settings = request.json
        try:
            supabase.table('User').update({"settings": settings}).eq('id', user_id).execute()
        except Exception as e:
            return jsonify({"msg": "Failed to update settings.", "error": str(e)}), 500
        return jsonify({"msg": "Settings updated."})
    # GET
    try:
        res = supabase.table('User').select('settings').eq('id', user_id).execute()
    except Exception as e:
        return jsonify({}), 404
    if not res.data:
        return jsonify({}), 404
    return jsonify(res.data[0]['settings'] or {})