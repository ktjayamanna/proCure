#!/bin/bash

# Prompt for new project name
echo -n "Enter the new project name: "
read NEW_NAME

# Define the old project name
OLD_NAME="procure"

# Ensure a new name is provided
if [ -z "$NEW_NAME" ]; then
    echo "Error: No project name provided. Exiting."
    exit 1
fi

# Replace occurrences of the old name in file contents
find . -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} +

# Rename directories and files containing the old project name
find . -depth -name "*$OLD_NAME*" | while read FILE; do
    NEW_FILE=$(echo "$FILE" | sed "s/$OLD_NAME/$NEW_NAME/g")
    mv "$FILE" "$NEW_FILE"
done

# Confirmation message
echo "Project name changed from '$OLD_NAME' to '$NEW_NAME' successfully."
