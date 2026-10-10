import re

with open('frontend/src/index.css', 'r') as f:
    content = f.read()

# Replace .main-content
content = re.sub(
    r'\.main-content \{[^}]+\}',
    '.main-content {\n  flex: 1;\n  position: relative;\n  padding: 0;\n  height: calc(100vh - 64px);\n  overflow: hidden;\n}',
    content
)

# Replace .content-split-layout
content = re.sub(
    r'\.content-split-layout \{[^}]+\}',
    '.content-split-layout {\n  display: block;\n  height: 100%;\n  width: 100%;\n}',
    content
)

# Replace .left-controls-column
content = re.sub(
    r'\.left-controls-column \{[^}]+\}',
    '.left-controls-column {\n  position: absolute;\n  top: 24px;\n  left: 24px;\n  width: 400px;\n  max-height: calc(100vh - 120px);\n  z-index: 10;\n  overflow-y: auto;\n  display: flex;\n  flex-direction: column;\n  gap: 20px;\n  pointer-events: none;\n}\n\n.left-controls-column > * {\n  pointer-events: auto;\n}',
    content
)

# Replace .right-map-column
content = re.sub(
    r'\.right-map-column \{[^}]+\}',
    '.right-map-column {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  height: 100%;\n  z-index: 1;\n}',
    content
)

# Replace header width to be a pill
content = re.sub(
    r'\.app-header \{([^}]+)\}',
    r'.app-header {\1\n  width: auto;\n  max-width: fit-content;\n  margin: 16px auto;\n  border-radius: 999px;\n  padding: 10px 24px;\n  box-shadow: 0 4px 24px rgba(0,0,0,0.5);\n}',
    content
)

with open('frontend/src/index.css', 'w') as f:
    f.write(content)

