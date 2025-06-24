from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from .. import supabase, bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    password = data['password']

    # Check if user exists
    res = supabase.table('User').select('id').eq('email', email).execute()
    if res.data:
        return jsonify({"msg": "User already exists."}), 409

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    user_data = {"email": email, "password": hashed_pw}
    try:
        res = supabase.table('User').insert(user_data).execute()
        user_id = res.data[0]['id']
    except Exception as e:
        return jsonify({"msg": "Registration failed.", "error": str(e)}), 500
    token = create_access_token(identity=user_id)
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
        token = create_access_token(identity=user['id'])
        return jsonify(access_token=token)
    return jsonify({"msg": "Invalid credentials."}), 401