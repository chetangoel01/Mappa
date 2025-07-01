#!/usr/bin/env python3
"""
Test script for profile functionality
"""
import requests
import json

# Update this URL to match your backend URL
BASE_URL = "https://7869-2603-7000-2df0-78f0-40bb-6a09-44a8-ff05.ngrok-free.app"

def test_profile_functionality():
    print("Testing Profile Functionality")
    print("=" * 40)
    
    # Test 1: Register a new user
    print("\n1. Testing user registration...")
    register_data = {
        "email": "test_profile@example.com",
        "password": "testpass123",
        "name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        print(f"Register response status: {response.status_code}")
        if response.status_code == 201:
            register_result = response.json()
            token = register_result.get('access_token')
            print("✓ Registration successful")
            print(f"Token: {token[:20]}...")
        else:
            print(f"✗ Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"✗ Registration error: {e}")
        return
    
    # Test 2: Get profile
    print("\n2. Testing get profile...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/users/profile", headers=headers)
        print(f"Get profile response status: {response.status_code}")
        if response.status_code == 200:
            profile = response.json()
            print("✓ Get profile successful")
            print(f"Name: {profile.get('name')}")
            print(f"Email: {profile.get('email')}")
            print(f"Location: {profile.get('location', 'Not set')}")
            print(f"Bio: {profile.get('bio', 'Not set')}")
        else:
            print(f"✗ Get profile failed: {response.text}")
    except Exception as e:
        print(f"✗ Get profile error: {e}")
    
    # Test 3: Update profile
    print("\n3. Testing update profile...")
    update_data = {
        "name": "Updated Test User",
        "location": "San Francisco, CA",
        "bio": "This is a test bio for the profile update functionality"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/profile", json=update_data, headers=headers)
        print(f"Update profile response status: {response.status_code}")
        if response.status_code == 200:
            print("✓ Update profile successful")
        else:
            print(f"✗ Update profile failed: {response.text}")
    except Exception as e:
        print(f"✗ Update profile error: {e}")
    
    # Test 4: Get updated profile
    print("\n4. Testing get updated profile...")
    try:
        response = requests.get(f"{BASE_URL}/users/profile", headers=headers)
        print(f"Get updated profile response status: {response.status_code}")
        if response.status_code == 200:
            profile = response.json()
            print("✓ Get updated profile successful")
            print(f"Name: {profile.get('name')}")
            print(f"Location: {profile.get('location', 'Not set')}")
            print(f"Bio: {profile.get('bio', 'Not set')}")
        else:
            print(f"✗ Get updated profile failed: {response.text}")
    except Exception as e:
        print(f"✗ Get updated profile error: {e}")
    
    # Test 5: Get settings with profile info
    print("\n5. Testing get settings with profile...")
    try:
        response = requests.get(f"{BASE_URL}/users/settings", headers=headers)
        print(f"Get settings response status: {response.status_code}")
        if response.status_code == 200:
            settings = response.json()
            print("✓ Get settings successful")
            print(f"Settings: {settings.get('settings', {})}")
            print(f"Profile name: {settings.get('profile', {}).get('name')}")
            print(f"Profile location: {settings.get('profile', {}).get('location')}")
        else:
            print(f"✗ Get settings failed: {response.text}")
    except Exception as e:
        print(f"✗ Get settings error: {e}")
    
    print("\n" + "=" * 40)
    print("Profile functionality test completed!")

if __name__ == "__main__":
    test_profile_functionality() 