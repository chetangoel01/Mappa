import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from shapely.geometry import LineString

from .. import supabase

mapping_bp = Blueprint('mapping', __name__)

ORS_API_KEY = os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions"


def meters_to_degrees(meters):
    return meters / 111000.0


def snap_waypoints_to_route(coords, mode='foot-walking'):
    url = f"{ORS_BASE_URL}/{mode}/geojson"
    headers = {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
    }
    payload = {
        "coordinates": coords,
        "instructions": True  # ORS directions added - enable turn-by-turn instructions
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # ORS directions added - extract both geometry and directions
        geometry = data['features'][0]['geometry']['coordinates']
        directions = data['features'][0]['properties']['segments'][0]['steps'] if 'segments' in data['features'][0]['properties'] else []
        return geometry, directions
    else:
        raise Exception(f"ORS error {response.status_code}: {response.text}")


def generate_google_maps_url(snapped_route):
    """Generate Google Maps URL with waypoints, respecting the 5 waypoint limit
    
    Google Maps has a limitation of maximum 5 waypoints in the URL.
    For longer routes, we strategically select key points to represent the route.
    """
    if not snapped_route or len(snapped_route) < 2:
        return None
    
    # Google Maps allows max 5 waypoints, so we need to be strategic
    # Use start, end, and a few key points in between
    waypoints = []
    
    if len(snapped_route) <= 5:
        # If we have 5 or fewer points, use them all
        waypoints = [f"{lat},{lng}" for lng, lat in snapped_route]
    else:
        # For longer routes, use start, end, and a few strategic points
        waypoints.append(f"{snapped_route[0][1]},{snapped_route[0][0]}")  # Start
        
        # Add middle points if route is long enough
        if len(snapped_route) > 2:
            # Add a point around 1/3 of the way
            third_index = len(snapped_route) // 3
            waypoints.append(f"{snapped_route[third_index][1]},{snapped_route[third_index][0]}")
            
            # Add a point around 2/3 of the way if we have room
            if len(snapped_route) > 4:
                two_thirds_index = (2 * len(snapped_route)) // 3
                waypoints.append(f"{snapped_route[two_thirds_index][1]},{snapped_route[two_thirds_index][0]}")
        
        # Add end point
        waypoints.append(f"{snapped_route[-1][1]},{snapped_route[-1][0]}")
    
    # Join waypoints with | separator
    waypoints_str = "|".join(waypoints)
    
    return f"https://www.google.com/maps/dir/?api=1&travelmode=walking&waypoints={waypoints_str}"


@mapping_bp.route('/shape', methods=['POST'])
@jwt_required()
def map_shape():
    """Save a route to database (assumes route is already snapped)"""
    print("DEBUG: /shape endpoint called - SAVING TO DATABASE ONLY")
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        mode = data.get('mode', 'foot-walking')
        name = data.get('name', f"Route {user_id}")

        # Expect already snapped route
        snapped = data.get('snapped_route')
        coords = data.get('geometry')
        
        if not snapped or not isinstance(snapped, list):
            return jsonify({"error": "Missing or invalid 'snapped_route' - use /snap-and-save to snap and save in one operation"}), 400
            
        if not coords or not isinstance(coords, list) or not all(isinstance(c, list) and len(c) == 2 for c in coords):
            return jsonify({"error": "Invalid or missing 'geometry' format"}), 400

        # Get directions from the snapped route data if provided
        directions = data.get('directions', [])

        shape = {
            "user_id": user_id,
            "name": name,
            "original_shape": coords,
            "snapped_route": snapped,
            "mode": mode,
            "directions": directions
        }
        try:
            res = supabase.table('ShapeRoute').insert(shape).execute()
            shape_id = res.data[0]['id'] if res.data else None
            print(f"DEBUG: /shape endpoint - saved route to DB with ID: {shape_id}, name: {name}")
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        export_url = generate_google_maps_url(snapped)

        return jsonify({
            "msg": "Route saved successfully",
            "shape_id": shape_id,
            "name": name,
            "snapped": snapped,
            "directions": directions,
            "export_url": export_url
        }), 200

    except Exception as e:
        print(f"DEBUG: /shape endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/snap-and-save', methods=['POST'])
@jwt_required()
def snap_and_save_shape():
    """Snap route and save to database in one operation"""
    print("DEBUG: /snap-and-save endpoint called - SNAPPING AND SAVING")
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        mode = data.get('mode', 'foot-walking')
        name = data.get('name', f"Route {user_id}")

        coords = data.get('geometry')
        if not coords or not isinstance(coords, list) or not all(isinstance(c, list) and len(c) == 2 for c in coords):
            return jsonify({"error": "Invalid or missing 'geometry' format"}), 400

        # Snap route and get directions
        snapped, directions = snap_waypoints_to_route(coords, mode)

        shape = {
            "user_id": user_id,
            "name": name,
            "original_shape": coords,
            "snapped_route": snapped,
            "mode": mode,
            "directions": directions
        }
        try:
            res = supabase.table('ShapeRoute').insert(shape).execute()
            shape_id = res.data[0]['id'] if res.data else None
            print(f"DEBUG: /snap-and-save endpoint - saved route to DB with ID: {shape_id}, name: {name}")
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        export_url = generate_google_maps_url(snapped)

        return jsonify({
            "msg": "Route snapped and saved successfully",
            "shape_id": shape_id,
            "name": name,
            "snapped": snapped,
            "directions": directions,
            "export_url": export_url
        }), 200

    except Exception as e:
        print(f"DEBUG: /snap-and-save endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/shapes', methods=['GET'])
@jwt_required()
def get_shapes():
    try:
        user_id = get_jwt_identity()
        try:
            res = supabase.table('ShapeRoute').select('*').eq('user_id', user_id).execute()
            print(f"Supabase query result: {res.data}")
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        shapes = res.data
        return jsonify({
            "shapes": [
                {
                    "id": s['id'],
                    "name": s.get('name', f"Route {s['id']}"),
                    "original_shape": s['original_shape'],
                    "snapped_route": s['snapped_route'],
                    "mode": s['mode'],
                    "created_at": s.get('created_at'),
                    "directions": s.get('directions', []),  # ORS directions added - include directions in response
                    "export_url": generate_google_maps_url(s.get('snapped_route')) if s.get('snapped_route') else None
                } for s in shapes
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/shapes/<shape_id>', methods=['GET'])
@jwt_required()
def get_shape_by_id(shape_id):
    try:
        user_id = get_jwt_identity()
        try:
            res = supabase.table('ShapeRoute').select('*').eq('id', shape_id).eq('user_id', user_id).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        if not res.data:
            return jsonify({"error": "Route not found"}), 404

        shape = res.data[0]
        export_url = generate_google_maps_url(shape['snapped_route'])

        return jsonify({
            "id": shape['id'],
            "name": shape.get('name', f"Route {shape['id']}"),
            "original_shape": shape['original_shape'],
            "snapped_route": shape['snapped_route'],
            "mode": shape['mode'],
            "created_at": shape.get('created_at'),
            "user_id": shape['user_id'],
            "directions": shape.get('directions', []),  # ORS directions added - include directions in response
            "export_url": export_url
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/shapes/<shape_id>', methods=['PUT'])
@jwt_required()
def update_shape(shape_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        coords = data.get('geometry')
        mode = data.get('mode', 'foot-walking')

        if not coords or not isinstance(coords, list) or not all(isinstance(c, list) and len(c) == 2 for c in coords):
            return jsonify({"error": "Invalid or missing 'geometry' format"}), 400

        # ORS directions added - re-snap route and get updated directions
        snapped, directions = snap_waypoints_to_route(coords, mode)

        update_data = {
            "original_shape": coords,
            "snapped_route": snapped,
            "mode": mode,
            "directions": directions  # ORS directions added - store updated directions
        }

        try:
            supabase.table('ShapeRoute').update(update_data).eq('id', shape_id).eq('user_id', user_id).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return jsonify({"msg": "Route updated successfully", "snapped": snapped, "directions": directions}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/shapes/<shape_id>', methods=['PATCH'])
@jwt_required()
def patch_shape(shape_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        print(f"PATCH request for shape {shape_id} by user {user_id}")
        print(f"Request data: {data}")
        
        # Only allow updating specific fields that don't require re-snapping
        allowed_updates = {}
        if 'name' in data:
            allowed_updates['name'] = data['name']
        if 'mode' in data:
            allowed_updates['mode'] = data['mode']
        
        if not allowed_updates:
            return jsonify({"error": "No valid fields to update"}), 400

        print(f"Allowed updates: {allowed_updates}")

        try:
            result = supabase.table('ShapeRoute').update(allowed_updates).eq('id', shape_id).eq('user_id', user_id).execute()
            print(f"Supabase update result: {result}")
        except Exception as e:
            print(f"Supabase error: {e}")
            return jsonify({"error": str(e)}), 500

        return jsonify({"msg": "Route updated successfully", "updated_fields": allowed_updates}), 200
    except Exception as e:
        print(f"PATCH endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/shapes/<shape_id>', methods=['DELETE'])
@jwt_required()
def delete_shape(shape_id):
    try:
        user_id = get_jwt_identity()
        try:
            supabase.table('ShapeRoute').delete().eq('id', shape_id).eq('user_id', user_id).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return jsonify({"msg": "Route deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mapping_bp.route('/snap', methods=['POST'])
@jwt_required()
def snap_route():
    """Snap route without saving to database - returns snapped route and directions only"""
    print("DEBUG: /snap endpoint called - SNAPPING ONLY, NOT SAVING")
    try:
        data = request.get_json()
        mode = data.get('mode', 'foot-walking')

        coords = data.get('geometry')
        if not coords or not isinstance(coords, list) or not all(isinstance(c, list) and len(c) == 2 for c in coords):
            return jsonify({"error": "Invalid or missing 'geometry' format"}), 400

        # Snap route and get directions
        snapped, directions = snap_waypoints_to_route(coords, mode)

        export_url = generate_google_maps_url(snapped)

        print("DEBUG: /snap endpoint - returning snapped route without saving to DB")
        return jsonify({
            "msg": "Route snapped successfully",
            "snapped": snapped,
            "directions": directions,
            "export_url": export_url
        }), 200

    except Exception as e:
        print(f"DEBUG: /snap endpoint error: {e}")
        return jsonify({"error": str(e)}), 500
