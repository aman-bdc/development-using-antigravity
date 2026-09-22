import os
import sys
import time
import subprocess
import webbrowser

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
frontend_dir = os.path.join(root_dir, "frontend")
dist_dir = os.path.join(frontend_dir, "dist")

def main():
    print("=" * 60)
    print("  Starting Antigravity Data Chatbot Application")
    print("=" * 60)

    # 1. Check if backend requirements are satisfied
    print("\n[1/3] Checking environment...")
    sys.path.insert(0, backend_dir)

    # 2. Check frontend build
    if not os.path.exists(dist_dir) or not os.path.exists(os.path.join(dist_dir, "index.html")):
        print("\n[2/3] Building frontend bundle...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir, check=True)
    else:
        print("\n[2/3] Production frontend bundle found.")

    # 3. Determine available port (defaulting to 8080 to avoid Docker/WSL clashes on 8000)
    import socket
    def get_port():
        for candidate in [8080, 8081, 8082, 8000]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.bind(('127.0.0.1', candidate))
                s.close()
                return candidate
            except Exception:
                continue
        return 8080

    port = int(os.environ.get("PORT", get_port()))

    print(f"\n[3/3] Starting Unified Server on http://127.0.0.1:{port} ...")
    print("=" * 60)
    print(f"  Application URL : http://127.0.0.1:{port}")
    print(f"  API Docs URL    : http://127.0.0.1:{port}/docs")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)

    # Open in browser after short delay
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(f"http://127.0.0.1:{port}")
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    from app import app, load_sample_datasets
    load_sample_datasets()
    uvicorn.run(app, host="127.0.0.1", port=port)

if __name__ == "__main__":
    main()
