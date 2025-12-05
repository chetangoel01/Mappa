from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import supabase
import os
import uuid
from PIL import Image
import io
import base64

user_bp = Blueprint('users', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    try:
        res = supabase.table('User').select('id, email, name, location, bio, profile_picture, created_at').eq('id', user_id).execute()
    except Exception as e:
        return jsonify({"msg": "Failed to fetch profile.", "error": str(e)}), 500
    
    if not res.data:
        return jsonify({"msg": "User not found."}), 404
    
    user = res.data[0]
    return jsonify({
        "id": user['id'],
        "email": user['email'],
        "name": user.get('name', ''),
        "location": user.get('location', ''),
        "bio": user.get('bio', ''),
        "profile_picture": user.get('profile_picture', ''),
        "join_date": user.get('created_at', '')
    })

@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.json
    
    # Validate required fields
    if not data.get('name') or not data.get('name').strip():
        return jsonify({"msg": "Name is required and cannot be empty."}), 400
    
    update_data = {
        "name": data.get('name').strip(),
        "location": data.get('location', '').strip(),
        "bio": data.get('bio', '').strip(),
        "profile_picture": data.get('profile_picture', '').strip()
    }
    
    try:
        supabase.table('User').update(update_data).eq('id', user_id).execute()
    except Exception as e:
        return jsonify({"msg": "Failed to update profile.", "error": str(e)}), 500
    
    return jsonify({"msg": "Profile updated successfully."})

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
        res = supabase.table('User').select('settings, name, location, bio, profile_picture').eq('id', user_id).execute()
    except Exception as e:
        return jsonify({"msg": "Failed to fetch settings.", "error": str(e)}), 500
    
    if not res.data:
        return jsonify({"msg": "User not found."}), 404
    
    user = res.data[0]
    return jsonify({
        "settings": user.get('settings') or {},
        "profile": {
            "name": user.get('name', ''),
            "location": user.get('location', ''),
            "bio": user.get('bio', ''),
            "profile_picture": user.get('profile_picture', '')
        }
    })

@user_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = get_jwt_identity()
    
    try:
        # Delete user's routes/shapes first (if they exist)
        try:
            supabase.table('Shape').delete().eq('user_id', user_id).execute()
        except Exception:
            pass  # Shape table may not exist
        
        # Delete the user account
        supabase.table('User').delete().eq('id', user_id).execute()
        
        return jsonify({"msg": "Account deleted successfully."}), 200
        
    except Exception as e:
        return jsonify({"msg": "Failed to delete account.", "error": str(e)}), 500

@user_bp.route('/profile/image', methods=['POST'])
@jwt_required()
def upload_profile_image():
    user_id = get_jwt_identity()
    
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({"msg": "No image file provided."}), 400
        
        file = request.files['image']
        
        # Validate file
        if file.filename == '':
            return jsonify({"msg": "No file selected."}), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not file.filename.lower().endswith(tuple('.' + ext for ext in allowed_extensions)):
            return jsonify({"msg": "Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed."}), 400
        
        # Check file size (max 5MB)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({"msg": "File too large. Maximum size is 5MB."}), 400
        
        # Process and resize image
        try:
            img = Image.open(file.stream)
            
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize to 200x200 for profile image
            img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            # Save to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG', quality=85)
            img_bytes.seek(0)
            
            # For now, we'll store the image as base64 in the database
            # In production, you'd upload to a cloud service like AWS S3
            img_base64 = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
            image_url = f"data:image/jpeg;base64,{img_base64}"
            
        except Exception as e:
            return jsonify({"msg": "Failed to process image.", "error": str(e)}), 400
        
        # Update user profile with new image
        try:
            supabase.table('User').update({"profile_picture": image_url}).eq('id', user_id).execute()
        except Exception as e:
            return jsonify({"msg": "Failed to update profile.", "error": str(e)}), 500
        
        return jsonify({
            "msg": "Profile image updated successfully.",
            "image_url": image_url
        }), 200
        
    except Exception as e:
        return jsonify({"msg": "Failed to upload image.", "error": str(e)}), 500

@user_bp.route('/profile/image', methods=['DELETE'])
@jwt_required()
def delete_profile_image():
    user_id = get_jwt_identity()
    
    try:
        # Remove profile picture from user
        supabase.table('User').update({"profile_picture": None}).eq('id', user_id).execute()
        
        return jsonify({"msg": "Profile image deleted successfully."}), 200
        
    except Exception as e:
        return jsonify({"msg": "Failed to delete profile image.", "error": str(e)}), 500