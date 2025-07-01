from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from .. import supabase, bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    # Validate required fields
    if not email or not password or not name:
        return jsonify({"msg": "Email, password, and name are required."}), 400

    # Check if user exists
    res = supabase.table('User').select('id').eq('email', email).execute()
    if res.data:
        return jsonify({"msg": "User already exists."}), 409

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    user_data = {
        "email": email, 
        "password": hashed_pw,
        "name": name
    }
    
    # Only include created_at if the column exists in the database
    # This prevents errors if the migration hasn't been run yet
    try:
        res = supabase.table('User').insert(user_data).execute()
        user_id = res.data[0]['id']
    except Exception as e:
        # If created_at column doesn't exist, try without it
        if "created_at" in str(e):
            user_data["created_at"] = "now()"
            res = supabase.table('User').insert(user_data).execute()
            user_id = res.data[0]['id']
        else:
            return jsonify({"msg": "Registration failed.", "error": str(e)}), 500
    
    # Create token with no expiration for phone app
    token = create_access_token(identity=user_id, expires_delta=False)
    return jsonify({
        "msg": "User registered and logged in.",
        "access_token": token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = data['password']
    try:
        res = supabase.table('User').select('*').eq('email', email).execute()
    except Exception as e:
        return jsonify({"msg": "Login failed.", "error": str(e)}), 500
    if not res.data:
        return jsonify({"msg": "Invalid credentials."}), 401
    user = res.data[0]
    if bcrypt.check_password_hash(user['password'], password):
        # Create token with no expiration for phone app
        token = create_access_token(identity=user['id'], expires_delta=False)
        return jsonify(access_token=token)
    return jsonify({"msg": "Invalid credentials."}), 401