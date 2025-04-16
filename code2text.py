import os
import tkinter as tk
from tkinter import filedialog

# Create a tkinter window (it won't be shown)
root = tk.Tk()
root.withdraw()

# Define a custom file type filter that includes various code file extensions
file_types = (
    ("All Supported Files", "*.py;*.php;*.js;*.html;*.css;*.java;*.c;*.cpp;*.h;*.txt;*.md"),
    ("Python Files", "*.py"),
    ("PHP Files", "*.php"),
    ("JavaScript Files", "*.js"),
    ("HTML Files", "*.html"),
    ("CSS Files", "*.css"),
    ("Java Files", "*.java"),
    ("C/C++ Files", "*.c;*.cpp;*.h"),
    ("Text Files", "*.txt"),
    ("Markdown Files", "*.md")
)

# Ask the user to select files and/or folders
file_paths = filedialog.askopenfilenames(
    title="Select code files",
    filetypes=file_types
)

# Create a new text file to paste the code
combined_code_file = open('combined_code_AI.txt', 'w')

# Iterate through the selected files and/or folders
for path in file_paths:
    if os.path.isdir(path):
        # If it's a directory, get all files within the directory
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                with open(file_path, 'r') as file:
                    code_content = file.read()
                    combined_code_file.write(f"File: {filename}\n\n")
                    combined_code_file.write(code_content)
                    combined_code_file.write("\n\n")
    else:
        # If it's a file, directly read and write its content
        with open(path, 'r') as file:
            code_content = file.read()
            combined_code_file.write(f"File: {os.path.basename(path)}\n\n")
            combined_code_file.write(code_content)
            combined_code_file.write("\n\n")

# Close the combined text file
combined_code_file.close()
