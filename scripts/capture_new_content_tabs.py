import asyncio
import json
import base64
import os
import shutil
import urllib.request
import subprocess
import time
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

async def capture(ws, filename, width=1380, height=920):
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
    # 1. Login as creator (Emily Carter)
    login_data = json.dumps({"email": "emily.carter@pureglow.co", "password": "precedent"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        auth_res = json.loads(resp.read().decode())
    token = auth_res["token"]
    user = auth_res["user"]
    print("Logged in as creator:", user["name"])

    # 2. Start Edge with remote debugging
    edge_cmd = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--remote-debugging-port=9222",
        r"--user-data-dir=d:\tmp\edge-newcontent-profile",
        "http://127.0.0.1:5173/login"
    ]
    proc = subprocess.Popen(edge_cmd)
    time.sleep(2.5)

    try:
        # Open new tab for New Content
        new_tab_req = urllib.request.Request("http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/login", method="PUT")
        with urllib.request.urlopen(new_tab_req) as resp:
            tab_info = json.loads(resp.read().decode())
        ws_url = tab_info["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            await send_cmd(ws, 1, "Page.enable")
            await send_cmd(ws, 2, "Runtime.enable")
            await asyncio.sleep(1.5)

            # Set session and go directly to /app/new
            session_obj = json.dumps({"token": token, "user": user})
            set_session_js = f"""
            sessionStorage.setItem('precedent.session', JSON.stringify({session_obj}));
            window.location.href = 'http://127.0.0.1:5173/app/new';
            """
            await send_cmd(ws, 3, "Runtime.evaluate", {"expression": set_session_js})
            await asyncio.sleep(3)

            # 1. Capture Text Content (Default Tab)
            await capture(ws, "tab_1_text_content.png")

            # 2. Click Image Tab
            click_img_tab = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('Image'));
                if (btn) { btn.click(); return 'clicked'; }
                return 'not_found';
            })()
            """
            await send_cmd(ws, 4, "Runtime.evaluate", {"expression": click_img_tab})
            await asyncio.sleep(1.5)
            await capture(ws, "tab_2_image_mode.png")

            # 3. Click Document Tab
            click_doc_tab = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('Document'));
                if (btn) { btn.click(); return 'clicked'; }
                return 'not_found';
            })()
            """
            await send_cmd(ws, 5, "Runtime.evaluate", {"expression": click_doc_tab})
            await asyncio.sleep(1.5)
            await capture(ws, "tab_3_document_mode.png")

            # 4. Click URL Tab and click Autofill Demo URL
            click_url_tab = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('URL'));
                if (btn) { 
                    btn.click();
                    setTimeout(() => {
                        const autofill = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Autofill'));
                        if (autofill) autofill.click();
                    }, 400);
                    return 'clicked'; 
                }
                return 'not_found';
            })()
            """
            await send_cmd(ws, 6, "Runtime.evaluate", {"expression": click_url_tab})
            await asyncio.sleep(2)
            await capture(ws, "tab_4_url_mode.png")

            print("All 4 tabs captured successfully!")
    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
