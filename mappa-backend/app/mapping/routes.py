import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
# from .. import db
# from ..models import ShapeRoute
from .. import supabase

mapping_bp = Blueprint('mapping', __name__)

ORS_API_KEY = os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions"

# Helper: convert meters to degrees (approx)
def meters_to_degrees(meters):
    return meters / 111000.0

# Optional: generate fallback shapes
def generate_shape(shape_type, start, distance):
    lat, lng = start
    delta = meters_to_degrees(distance)

    if shape_type == 'square':
        return [
            [lng, lat],
            [lng + delta, lat],
            [lng + delta, lat + delta],
            [lng, lat + delta],
            [lng, lat]
        ]
    elif shape_type == 'triangle':
        return [
            [lng, lat],
            [lng + delta, lat],
            [lng + delta / 2, lat + delta],
            [lng, lat]
        ]
    else:
        raise ValueError(f"Unsupported shape: {shape_type}")

# Snap route using ORS
def snap_to_roads_ors(coords, mode='foot-walking'):
    url = f"{ORS_BASE_URL}/{mode}/geojson"
    headers = {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
    }
    payload = {
        "coordinates": coords
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        return response.json()['features'][0]['geometry']['coordinates']
    else:
        raise Exception(f"ORS error {response.status_code}: {response.text}")

@mapping_bp.route('/shape', methods=['POST'])
@jwt_required()
def map_shape():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        mode = data.get('mode', 'foot-walking')
        if 'geometry' in data:
            coords = data['geometry']
            if not isinstance(coords, list) or not all(isinstance(c, list) and len(c) == 2 for c in coords):
                return jsonify({"error": "Invalid 'geometry' format"}), 400
        elif 'start' in data and 'shape' in data:
            start = data['start']
            shape_type = data['shape']
            distance = data.get('distance', 1000)
            coords = generate_shape(shape_type, start, distance)
        else:
            return jsonify({
                "error": "Provide either 'geometry' (list of coordinates) or both 'start' and 'shape'"
            }), 400
        snapped = snap_to_roads_ors(coords, mode)
        shape = {
            "user_id": user_id,
            "original_shape": coords,
            "snapped_route": snapped,
            "mode": mode
        }
        try:
            supabase.table('ShapeRoute').insert(shape).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        return jsonify({
            "msg": "Route snapped and saved successfully",
            "snapped": snapped
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@mapping_bp.route('/shapes', methods=['GET'])
@jwt_required()
def get_shapes():
    try:
        user_id = get_jwt_identity()
        try:
            res = supabase.table('ShapeRoute').select('*').eq('user_id', user_id).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        shapes = res.data
        return jsonify({
            "shapes": [
                {
                    "id": s['id'],
                    "original_shape": s['original_shape'],
                    "snapped_route": s['snapped_route'],
                    "mode": s['mode'],
                    "created_at": s.get('created_at')
                } for s in shapes
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@mapping_bp.route('/shape-from-location', methods=['POST'])
@jwt_required()
def shape_from_location():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        start = data.get('start')  # [lat, lng]
        if not start:
            return jsonify({"error": "Missing 'start' (user's current location)"}), 400

        shape_type = data.get('shape', 'square')
        distance = data.get('distance', 1000)  # default 1000 meters
        mode = data.get('mode', 'foot-walking')

        # Generate shape
        shape_coords = generate_shape(shape_type, start, distance)
        snapped = snap_to_roads_ors(shape_coords, mode)

        # Save shape
        shape = {
            "user_id": user_id,
            "original_shape": shape_coords,
            "snapped_route": snapped,
            "mode": mode
        }
        try:
            supabase.table('ShapeRoute').insert(shape).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return jsonify({
            "msg": "Route snapped successfully from location and shape",
            "original_shape": shape_coords,
            "snapped": snapped
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
