import os

folders = [
    r"C:\xampp\htdocs\AlphabetGO\public\audio\longend",
    r"C:\xampp\htdocs\AlphabetGO\public\audio\3letterblend",
    r"C:\xampp\htdocs\AlphabetGO\public\audio\2letterblend"
]

total_count = 0

for folder in folders:
    if not os.path.exists(folder):
        print(f"Directory not found: {folder}")
        continue
        
    count = 0
    for filename in os.listdir(folder):
        # Target anything that ends with uppercase .MP3
        if filename.endswith(".MP3"):
            old_path = os.path.join(folder, filename)
            new_name = filename[:-4] + ".mp3"
            temp_path = os.path.join(folder, new_name + ".tmp")
            final_path = os.path.join(folder, new_name)
            
            # Rename to temp first to bypass Windows case-insensitive filesystem rules
            os.rename(old_path, temp_path)
            os.rename(temp_path, final_path)
            print(f"[{os.path.basename(folder)}] Renamed {filename} to {new_name}")
            count += 1
            total_count += 1
    print(f"Done renaming {count} files in {folder}")

print(f"\nTotal files renamed: {total_count}")
