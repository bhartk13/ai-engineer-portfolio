"""Create ZIP archive for Lambda deployment"""
import zipfile
import os
from pathlib import Path

def create_lambda_zip(source_dir, output_file):
    """Create a ZIP file from the source directory"""
    source_path = Path(source_dir)
    
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_path):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(source_path)
                print(f"Adding: {arcname}")
                zipf.write(file_path, arcname)
    
    print(f"\nZIP created: {output_file}")
    print(f"Size: {os.path.getsize(output_file):,} bytes")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python create_zip.py <source_dir> <output_file>")
        sys.exit(1)
    
    create_lambda_zip(sys.argv[1], sys.argv[2])
