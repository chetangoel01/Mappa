from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from ..models import User
from .. import db, bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json

    if User.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "User already exists."}), 409

    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(email=data['email'], password=hashed_pw)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({
        "msg": "User registered and logged in.",
        "access_token": token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()

    print("LOGIN DATA:", data)
    print("USER:", user)

    if user and bcrypt.check_password_hash(user.password, data['password']):
        token = create_access_token(identity=user.id)
        return jsonify(access_token=token)
    return jsonify({"msg": "Invalid credentials."}), 401