#!/usr/bin/env python3
"""
Simple test script to check if the backend routes are working
"""

import requests
import json

# Update this URL to match your backend
BASE_URL = "https://7869-2603-7000-2df0-78f0-40bb-6a09-44a8-ff05.ngrok-free.app"

def test_get_shapes():
    """Test getting shapes without auth (should fail)"""
    try:
        response = requests.get(f"{BASE_URL}/map/shapes")
        print(f"GET /map/shapes (no auth): {response.status_code}")
        if response.status_code != 401:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing GET /map/shapes: {e}")

def test_patch_shape():
    """Test patching a shape without auth (should fail)"""
    try:
        response = requests.patch(f"{BASE_URL}/map/shapes/test-id", 
                                json={"name": "Test Route"})
        print(f"PATCH /map/shapes/test-id (no auth): {response.status_code}")
        if response.status_code != 401:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing PATCH /map/shapes: {e}")

def test_delete_shape():
    """Test deleting a shape without auth (should fail)"""
    try:
        response = requests.delete(f"{BASE_URL}/map/shapes/test-id")
        print(f"DELETE /map/shapes/test-id (no auth): {response.status_code}")
        if response.status_code != 401:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing DELETE /map/shapes: {e}")

if __name__ == "__main__":
    print("Testing backend routes...")
    test_get_shapes()
    test_patch_shape()
    test_delete_shape()
    print("Tests completed.") 