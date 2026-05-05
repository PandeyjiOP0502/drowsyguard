#!/usr/bin/env python3
"""
Setup vendored MediaPipe files for DrowsyGuard
This script installs npm dependencies and copies MediaPipe files to vendor directory
"""

import os
import sys
import shutil
import subprocess

def run_command(cmd):
    """Run a shell command and return success status"""
    try:
        print(f"\n▶ Running: {cmd}")
        result = subprocess.run(cmd, shell=True, cwd=os.getcwd())
        return result.returncode == 0
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    project_root = os.getcwd()
    
    print("=" * 70)
    print("DrowsyGuard — Vendoring MediaPipe Assets")
    print("=" * 70)
    
    # Step 1: npm install
    print("\n[1/4] Installing npm dependencies...")
    if not run_command("npm install"):
        print("✗ npm install failed")
        sys.exit(1)
    
    # Step 2: Create vendor directories
    print("\n[2/4] Creating vendor directories...")
    vendor_dirs = [
        "vendor",
        "vendor/mediapipe",
        "vendor/mediapipe/face_mesh",
        "vendor/mediapipe/camera_utils",
    ]
    
    for dir_path in vendor_dirs:
        full_path = os.path.join(project_root, dir_path)
        os.makedirs(full_path, exist_ok=True)
        print(f"  ✓ {dir_path}/")
    
    # Step 3: Copy MediaPipe files
    print("\n[3/4] Copying MediaPipe files...")
    
    # Copy face_mesh
    src_face_mesh = os.path.join(project_root, "node_modules/@mediapipe/face_mesh")
    dst_face_mesh = os.path.join(project_root, "vendor/mediapipe/face_mesh")
    
    if os.path.exists(src_face_mesh):
        shutil.copytree(src_face_mesh, dst_face_mesh, dirs_exist_ok=True)
        print(f"  ✓ Copied @mediapipe/face_mesh")
    else:
        print(f"  ✗ Source not found: {src_face_mesh}")
        sys.exit(1)
    
    # Copy camera_utils
    src_camera = os.path.join(project_root, "node_modules/@mediapipe/camera_utils")
    dst_camera = os.path.join(project_root, "vendor/mediapipe/camera_utils")
    
    if os.path.exists(src_camera):
        shutil.copytree(src_camera, dst_camera, dirs_exist_ok=True)
        print(f"  ✓ Copied @mediapipe/camera_utils")
    else:
        print(f"  ✗ Source not found: {src_camera}")
        sys.exit(1)
    
    # Step 4: Verify structure
    print("\n[4/4] Verifying vendor structure...")
    vendor_face_mesh_files = os.listdir(dst_face_mesh) if os.path.exists(dst_face_mesh) else []
    vendor_camera_files = os.listdir(dst_camera) if os.path.exists(dst_camera) else []
    
    print(f"  ✓ vendor/mediapipe/face_mesh/ contains {len(vendor_face_mesh_files)} files")
    print(f"  ✓ vendor/mediapipe/camera_utils/ contains {len(vendor_camera_files)} files")
    
    print("\n" + "=" * 70)
    print("✓ Setup complete!")
    print("=" * 70)
    print("\nApp is now ready to run without internet access.")
    print("Start the server with: npm run serve")
    print("Then open http://localhost:8080 in your browser")

if __name__ == "__main__":
    main()
