import sys
import re
filepath = sys.argv[1]

with open(filepath, 'r') as f:
    content = f.read()

    pattern = r'//image\[(.+?)\]'
    replacement = r'//image[\1.drawio]'
    content = re.sub(pattern, replacement, content)

    pattern = r'@<img>\{(.+?)\}'
    replacement = r'@<img>{\1.drawio}'
    content = re.sub(pattern, replacement, content)

with open(filepath, 'w') as f:
    f.write(content)