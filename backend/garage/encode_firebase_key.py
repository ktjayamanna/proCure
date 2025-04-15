import base64
import json

# Read the service account key file
with open('.vscode/project-procure-firebase-adminsdk-fbsvc-735005865e.json', 'r') as f:
    service_account_content = f.read()

# Encode to base64
encoded_content = base64.b64encode(service_account_content.encode()).decode()

print(encoded_content)

# Also save to a file for convenience
with open('firebase_credentials_base64.txt', 'w') as f:
    f.write(encoded_content)

print("\nBase64 encoded credentials saved to firebase_credentials_base64.txt")
