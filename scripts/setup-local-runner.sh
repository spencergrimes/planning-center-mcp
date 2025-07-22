#!/bin/bash

# Script to set up local GitHub Actions runner (optional advanced setup)
echo "🏃‍♂️ Setting up local GitHub Actions runner..."

# Install act (GitHub Actions local runner)
if ! command -v act &> /dev/null; then
    echo "Installing act (GitHub Actions local runner)..."
    
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install act
        else
            echo "Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    # For Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
    else
        echo "Please install act manually: https://github.com/nektos/act"
        exit 1
    fi
fi

echo "✅ act installed successfully!"

echo ""
echo "🚀 To run GitHub Actions locally:"
echo "  act -j test    # Run just the test job"
echo "  act           # Run all jobs"
echo ""
echo "📝 Create .actrc file with:"
echo "  -P ubuntu-latest=catthehacker/ubuntu:act-latest"
echo "  --container-architecture linux/amd64"