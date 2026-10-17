import os
import re
import sqlite3
from functools import wraps

from flask import Flask, request, jsonify, g
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days

serializer = URLSafeTimedSerializer(SECRET_KEY)
USE_PG = DATABASE_URL.startswith("postgres")

CATEGORIES = {"seeds", "materials", "fertilizer", "produce"}
ROLES = {"farmer", "supplier"}
UNITS = {"kg", "quintal", "piece", "liter", "bag"}


def get_db():
    if "db" not in g:
        if USE_PG:
            import psycopg2
            import psycopg2.extras
            g.db = psycopg2.connect(DATABASE_URL, sslmode="require",
                                    cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            g.db = sqlite3.connect(os.environ.get("SQLITE_PATH", "local.db"))
            g.db.row_factory = sqlite3.Row
    return g.db


def query(sql, params=(), one=False, commit=False):
    db = get_db()
    cur = db.cursor()
    cur.execute(sql.replace("?", "%s") if USE_PG else sql, params)
    rows = None
    if cur.description:
        rows = [dict(r) for r in cur.fetchall()]
    if commit:
        db.commit()
    cur.close()
    if rows is None:
        return None
    return (rows[0] if rows else None) if one else rows


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    pk = "SERIAL PRIMARY KEY" if USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
    ts = "TIMESTAMPTZ DEFAULT now()" if USE_PG else "TEXT DEFAULT CURRENT_TIMESTAMP"
    with app.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(f"""CREATE TABLE IF NOT EXISTS users (
            id {pk},
            full_name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            contact TEXT NOT NULL UNIQUE,
            sub_city TEXT NOT NULL,
            sheger_id TEXT NOT NULL,
            id_card_name TEXT,
            role TEXT NOT NULL DEFAULT 'farmer',
            password_hash TEXT NOT NULL,
            created_at {ts}
        )""")
        cur.execute(f"""CREATE TABLE IF NOT EXISTS listings (
            id {pk},
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity REAL,
            unit TEXT,
            description TEXT,
            created_at {ts}
        )""")
        db.commit()
        cur.close()


@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return resp
    
@app.route("/<path:_p>", methods=["OPTIONS"])
@app.route("/", methods=["OPTIONS"])
def preflight(_p=None):
    return ("", 204)


def err(msg_en, msg_om, code=400):
    return jsonify({"status": "error", "message": f"{msg_om} / {msg_en}"}), code


def public_user(u):
    return {
        "id": u["id"],
        "fullName": u["full_name"],
        "username": u["username"],
        "contact": u["contact"],
        "subCity": u["sub_city"],
        "shegerId": u["sheger_id"],
        "role": u["role"],
    }


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        try:
            uid = serializer.loads(token, max_age=TOKEN_MAX_AGE)["uid"]
        except (BadSignature, SignatureExpired, KeyError, TypeError):
            return err("Please log in again.", "Maaloo irra deebi'ii seeni.", 401)
        user = query("SELECT * FROM users WHERE id = ?", (uid,), one=True)
        if not user:
            return err("Account not found.", "Herregni hin argamne.", 401)
        g.user = user
        return fn(*a, **kw)
    return wrapper


def valid_password(p):
    return (len(p) >= 8 and re.search(r"[A-Za-z]", p) and re.search(r"[0-9]", p)
            and re.search(r"[^A-Za-z0-9]", p))


@app.route("/health")
def health():
    return jsonify({"status": "ok", "database": "postgres" if USE_PG else "sqlite"})


@app.route("/register", methods=["POST"])
def register():
    d = request.get_json(silent=True) or {}
    full_name = (d.get("fullName") or "").strip()
    username = (d.get("username") or "").strip()
    contact = (d.get("contact") or "").strip()
    sub_city = (d.get("subCity") or "").strip()
    sheger_id = (d.get("shegerId") or "").strip()
    id_card_name = (d.get("idCardName") or "").strip()
    role = (d.get("role") or "farmer").strip()
    password = d.get("password") or ""
    import re
    digits = re.sub(r"[\s-]", "", contact)
    m = re.fullmatch(r"(?:\+?251|0)?([79]\d{8})", digits)
    if not m:
            return err("Enter a valid phone number, e.g. 0912345678.", "Lakkoofsa bilbilaa sirrii galchi, fkn 0912345678.")
    contact = "0" + m.group(1)

    if not all([full_name, username, contact, sub_city, sheger_id]):
        return err("Please fill in all fields.", "Maaloo gabaajaa hunda guuti.")
    if role not in ROLES:
        return err("Invalid role.", "Gahee sirrii hin taane.")
    if not valid_password(password):
        return err("Weak password.", "Jechi iccitii laafaa dha.")

    exists = query("SELECT id FROM users WHERE contact = ? OR username = ?",
                   (contact, username), one=True)
    if exists:
        return err("User already exists!", "Duraan galmaa'eera!")

    query("""INSERT INTO users (full_name, username, contact, sub_city, sheger_id,
             id_card_name, role, password_hash) VALUES (?,?,?,?,?,?,?,?)""",
          (full_name, username, contact, sub_city, sheger_id, id_card_name, role,
           generate_password_hash(password)), commit=True)
    return jsonify({"status": "success",
                    "message": "Galmeen milkaa'eera! / Registration successful!"})


@app.route("/login", methods=["POST"])
def login():
    d = request.get_json(silent=True) or {}
    contact = (d.get("contact") or "").strip()
    password = d.get("password") or ""
    user = query("SELECT * FROM users WHERE contact = ?", (contact,), one=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return err("Invalid credentials!", "Lakkoofsa bilbilaa ykn Jecha Iccitii dogoggora!", 401)
    out = public_user(user)
    out.update({"status": "success", "token": serializer.dumps({"uid": user["id"]})})
    return jsonify(out)


@app.route("/me")
@login_required
def me():
    return jsonify({"status": "success", **public_user(g.user)})


def listing_out(r):
    return {
        "id": r["id"], "action": r["action"], "category": r["category"],
        "name": r["name"], "price": r["price"], "quantity": r["quantity"],
        "unit": r["unit"], "description": r["description"],
        "createdAt": str(r["created_at"])[:16],
        "owner": {"id": r["user_id"], "fullName": r["full_name"],
                  "contact": r["contact"], "subCity": r["sub_city"], "role": r["role"]},
        "mine": r["user_id"] == g.user["id"],
    }


@app.route("/listings", methods=["GET"])
@login_required
def get_listings():
    sql = ("SELECT l.*, u.full_name, u.contact, u.sub_city, u.role FROM listings l "
           "JOIN users u ON u.id = l.user_id WHERE 1=1")
    params = []
    action = request.args.get("action")
    category = request.args.get("category")
    sub_city = request.args.get("subCity")
    q = (request.args.get("q") or "").strip()
    if action in ("sell", "buy"):
        sql += " AND l.action = ?"; params.append(action)
    if category in CATEGORIES:
        sql += " AND l.category = ?"; params.append(category)
    if sub_city:
        sql += " AND u.sub_city = ?"; params.append(sub_city)
    if q:
        sql += " AND LOWER(l.name) LIKE ?"; params.append(f"%{q.lower()}%")
    if request.args.get("mine") == "1":
        sql += " AND l.user_id = ?"; params.append(g.user["id"])
    sql += " ORDER BY l.id DESC LIMIT 200"
    return jsonify({"status": "success",
                    "listings": [listing_out(r) for r in query(sql, params)]})


@app.route("/listings", methods=["POST"])
@login_required
def create_listing():
    d = request.get_json(silent=True) or {}
    action = d.get("action")
    category = d.get("category")
    name = (d.get("name") or "").strip()
    description = (d.get("description") or "").strip()[:500]
    unit = d.get("unit") or None
    try:
        price = float(d.get("price"))
        quantity = float(d["quantity"]) if d.get("quantity") not in (None, "") else None
    except (TypeError, ValueError):
        return err("Price and quantity must be numbers.", "Gatiin fi baay'inni lakkoofsa ta'uu qaba.")

    if action not in ("sell", "buy") or category not in CATEGORIES or not name or price <= 0:
        return err("Please fill in the form correctly.", "Maaloo unka sirriitti guuti.")
    if unit and unit not in UNITS:
        return err("Invalid unit.", "Safartuun sirrii miti.")
    if action == "buy" and g.user["role"] != "farmer":
        return err("Suppliers can only sell.", "Dhiyeessaan gurguruu qofa danda'a.", 403)

    query("""INSERT INTO listings (user_id, action, category, name, price, quantity, unit, description)
             VALUES (?,?,?,?,?,?,?,?)""",
          (g.user["id"], action, category, name[:120], price, quantity, unit, description),
          commit=True)
    return jsonify({"status": "success", "message": "Gabaatti ergameera! / Posted to marketplace!"})


@app.route("/listings/<int:lid>", methods=["DELETE"])
@login_required
def delete_listing(lid):
    row = query("SELECT user_id FROM listings WHERE id = ?", (lid,), one=True)
    if not row:
        return err("Not found.", "Hin argamne.", 404)
    if row["user_id"] != g.user["id"]:
        return err("Not your listing.", "Kun kan kee miti.", 403)
    query("DELETE FROM listings WHERE id = ?", (lid,), commit=True)
    return jsonify({"status": "success"})


# ---------------------------------------------------------------------------
# Market prices (public). The owner edits prices in Supabase Table Editor
# (table "prices"): change the "price" column and the page updates.
# ---------------------------------------------------------------------------
PRICE_SEED = {
    "seeds": [
        ("Teff (Quncho)", None, 14500), ("Teff (Magna)", None, 13200),
        ("Wheat (Improved)", None, 6800), ("Maize (Hybrid)", None, 4900),
        ("Barley (Food)", None, 5200), ("Sorghum (White)", None, 4400),
        ("Chickpea (Kabuli)", None, 8200), ("Haricot Bean", None, 7500),
        ("Lentils (Red)", None, 9800), ("Sesame (White)", None, 18500),
        ("Niger Seed (Neug)", None, 12000), ("Linseed (Telba)", None, 11500),
        ("Faba Bean", None, 6400), ("Field Pea", None, 6100),
    ],
    "materials": [
        ("Maresha (Ox-Plough)", "Traditional Tool", 2800), ("Sickle (Haamtuu)", "Hand Tool", 450),
        ("Shovel (Doqqee)", "Hand Tool", 750), ("Hand Sprayer (15L)", "Pest Control", 2200),
        ("Water Pump (Manual)", "Irrigation", 5500), ("Weeding Fork", "Hand Tool", 500),
        ("Wheelbarrow", "Transport", 3200), ("Machete (Billa)", "Hand Tool", 600),
        ("Sieve (Tessessa)", "Post-Harvest", 350),
    ],
    "chemicals": [
        ("DAP Fertilizer", "Fertilizer (50kg)", 3800), ("Urea Fertilizer", "Fertilizer (50kg)", 3400),
        ("NPS Fertilizer", "Fertilizer (50kg)", 4100), ("Malathion", "Pesticide (1L)", 1800),
        ("Glyphosate", "Herbicide (1L)", 1400), ("2,4-D", "Herbicide (1L)", 950),
        ("Copper Fungicide", "Fungicide (1kg)", 2200), ("Select Fertilizer", "Fertilizer (50kg)", 3600),
    ],
}


def init_prices():
    pk = "SERIAL PRIMARY KEY" if USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
    ts = "TIMESTAMPTZ DEFAULT now()" if USE_PG else "TEXT DEFAULT CURRENT_TIMESTAMP"
    with app.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(f"""CREATE TABLE IF NOT EXISTS prices (
            id {pk},
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            kind TEXT,
            price REAL NOT NULL,
            updated_at {ts}
        )""")
        db.commit()
        cur.close()
        if not query("SELECT id FROM prices LIMIT 1", one=True):
            for cat, items in PRICE_SEED.items():
                for name, kind, price in items:
                    query("INSERT INTO prices (category, name, kind, price) VALUES (?,?,?,?)",
                          (cat, name, kind, price), commit=True)


@app.route("/prices", methods=["GET"])
def get_prices():
    cat = request.args.get("category", "")
    if cat not in PRICE_SEED:
        return err("Unknown category.", "Ramaddii hin beekamne.")
    rows = query("SELECT name, kind, price, updated_at FROM prices WHERE category = ? ORDER BY id", (cat,))
    return jsonify({"status": "success", "prices": [
        {"name": r["name"], "kind": r["kind"], "price": r["price"],
         "updatedAt": str(r["updated_at"])[:16]} for r in rows]})


init_prices()

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
    # ---------------------------------------------------------------------------
# Admin: edit market prices (only users whose role is "admin")
# ---------------------------------------------------------------------------
def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if g.user["role"] != "admin":
            return err("Admins only.", "Bitamtoota qofa.", 403)
        return fn(*a, **kw)
    return wrapper


@app.route("/admin/prices", methods=["GET"])
@login_required
@admin_required
def admin_list_prices():
    rows = query("SELECT id, category, name, kind, price FROM prices ORDER BY category, id")
    return jsonify({"status": "success", "prices": rows})


@app.route("/admin/prices", methods=["POST"])
@login_required
@admin_required
def admin_add_price():
    d = request.get_json(silent=True) or {}
    cat = d.get("category")
    name = (d.get("name") or "").strip()
    kind = (d.get("kind") or "").strip() or None
    try:
        price = float(d.get("price"))
    except (TypeError, ValueError):
        return err("Price must be a number.", "Gatiin lakkoofsa ta'uu qaba.")
    if cat not in PRICE_SEED or not name or price <= 0:
        return err("Please fill in the form correctly.", "Maaloo unka sirriitti guuti.")
    query("INSERT INTO prices (category, name, kind, price) VALUES (?,?,?,?)",
          (cat, name[:120], kind, price), commit=True)
    return jsonify({"status": "success", "message": "Added. / Dabalameera."})


@app.route("/admin/prices/<int:pid>", methods=["PUT"])
@login_required
@admin_required
def admin_update_price(pid):
    d = request.get_json(silent=True) or {}
    try:
        price = float(d.get("price"))
    except (TypeError, ValueError):
        return err("Price must be a number.", "Gatiin lakkoofsa ta'uu qaba.")
    if price <= 0:
        return err("Price must be above 0.", "Gatiin 0 caalaa ta'uu qaba.")
    query("UPDATE prices SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          (price, pid), commit=True)
    return jsonify({"status": "success", "message": "Saved. / Kuufameera."})


@app.route("/admin/prices/<int:pid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_price(pid):
    query("DELETE FROM prices WHERE id = ?", (pid,), commit=True)
    return jsonify({"status": "success"})

@app.route("/listing/<int:lid>", methods=["GET"])
def get_listing(lid):
    row = query(
        "SELECT l.id, l.action, l.category, l.name, l.price, l.quantity, l.unit, "
        "l.description, u.full_name AS seller, u.sub_city, u.contact "
        "FROM listings l JOIN users u ON u.id = l.user_id WHERE l.id = ?",
        (lid,), one=True)
    if not row:
        return err("Not found.", "Hin argamne.", 404)
    return jsonify({"status": "success", "listing": row})

# ---------------------------------------------------------------------------
# Offers and discount requests
# ---------------------------------------------------------------------------
def init_offers():
    pk = "SERIAL PRIMARY KEY" if USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
    ts = "TIMESTAMPTZ DEFAULT now()" if USE_PG else "TEXT DEFAULT CURRENT_TIMESTAMP"
    with app.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(f"""CREATE TABLE IF NOT EXISTS offers (
            id {pk},
            listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            amount REAL NOT NULL,
            message TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at {ts}
        )""")
        db.commit()
        cur.close()


init_offers()


@app.route("/listings/<int:lid>/offers", methods=["POST"])
@login_required
def make_offer(lid):
    d = request.get_json(silent=True) or {}
    kind = d.get("kind")
    if kind not in ("offer", "discount"):
        return err("Invalid request type.", "Gosa gaaffii sirrii hin taane.")
    try:
        amount = float(d.get("amount"))
    except (TypeError, ValueError):
        return err("Enter a valid price.", "Gatii sirrii galchi.")
    if amount <= 0:
        return err("Price must be above 0.", "Gatiin 0 caalaa ta'uu qaba.")
    message = (d.get("message") or "").strip()[:300]
    listing = query("SELECT id, user_id FROM listings WHERE id = ?", (lid,), one=True)
    if not listing:
        return err("Listing not found.", "Oduun hin argamne.", 404)
    if listing["user_id"] == g.user["id"]:
        return err("You cannot make an offer on your own listing.",
                   "Gurguruu kee irratti gaaffii kennuu hin dandeessu.")
    query("INSERT INTO offers (listing_id, buyer_id, kind, amount, message) VALUES (?,?,?,?,?)",
          (lid, g.user["id"], kind, amount, message), commit=True)
    return jsonify({"status": "success", "message": "Sent. / Ergameera."})


@app.route("/offers/received", methods=["GET"])
@login_required
def offers_received():
    rows = query("""SELECT o.id, o.listing_id, l.name AS listing_name, o.kind, o.amount,
                    o.message, o.status, o.created_at, u.full_name AS buyer_name,
                    u.contact AS buyer_contact
                    FROM offers o JOIN listings l ON l.id = o.listing_id
                    JOIN users u ON u.id = o.buyer_id
                    WHERE l.user_id = ? ORDER BY o.id DESC""", (g.user["id"],))
    return jsonify({"status": "success", "offers": rows})


@app.route("/offers/sent", methods=["GET"])
@login_required
def offers_sent():
    rows = query("""SELECT o.id, o.listing_id, l.name AS listing_name, o.kind, o.amount,
                    o.status, o.created_at
                    FROM offers o JOIN listings l ON l.id = o.listing_id
                    WHERE o.buyer_id = ? ORDER BY o.id DESC""", (g.user["id"],))
    return jsonify({"status": "success", "offers": rows})


@app.route("/offers/<int:oid>", methods=["PUT"])
@login_required
def respond_offer(oid):
    d = request.get_json(silent=True) or {}
    status = d.get("status")
    if status not in ("accepted", "declined"):
        return err("Invalid status.", "Haala sirrii hin taane.")
    row = query("""SELECT o.id FROM offers o JOIN listings l ON l.id = o.listing_id
                   WHERE o.id = ? AND l.user_id = ?""", (oid, g.user["id"]), one=True)
    if not row:
        return err("Not allowed.", "Hin hayyamamu.", 403)
    query("UPDATE offers SET status = ? WHERE id = ?", (status, oid), commit=True)
    return jsonify({"status": "success"})
