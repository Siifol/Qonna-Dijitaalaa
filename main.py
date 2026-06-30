import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allows your Spck preview and mobile browser to communicate safely with Render
CORS(app) 

# 💾 SIMULATED DATABASE: This dictionary will store users when they register 
# so they can be looked up when they try to log in.
USER_DATABASE = {}

@app.route("/register", methods=["POST"])
def run_registration():
    user_data = request.get_json()
    
    # Safely extract all registration inputs sent by your script.js
    full_name = user_data.get("fullName", "N/A")
    user_name = user_data.get("username", "N/A")
    contact = user_data.get("contact", "N/A")
    sub_city = user_data.get("subCity", "N/A")
    sheger_id = user_data.get("shegerId", "N/A")
    id_card_name = user_data.get("idCardName", "N/A")
    password = user_data.get("password", "N/A")

    # Guard clause: Check if user already exists based on phone/email
    if contact in USER_DATABASE:
        return jsonify({
            "status": "error", 
            "message": "Duraan galmaa'eera! / User already exists!"
        }), 400

    # SAVE THE DATA directly into our active database dictionary using contact as the key
    USER_DATABASE[contact] = {
        "fullName": full_name,
        "username": user_name,
        "contact": contact,
        "subCity": sub_city,
        "shegerId": sheger_id,
        "idCardName": id_card_name,
        "password": password
    }

    # This prints directly to your live Render server log stream
    print(f"\n--- DATA RECEIVED & SAVED LIVE FROM FRONTEND ---")
    print(f"User Saved: {full_name} (@{user_name})")
    print(f"------------------------------------------------\n")

    return jsonify({
        "status": "success",
        "message": "Galmeen milkaa'eera! / Registration successful!"
    })


@app.route("/login", methods=["POST"])
def run_login():
    login_data = request.get_json()
    contact = login_data.get("contact", "N/A")
    password = login_data.get("password", "N/A")

    # Search our dictionary to find if the phone/email exists
    user_profile = USER_DATABASE.get(contact)

    # Verification fallback check
    if not user_profile or user_profile["password"] != password:
        return jsonify({
            "status": "error", 
            "message": "Lakkoofsa bilbilaa ykn Jecha Iccitii dogoggora! / Invalid credentials!"
        }), 401

    # Return matching profile back to script.js (excluding the password for security)
    return jsonify({
        "status": "success",
        "fullName": user_profile["fullName"],
        "username": user_profile["username"],
        "contact": user_profile["contact"],
        "subCity": user_profile["subCity"],
        "shegerId": user_profile["shegerId"]
    })


if __name__ == "__main__":
    # Dynamically bind to the port Render gives us
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)


