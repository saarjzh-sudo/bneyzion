#!/usr/bin/env python3
"""
bz_restore_deleted_users.py — שחזור אחרי מחיקת auth.users בטעות (15.7.2026).

מה קרה: בסבב צילומי-מסך, קריאת-מחיקה שהסתמכה על פילטר-מייל שגוי במחקה
‎/auth/v1/admin/users?email=…‎ (הפילטר לא באמת מסנן — מחזיר עמוד ראשון של
כל המשתמשים) → נמחקו 10 שורות auth.users, מהן 9 משתמשים אמיתיים.

מה נשאר שלם (לא נגע בו): 1064 orders · 935 donations · 311 מיילי-גישה
(user_access_tags מבוססי-מייל) · profiles (id↔email של כל הנמחקים) · כל התוכן.

המנגנון: משתמש שמתחבר שוב עם Google מקבל user_id חדש; טבלת linkPendingAccessTags
מקשרת אוטומטית את תגי-הגישה לפי מייל → **גישת המנויים משוחזרת לבד בהתחברות**.
מה שלא משוחזר לבד: (א) role=admin ב-user_roles (נמחק), (ב) course_enrollments
של סער (8, ממופות ל-id הישן).

הסקריפט הזה — להריץ אחרי שהמשתמשים הרלוונטיים התחברו מחדש:
  1. מוצא לכל מייל את ה-user_id החדש (auth.users החי).
  2. מעניק admin ל-ADMIN_EMAILS (idempotent).
  3. ממפה את הרשמות סער מה-id הישן ל-id החדש.
לא מוחק כלום. אפשר להריץ שוב ושוב.

שימוש:  SUPABASE_SERVICE_ROLE_BNEYZION=... python3 bz_restore_deleted_users.py
"""
import json
import os
import sys
import urllib.request

SB = "https://pzvmwfexeiruelwiujxn.supabase.co"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_BNEYZION", "")

# האדמינים ההיסטוריים (לפני המחיקה): סער + יואב + המשרד.
# ה-id הישן של כל אחד נקרא מ-deleted_users_20260715.json (profiles שרדו).
ADMIN_EMAILS = {"saar.j.z.h@gmail.com", "yoavoriel@gmail.com", "office@bneyzion.co.il"}


def rest(path, method="GET", body=None):
    r = urllib.request.Request(SB + "/rest/v1" + path,
        data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
                 "Prefer": "return=representation"})
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode()
        return json.loads(t) if t else None


def current_auth_id(email):
    """ה-user_id החי (החדש) של מייל — מתוך auth.users דרך profiles שנוצר מחדש בהתחברות."""
    # profiles נוצר ב-handle_new_user בהתחברות; השורה הישנה נשארה, אז מסננים לפי
    # id שקיים בפועל ב-auth.users (join). פשוט יותר: קריאת admin לפי מייל אמיתי.
    r = urllib.request.Request(SB + f"/auth/v1/admin/users", headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(r) as resp:
        users = json.load(resp).get("users", [])
    matches = [u for u in users if u.get("email") == email]
    return matches[0]["id"] if matches else None


def main():
    if not KEY:
        sys.exit("חסר SUPABASE_SERVICE_ROLE_BNEYZION")
    mapping = json.load(open(os.path.join(os.path.dirname(__file__), "deleted_users_20260715.json")))
    old_by_email = {u["email"]: u for u in mapping}

    for email in sorted(ADMIN_EMAILS):
        new_id = current_auth_id(email)
        if not new_id:
            print(f"⏳ {email}: עדיין לא התחבר מחדש — דלג (הרץ שוב אחרי שיתחבר)")
            continue
        existing = rest(f"/user_roles?user_id=eq.{new_id}&role=eq.admin&select=id")
        if not existing:
            rest("/user_roles", method="POST", body={"user_id": new_id, "role": "admin"})
            print(f"✅ {email}: admin שוחזר ({new_id})")
        else:
            print(f"✓  {email}: admin כבר קיים")

    # הרשמות סער → id חדש
    saar_new = current_auth_id("saar.j.z.h@gmail.com")
    saar_rec = old_by_email.get("saar.j.z.h@gmail.com")
    if saar_new and saar_rec and saar_rec.get("enrollments"):
        old_id = saar_rec["old_user_id"]
        moved = rest(f"/course_enrollments?user_id=eq.{old_id}", method="PATCH", body={"user_id": saar_new})
        print(f"✅ סער: {len(moved or [])} הרשמות מופו ל-id החדש")

    print("\nהערה: גישת שאר המנויים משוחזרת אוטומטית בהתחברות (תגים מבוססי-מייל).")


if __name__ == "__main__":
    main()
