import asyncio
import json
import base64
import os
import shutil
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\Balaji\.gemini\antigravity\brain\cc73ba44-9946-4087-bbcd-f297df311055"

async def send_cmd(ws, msg_id, method, params=None):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def capture(ws, filename, width=1440, height=900):
    await send_cmd(ws, 101, "Emulation.setDeviceMetricsOverride", {
        "width": width, "height": height, "deviceScaleFactor": 1, "mobile": False
    })
    res = await send_cmd(ws, 102, "Page.captureScreenshot", {"format": "png"})
    img_data = base64.b64decode(res["data"])
    with open(filename, "wb") as f:
        f.write(img_data)
    target = os.path.join(ARTIFACT_DIR, os.path.basename(filename))
    shutil.copyfile(filename, target)
    print(f"Captured {filename} -> {target} ({len(img_data)} bytes)")

async def main():
    login_data = json.dumps({"email": "david.kim@pureglow.co", "password": "precedent"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        auth_res = json.loads(resp.read().decode())
    token = auth_res["token"]
    user = auth_res["user"]

    new_tab_req = urllib.request.Request("http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/login", method="PUT")
    with urllib.request.urlopen(new_tab_req) as resp:
        tab_info = json.loads(resp.read().decode())
    ws_url = tab_info["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
        await send_cmd(ws, 1, "Page.enable")
        await send_cmd(ws, 2, "Runtime.enable")

        # 1. Login page
        await asyncio.sleep(2)
        await capture(ws, "ui_login.png")

        # Set session and go to overview
        session_obj = json.dumps({"token": token, "user": user})
        set_session_js = f"""
        sessionStorage.setItem('precedent.session', JSON.stringify({session_obj}));
        window.location.href = 'http://127.0.0.1:5173/manager/overview';
        """
        await send_cmd(ws, 3, "Runtime.evaluate", {"expression": set_session_js})
        await asyncio.sleep(3)
        await capture(ws, "ui_manager_overview.png")

        # 2. Review Queue
        await send_cmd(ws, 4, "Runtime.evaluate", {"expression": "window.location.href = 'http://127.0.0.1:5173/manager/queue'"})
        await asyncio.sleep(2.5)
        await capture(ws, "ui_manager_queue.png")

        # 3. Guidelines & Rules
        await send_cmd(ws, 5, "Runtime.evaluate", {"expression": "window.location.href = 'http://127.0.0.1:5173/manager/guidelines'"})
        await asyncio.sleep(2.5)
        await capture(ws, "ui_manager_guidelines.png")

        # 4. Audit Log
        await send_cmd(ws, 6, "Runtime.evaluate", {"expression": "window.location.href = 'http://127.0.0.1:5173/manager/audit'"})
        await asyncio.sleep(2.5)
        await capture(ws, "ui_manager_audit.png")

        print("All screens captured!")

if __name__ == "__main__":
    asyncio.run(main())
