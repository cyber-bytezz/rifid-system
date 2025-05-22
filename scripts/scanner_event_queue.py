import os

UID_FILE_PATH = "scanner_uid.txt"

def set_latest_uid(uid: str):
    with open(UID_FILE_PATH, "w") as f:
        f.write(uid)

def get_latest_uid():
    if not os.path.exists(UID_FILE_PATH):
        return {"uid": None}
    with open(UID_FILE_PATH, "r") as f:
        uid = f.read().strip()
        return {"uid": uid}
