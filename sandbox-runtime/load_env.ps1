# Get the directory where the script is located
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load environment variables from .env file if it exists
$envFile = Join-Path $SCRIPT_DIR ".env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env file..."
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env file not found in $SCRIPT_DIR"
}

# Set PYTHONPATH to include src directory
$srcPath = Join-Path $SCRIPT_DIR "src"
$env:PYTHONPATH = $srcPath
Write-Host "PYTHONPATH set to: $env:PYTHONPATH"

# Print current Python path for verification
Write-Host "Current Python path:"
python -c "import sys; print('\n'.join(sys.path))" 