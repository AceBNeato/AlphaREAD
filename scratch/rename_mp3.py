import os

folder = r"C:\xampp\htdocs\AlphabetGO\public\audio"

count = 0
for filename in os.listdir(folder):
    if filename.endswith(".MP3"):
        old_path = os.path.join(folder, filename)
        new_name = filename[:-4] + ".mp3"
        temp_path = os.path.join(folder, new_name + ".tmp")
        final_path = os.path.join(folder, new_name)
        
        # Rename to temp first to bypass Windows case-insensitive filesystem rules
        os.rename(old_path, temp_path)
        os.rename(temp_path, final_path)
        print(f"Renamed {filename} to {new_name}")
        count += 1

print(f"Done renaming {count} files.")
