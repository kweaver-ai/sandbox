"""
Example handler function for demonstrating sandbox-run CLI
"""

def handler(event):
    """
    Lambda handler function that processes the event

    Args:
        event: Dictionary containing input data

    Returns:
        Dictionary with processing results
    """
    # Extract data from event
    operation = event.get("operation", "default")
    numbers = event.get("numbers", [1, 2, 3])
    name = event.get("name", "User")

    # Print to stdout (will be captured)
    print(f"Hello, {name}!")
    print(f"Performing {operation} on numbers: {numbers}")

    # Process the numbers based on operation
    if operation == "sum":
        result = sum(numbers)
        print(f"Sum: {result}")
    elif operation == "average":
        result = sum(numbers) / len(numbers) if numbers else 0
        print(f"Average: {result:.2f}")
    elif operation == "max":
        result = max(numbers) if numbers else None
        print(f"Maximum: {result}")
    elif operation == "min":
        result = min(numbers) if numbers else None
        print(f"Minimum: {result}")
    else:
        result = numbers
        print(f"Using original numbers: {result}")

    # Print to stderr (will be captured separately)
    import sys
    print(f"Debug: Processed {len(numbers)} items", file=sys.stderr)

    # Return structured result
    return {
        "status": "success",
        "operation": operation,
        "input_numbers": numbers,
        "result": result,
        "user": name,
        "timestamp": "2025-12-22T10:24:00Z"  # In real handler, use datetime.now()
    }