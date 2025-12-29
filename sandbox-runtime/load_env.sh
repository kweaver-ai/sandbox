#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading environment variables from .env file..."
    set -a  # automatically export all variables
    source "$SCRIPT_DIR/.env"
    set +a
else
    echo "Warning: .env file not found in $SCRIPT_DIR"
fi

# Set PYTHONPATH to include src directory
export PYTHONPATH="${SCRIPT_DIR}/src"
echo "PYTHONPATH set to: $PYTHONPATH"

# Print current Python path for verification
echo "Current Python path:"
python -c "import sys; print('\n'.join(sys.path))" 