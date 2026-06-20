import os
import glob
import re

files = glob.glob('src/app/components/Level*.tsx')
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update py-4 to py-6 on the main containers
    def replace_container(match):
        pre = match.group(1)
        mid = match.group(2)
        post = match.group(3)
        mid = mid.replace(' py-4', '').replace(' py-6', '').replace(' py-2', '')
        return f'className="{pre} py-6{mid}{post}"'
    
    content = re.sub(r'className="(max-w-[234]xl mx-auto px-4)(.*?)(w-full.*?)"', replace_container, content)
    
    # 2. Update paragraph classes
    content = content.replace('<p className="text-gray-500 dark:text-gray-400 text-sm">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-500 dark:text-gray-400 text-sm mb-8">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-500 dark:text-gray-400 text-sm mt-2">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-500 dark:text-gray-400">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-500 dark:text-gray-400 mb-4">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-600 dark:text-gray-400">', '<p className="text-gray-500 mt-2">')
    content = content.replace('<p className="text-gray-500 dark:text-gray-400 text-sm font-medium">', '<p className="text-gray-500 mt-2">')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Unified classes across all Level components.")
