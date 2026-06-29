import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allows your live Vercel frontend to talk to this backend safely

@app.route("/register", methods=["POST"])
def run_registration():
    user_data = request.get_json()
    
    full_name = user_data.get("fullName", "N/A")
    user_name = user_data.get("username", "N/A")
    contact = user_data.get("contact", "N/A")
    sub_city = user_data.get("subCity", "N/A")
    sheger_id = user_data.get("shegerId", "N/A")
    id_card_name = user_data.get("idCardName", "N/A")
    password = user_data.get("password", "N/A")
    
    # This prints directly to your live Render online dashboard logs
    print(f"\n--- DATA RECEIVED LIVE FROM FRONTEND ---")
    print(f"User: {full_name} (@{user_name})")
    print(f"----------------------------------------\n")
    
    return jsonify({
        "status": "success", 
        "message": f"Galmeen keessan milkaa'eera! Welcome, {user_name}."
    })

if __name__ == "__main__":
    # This tells your app to bind to Render's dynamic port automatically
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
